const http = require('http')
const BlaaizAPIClient = require('../src/client')
const BlaaizError = require('../src/error')

function startServer (handler) {
  return new Promise((resolve) => {
    const server = http.createServer(handler)
    server.listen(0, () => {
      resolve({ server, baseURL: `http://localhost:${server.address().port}` })
    })
  })
}

function readBody (req) {
  return new Promise((resolve) => {
    let data = ''
    req.on('data', (chunk) => { data += chunk })
    req.on('end', () => resolve(data))
  })
}

describe('OAuth client-credentials', () => {
  test('fetches a token and sends a Bearer header on API requests', async () => {
    let tokenRequest = null
    const { server, baseURL } = await startServer(async (req, res) => {
      if (req.url === '/oauth/token') {
        tokenRequest = {
          method: req.method,
          contentType: req.headers['content-type'],
          body: await readBody(req)
        }
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ access_token: 'tok-123', token_type: 'bearer', expires_in: 3600 }))
        return
      }
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ authorization: req.headers.authorization }))
    })

    const client = new BlaaizAPIClient({ client_id: 'id', client_secret: 'secret', baseURL })
    const result = await client.makeRequest('GET', '/test')

    expect(result.data.authorization).toBe('Bearer tok-123')
    expect(tokenRequest.method).toBe('POST')
    expect(tokenRequest.contentType).toBe('application/x-www-form-urlencoded')
    const params = new URLSearchParams(tokenRequest.body)
    expect(params.get('grant_type')).toBe('client_credentials')
    expect(params.get('client_id')).toBe('id')
    expect(params.get('client_secret')).toBe('secret')
    expect(params.get('scope')).toBe(BlaaizAPIClient.ALL_SCOPES.join(' '))
    server.close()
  })

  test('caches the token and reuses it across requests', async () => {
    let tokenHits = 0
    const { server, baseURL } = await startServer((req, res) => {
      if (req.url === '/oauth/token') {
        tokenHits += 1
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ access_token: `tok-${tokenHits}`, expires_in: 3600 }))
        return
      }
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ authorization: req.headers.authorization }))
    })

    const client = new BlaaizAPIClient({ client_id: 'id', client_secret: 'secret', baseURL })
    const first = await client.makeRequest('GET', '/test')
    const second = await client.makeRequest('GET', '/test')

    expect(tokenHits).toBe(1)
    expect(first.data.authorization).toBe('Bearer tok-1')
    expect(second.data.authorization).toBe('Bearer tok-1')
    server.close()
  })

  test('refetches the token after it expires', async () => {
    let tokenHits = 0
    const { server, baseURL } = await startServer((req, res) => {
      if (req.url === '/oauth/token') {
        tokenHits += 1
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ access_token: `tok-${tokenHits}`, expires_in: 0 }))
        return
      }
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ authorization: req.headers.authorization }))
    })

    const client = new BlaaizAPIClient({ client_id: 'id', client_secret: 'secret', baseURL })
    const first = await client.makeRequest('GET', '/test')
    const second = await client.makeRequest('GET', '/test')

    expect(tokenHits).toBe(2)
    expect(first.data.authorization).toBe('Bearer tok-1')
    expect(second.data.authorization).toBe('Bearer tok-2')
    server.close()
  })

  test('applies the 60s refresh buffer when computing expiry', async () => {
    const { server, baseURL } = await startServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ access_token: 'tok', expires_in: 3600 }))
    })

    const client = new BlaaizAPIClient({ client_id: 'id', client_secret: 'secret', baseURL })
    const before = Math.floor(Date.now() / 1000)
    await client.getOAuthToken()
    const after = Math.floor(Date.now() / 1000)

    expect(client.tokenExpiresAt).toBeGreaterThanOrEqual(before + 3600 - 60)
    expect(client.tokenExpiresAt).toBeLessThanOrEqual(after + 3600 - 60)
    server.close()
  })

  test('defaults expires_in to 900 when the response omits it', async () => {
    const { server, baseURL } = await startServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ access_token: 'tok' }))
    })

    const client = new BlaaizAPIClient({ client_id: 'id', client_secret: 'secret', baseURL })
    const before = Math.floor(Date.now() / 1000)
    await client.getOAuthToken()

    expect(client.tokenExpiresAt).toBeGreaterThanOrEqual(before + 900 - 60)
    server.close()
  })

  test('uses the api key when only an api key is provided', async () => {
    const { server, baseURL } = await startServer((req, res) => {
      if (req.url === '/oauth/token') {
        res.writeHead(500)
        res.end('token endpoint should not be called')
        return
      }
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({
        apiKey: req.headers['x-blaaiz-api-key'],
        authorization: req.headers.authorization || null
      }))
    })

    const client = new BlaaizAPIClient('my-key', { baseURL })
    expect(client.useOAuth).toBe(false)
    const result = await client.makeRequest('GET', '/test')
    expect(result.data.apiKey).toBe('my-key')
    expect(result.data.authorization).toBeNull()
    server.close()
  })

  test('prefers OAuth when both OAuth credentials and an api key are configured', async () => {
    const { server, baseURL } = await startServer((req, res) => {
      if (req.url === '/oauth/token') {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ access_token: 'oauth-tok', expires_in: 3600 }))
        return
      }
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({
        apiKey: req.headers['x-blaaiz-api-key'] || null,
        authorization: req.headers.authorization || null
      }))
    })

    const client = new BlaaizAPIClient({ api_key: 'my-key', client_id: 'id', client_secret: 'secret', baseURL })
    expect(client.useOAuth).toBe(true)
    const result = await client.makeRequest('GET', '/test')
    expect(result.data.authorization).toBe('Bearer oauth-tok')
    expect(result.data.apiKey).toBeNull()
    server.close()
  })

  test('throws when neither OAuth credentials nor an api key are provided', () => {
    expect(() => new BlaaizAPIClient({})).toThrow(BlaaizError)
    expect(() => new BlaaizAPIClient({})).toThrow(/Authentication required/)
    expect(() => new BlaaizAPIClient({ client_id: 'id' })).toThrow(/Authentication required/)
  })

  test('defaults the scope to the full scope list but keeps an explicit empty string', () => {
    const withDefault = new BlaaizAPIClient({ client_id: 'id', client_secret: 'secret' })
    expect(withDefault.oauthScope).toBe(BlaaizAPIClient.ALL_SCOPES.join(' '))

    const withEmpty = new BlaaizAPIClient({ client_id: 'id', client_secret: 'secret', oauth_scope: '' })
    expect(withEmpty.oauthScope).toBe('')

    const withCustom = new BlaaizAPIClient({ client_id: 'id', client_secret: 'secret', oauth_scope: 'wallet:read' })
    expect(withCustom.oauthScope).toBe('wallet:read')
  })

  test('exposes the 21 default scopes in order', () => {
    expect(BlaaizAPIClient.ALL_SCOPES).toHaveLength(21)
    expect(BlaaizAPIClient.ALL_SCOPES[0]).toBe('wallet:read')
    expect(BlaaizAPIClient.ALL_SCOPES[BlaaizAPIClient.ALL_SCOPES.length - 1]).toBe('rates:read')
  })

  test('throws OAUTH_PARSE_ERROR on a 2xx response without an access_token', async () => {
    const { server, baseURL } = await startServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ token_type: 'bearer' }))
    })

    const client = new BlaaizAPIClient({ client_id: 'id', client_secret: 'secret', baseURL })
    await expect(client.getOAuthToken()).rejects.toEqual(expect.objectContaining({
      message: 'Failed to parse OAuth token response',
      status: 200,
      code: 'OAUTH_PARSE_ERROR'
    }))
    server.close()
  })

  test('surfaces error_description and error from an HTTP error response', async () => {
    const { server, baseURL } = await startServer((req, res) => {
      res.writeHead(401, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'invalid_client', error_description: 'Client authentication failed' }))
    })

    const client = new BlaaizAPIClient({ client_id: 'id', client_secret: 'secret', baseURL })
    await expect(client.getOAuthToken()).rejects.toEqual(expect.objectContaining({
      message: 'Client authentication failed',
      status: 401,
      code: 'invalid_client'
    }))
    server.close()
  })

  test('throws OAUTH_ERROR on a transport failure', async () => {
    const client = new BlaaizAPIClient({ client_id: 'id', client_secret: 'secret', baseURL: 'http://localhost:65535', timeout: 100 })
    await expect(client.getOAuthToken()).rejects.toEqual(expect.objectContaining({
      code: 'OAUTH_ERROR'
    }))
  })
})

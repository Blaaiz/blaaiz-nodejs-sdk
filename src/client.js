const https = require('https')
const http = require('http')
const { URL } = require('url')
const BlaaizError = require('./error')

class BlaaizAPIClient {
  constructor (apiKey, options = {}) {
    if (!apiKey) {
      throw new Error('API key is required')
    }

    this.apiKey = apiKey
    this.baseURL = options.baseURL || 'https://api-dev.blaaiz.com'
    this.timeout = options.timeout || 30000
    this.defaultHeaders = {
      'x-blaaiz-api-key': this.apiKey,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'Blaaiz-NodeJS-SDK/1.0.0'
    }
  }

  async makeRequest (method, endpoint, data = null, headers = {}) {
    return new Promise((resolve, reject) => {
      const url = new URL(endpoint, this.baseURL)
      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + url.search,
        method: method.toUpperCase(),
        headers: { ...this.defaultHeaders, ...headers },
        timeout: this.timeout
      }

      const client = url.protocol === 'https:' ? https : http
      const req = client.request(options, (res) => {
        let responseData = ''

        res.on('data', (chunk) => {
          responseData += chunk
        })

        res.on('end', () => {
          try {
            const parsedData = JSON.parse(responseData)

            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve({
                data: parsedData,
                status: res.statusCode,
                headers: res.headers
              })
            } else {
              reject(new BlaaizError(
                parsedData.message || 'API request failed',
                res.statusCode,
                parsedData.code
              ))
            }
          } catch (error) {
            reject(new BlaaizError(
              'Failed to parse API response',
              res.statusCode,
              'PARSE_ERROR'
            ))
          }
        })
      })

      req.on('error', (error) => {
        reject(new BlaaizError(
          `Request failed: ${error.message}`,
          null,
          'REQUEST_ERROR'
        ))
      })

      req.on('timeout', () => {
        req.destroy()
        reject(new BlaaizError(
          'Request timeout',
          null,
          'TIMEOUT_ERROR'
        ))
      })

      if (data && method.toUpperCase() !== 'GET') {
        req.write(JSON.stringify(data))
      }

      req.end()
    })
  }
}

module.exports = BlaaizAPIClient

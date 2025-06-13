const http = require('http');
const BlaaizAPIClient = require('../src/client');
const BlaaizError = require('../src/error');

describe('BlaaizAPIClient.makeRequest', () => {
  test('resolves on successful request', async () => {
    const server = http.createServer((req, res) => {
      expect(req.headers['x-blaaiz-api-key']).toBe('key');
      res.writeHead(200, { 'Content-Type': 'application/json', custom: '1' });
      res.end(JSON.stringify({ ok: true }));
    });
    await new Promise(resolve => server.listen(0, resolve));
    const port = server.address().port;
    const client = new BlaaizAPIClient('key', { baseURL: `http://localhost:${port}` });
    const result = await client.makeRequest('GET', '/test');
    expect(result.data).toEqual({ ok: true });
    expect(result.status).toBe(200);
    expect(result.headers.custom).toBe('1');
    server.close();
  });

  test('rejects on non-2xx status', async () => {
    const server = http.createServer((req, res) => {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'bad', code: 'ERR' }));
    });
    await new Promise(resolve => server.listen(0, resolve));
    const port = server.address().port;
    const client = new BlaaizAPIClient('key', { baseURL: `http://localhost:${port}` });
    await expect(client.makeRequest('GET', '/bad')).rejects.toEqual(expect.objectContaining({ message: 'bad', status: 400, code: 'ERR' }));
    server.close();
  });

  test('rejects on invalid JSON', async () => {
    const server = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end('invalid');
    });
    await new Promise(resolve => server.listen(0, resolve));
    const port = server.address().port;
    const client = new BlaaizAPIClient('key', { baseURL: `http://localhost:${port}` });
    await expect(client.makeRequest('GET', '/bad')).rejects.toEqual(expect.objectContaining({ message: 'Failed to parse API response', code: 'PARSE_ERROR' }));
    server.close();
  });

  test('handles request errors', async () => {
    const client = new BlaaizAPIClient('key', { baseURL: 'http://localhost:65535', timeout: 100 });
    await expect(client.makeRequest('GET', '/')).rejects.toBeInstanceOf(BlaaizError);
  });

  test('handles timeout', async () => {
    const server = http.createServer((req, res) => {
      // do not respond immediately
    });
    await new Promise(resolve => server.listen(0, resolve));
    const port = server.address().port;
    const client = new BlaaizAPIClient('key', { baseURL: `http://localhost:${port}`, timeout: 100 });
    await expect(client.makeRequest('GET', '/timeout')).rejects.toEqual(expect.objectContaining({ message: 'Request timeout', code: 'TIMEOUT_ERROR' }));
    server.close();
  });
});

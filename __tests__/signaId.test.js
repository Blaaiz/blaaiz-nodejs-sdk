const SignaIdService = require('../src/services/SignaIdService')

describe('SignaIdService', () => {
  let client
  let service

  beforeEach(() => {
    client = { makeRequest: jest.fn().mockResolvedValue('ok') }
    service = new SignaIdService(client)
  })

  const releaseRequest = {
    idempotency_key: 'release-123',
    purpose: 'Open your trading account',
    scopes: ['identity', 'id_document', 'document_images'],
    origin: 'https://yourapp.com',
    reference: 'user_10482'
  }

  test('creates a release request', async () => {
    await service.createReleaseRequest(releaseRequest)

    expect(client.makeRequest).toHaveBeenCalledWith(
      'POST',
      '/api/external/signa-id/release-requests',
      releaseRequest
    )
  })

  test('exchanges a release code', async () => {
    await service.exchangeReleaseCode('a'.repeat(43))

    expect(client.makeRequest).toHaveBeenCalledWith(
      'POST',
      '/api/external/signa-id/releases/exchange',
      { code: 'a'.repeat(43) }
    )
  })

  test('gets a release and a release document, encoding both ids', async () => {
    await service.getRelease('release/1')
    await service.getReleaseDocument('release/1', 'doc/1')

    expect(client.makeRequest.mock.calls).toEqual([
      ['GET', '/api/external/signa-id/releases/release%2F1'],
      ['GET', '/api/external/signa-id/releases/release%2F1/documents/doc%2F1']
    ])
  })

  test('gets a wallet status with and without chain_id', async () => {
    await service.getWalletStatus('0xabc')
    await service.getWalletStatus('0xabc', { chain_id: 8453 })

    expect(client.makeRequest.mock.calls).toEqual([
      ['GET', '/api/v1/signa-id/public/wallets/0xabc/status'],
      ['GET', '/api/v1/signa-id/public/wallets/0xabc/status?chain_id=8453']
    ])
  })

  test('encodes the wallet address', async () => {
    await service.getWalletStatus('0xabc/def')

    expect(client.makeRequest).toHaveBeenCalledWith('GET', '/api/v1/signa-id/public/wallets/0xabc%2Fdef/status')
  })

  test('validates the release request shape and makes no HTTP call on failure', async () => {
    await expect(service.createReleaseRequest()).rejects.toThrow('Release request data is required')
    await expect(service.createReleaseRequest({ ...releaseRequest, origin: '' })).rejects.toThrow('origin is required')
    await expect(service.createReleaseRequest({ ...releaseRequest, scopes: [] })).rejects.toThrow('scopes must be a non-empty array')
    await expect(service.createReleaseRequest({ ...releaseRequest, scopes: ['selfie'] })).rejects.toThrow('scopes must contain only')

    expect(client.makeRequest).not.toHaveBeenCalled()
  })

  test('validates the ids, the code and the address and makes no HTTP call on failure', async () => {
    await expect(service.exchangeReleaseCode()).rejects.toThrow('Release code is required')
    await expect(service.getRelease()).rejects.toThrow('Release ID is required')
    await expect(service.getReleaseDocument()).rejects.toThrow('Release ID is required')
    await expect(service.getReleaseDocument('release-1')).rejects.toThrow('Document ID is required')
    await expect(service.getWalletStatus()).rejects.toThrow('Wallet address is required')

    expect(client.makeRequest).not.toHaveBeenCalled()
  })
})

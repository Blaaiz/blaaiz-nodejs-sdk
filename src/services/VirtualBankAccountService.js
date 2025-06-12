class VirtualBankAccountService {
  constructor (client) {
    this.client = client
  }

  async create (vbaData) {
    const requiredFields = ['wallet_id']
    for (const field of requiredFields) {
      if (!vbaData[field]) {
        throw new Error(`${field} is required`)
      }
    }

    return this.client.makeRequest('POST', '/api/external/virtual-bank-account', vbaData)
  }

  async list (walletId) {
    const params = walletId ? `?wallet_id=${walletId}` : ''
    return this.client.makeRequest('GET', `/api/external/virtual-bank-account${params}`)
  }

  async get (vbaId) {
    if (!vbaId) {
      throw new Error('Virtual bank account ID is required')
    }
    return this.client.makeRequest('GET', `/api/external/virtual-bank-account/${vbaId}`)
  }
}

module.exports = VirtualBankAccountService

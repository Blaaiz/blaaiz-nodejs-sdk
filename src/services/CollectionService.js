class CollectionService {
  constructor (client) {
    this.client = client
  }

  async initiate (collectionData) {
    const requiredFields = ['method', 'amount', 'wallet_id']
    for (const field of requiredFields) {
      if (!collectionData[field]) {
        throw new Error(`${field} is required`)
      }
    }

    return this.client.makeRequest('POST', '/api/external/collection', collectionData)
  }

  async initiateCrypto (cryptoData) {
    return this.client.makeRequest('POST', '/api/external/collection/crypto', cryptoData)
  }

  async attachCustomer (attachData) {
    const requiredFields = ['customer_id', 'transaction_id']
    for (const field of requiredFields) {
      if (!attachData[field]) {
        throw new Error(`${field} is required`)
      }
    }

    return this.client.makeRequest('POST', '/api/external/collection/attach-customer', attachData)
  }

  async getCryptoNetworks () {
    return this.client.makeRequest('GET', '/api/external/collection/crypto/networks')
  }
}

module.exports = CollectionService

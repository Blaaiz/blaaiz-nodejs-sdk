class BankService {
  constructor (client) {
    this.client = client
  }

  async list () {
    return this.client.makeRequest('GET', '/api/external/bank')
  }

  async lookupAccount (lookupData) {
    const requiredFields = ['account_number', 'bank_id']
    for (const field of requiredFields) {
      if (!lookupData[field]) {
        throw new Error(`${field} is required`)
      }
    }

    return this.client.makeRequest('POST', '/api/external/bank/account-lookup', lookupData)
  }
}

module.exports = BankService

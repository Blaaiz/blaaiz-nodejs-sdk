class FeesService {
  constructor (client) {
    this.client = client
  }

  async getBreakdown (feeData) {
    const requiredFields = ['from_currency_id', 'to_currency_id', 'from_amount']
    for (const field of requiredFields) {
      if (!feeData[field]) {
        throw new Error(`${field} is required`)
      }
    }

    return this.client.makeRequest('POST', '/api/external/fees/breakdown', feeData)
  }
}

module.exports = FeesService

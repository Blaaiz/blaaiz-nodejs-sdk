class PayoutService {
  constructor (client) {
    this.client = client
  }

  async initiate (payoutData) {
    const requiredFields = ['wallet_id', 'method', 'from_amount', 'from_currency_id', 'to_currency_id']
    for (const field of requiredFields) {
      if (!payoutData[field]) {
        throw new Error(`${field} is required`)
      }
    }

    if (payoutData.method === 'bank_transfer' && !payoutData.account_number) {
      throw new Error('account_number is required for bank_transfer method')
    }

    if (payoutData.method === 'interac') {
      const interacFields = ['email', 'interac_first_name', 'interac_last_name']
      for (const field of interacFields) {
        if (!payoutData[field]) {
          throw new Error(`${field} is required for interac method`)
        }
      }
    }

    return this.client.makeRequest('POST', '/api/external/payout', payoutData)
  }
}

module.exports = PayoutService

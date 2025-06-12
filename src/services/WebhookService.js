class WebhookService {
  constructor (client) {
    this.client = client
  }

  async register (webhookData) {
    const requiredFields = ['collection_url', 'payout_url']
    for (const field of requiredFields) {
      if (!webhookData[field]) {
        throw new Error(`${field} is required`)
      }
    }

    return this.client.makeRequest('POST', '/api/external/webhook', webhookData)
  }

  async get () {
    return this.client.makeRequest('GET', '/api/external/webhook')
  }

  async update (webhookData) {
    return this.client.makeRequest('PUT', '/api/external/webhook', webhookData)
  }

  async replay (replayData) {
    const requiredFields = ['transaction_id']
    for (const field of requiredFields) {
      if (!replayData[field]) {
        throw new Error(`${field} is required`)
      }
    }

    return this.client.makeRequest('POST', '/api/external/webhook/replay', replayData)
  }
}

module.exports = WebhookService

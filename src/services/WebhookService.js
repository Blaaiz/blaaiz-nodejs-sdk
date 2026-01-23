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

  async simulateInteracWebhook (simulateData) {
    return this.client.makeRequest('POST', '/api/external/mock/simulate-webhook/interac', simulateData)
  }

  verifySignature (payload, signature, timestamp, secret) {
    if (!payload) {
      throw new Error('Payload is required for signature verification')
    }

    if (!signature) {
      throw new Error('Signature is required for signature verification')
    }

    if (!timestamp) {
      throw new Error('Timestamp is required for signature verification')
    }

    if (!secret) {
      throw new Error('Webhook secret is required for signature verification')
    }

    const crypto = require('crypto')

    // Convert payload to string if it's an object
    const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload)

    // Create signed payload with timestamp
    const signedPayload = `${timestamp}.${payloadString}`

    // Create HMAC signature
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(signedPayload, 'utf8')
      .digest('hex')

    // Use timingSafeEqual to prevent timing attacks
    try {
      const signatureBuffer = Buffer.from(signature.toLowerCase(), 'hex')
      const expectedBuffer = Buffer.from(expectedSignature, 'hex')

      if (signatureBuffer.length !== expectedBuffer.length) {
        return false
      }

      return crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
    } catch (error) {
      return false
    }
  }

  constructEvent (payload, signature, timestamp, secret) {
    if (!this.verifySignature(payload, signature, timestamp, secret)) {
      throw new Error('Invalid webhook signature')
    }

    try {
      const event = typeof payload === 'string' ? JSON.parse(payload) : payload
      return {
        ...event,
        verified: true,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      throw new Error('Invalid webhook payload: unable to parse JSON')
    }
  }
}

module.exports = WebhookService

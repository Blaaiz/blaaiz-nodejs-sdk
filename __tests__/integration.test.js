const { Blaaiz } = require('../index');

describe('Integration Tests', () => {
  let blaaiz;

  beforeAll(() => {
    const apiKey = process.env.BLAAIZ_API_KEY;
    const baseURL = process.env.BLAAIZ_API_URL || 'https://api-dev.blaaiz.com';
    
    if (!apiKey) {
      console.warn('BLAAIZ_API_KEY not set, skipping integration tests');
      return;
    }

    blaaiz = new Blaaiz(apiKey, { baseURL });
  });

  describe('Connection Tests', () => {
    test('should connect to API successfully', async () => {
      if (!blaaiz) {
        console.warn('Skipping test: API key not configured');
        return;
      }

      const isConnected = await blaaiz.testConnection();
      expect(isConnected).toBe(true);
    }, 10000);
  });

  describe('Currency Service', () => {
    test('should list currencies', async () => {
      if (!blaaiz) {
        console.warn('Skipping test: API key not configured');
        return;
      }

      const response = await blaaiz.currencies.list();
      expect(response.data).toBeDefined();
      expect(Array.isArray(response.data)).toBe(true);
    }, 10000);
  });

  describe('Webhook Service', () => {
    test('should verify webhook signature', () => {
      if (!blaaiz) {
        console.warn('Skipping test: API key not configured');
        return;
      }

      const payload = '{"transaction_id":"test_123","status":"completed"}';
      const secret = 'test_secret';
      const crypto = require('crypto');
      const signature = crypto.createHmac('sha256', secret).update(payload, 'utf8').digest('hex');

      const isValid = blaaiz.webhooks.verifySignature(payload, signature, secret);
      expect(isValid).toBe(true);
    });

    test('should construct verified event', () => {
      if (!blaaiz) {
        console.warn('Skipping test: API key not configured');
        return;
      }

      const payload = '{"transaction_id":"test_123","status":"completed"}';
      const secret = 'test_secret';
      const crypto = require('crypto');
      const signature = crypto.createHmac('sha256', secret).update(payload, 'utf8').digest('hex');

      const event = blaaiz.webhooks.constructEvent(payload, signature, secret);
      expect(event.transaction_id).toBe('test_123');
      expect(event.status).toBe('completed');
      expect(event.verified).toBe(true);
      expect(event.timestamp).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid API key gracefully', async () => {
      const invalidBlaaiz = new Blaaiz('invalid-key');
      
      try {
        await invalidBlaaiz.currencies.list();
        fail('Expected error for invalid API key');
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    }, 10000);
  });
});
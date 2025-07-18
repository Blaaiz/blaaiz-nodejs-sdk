const CustomerService = require('../src/services/CustomerService');
const CollectionService = require('../src/services/CollectionService');
const PayoutService = require('../src/services/PayoutService');
const WalletService = require('../src/services/WalletService');
const VirtualBankAccountService = require('../src/services/VirtualBankAccountService');
const TransactionService = require('../src/services/TransactionService');
const BankService = require('../src/services/BankService');
const CurrencyService = require('../src/services/CurrencyService');
const FeesService = require('../src/services/FeesService');
const FileService = require('../src/services/FileService');
const WebhookService = require('../src/services/WebhookService');

describe('Service classes validate input and call makeRequest', () => {
  let client;
  beforeEach(() => {
    client = { makeRequest: jest.fn().mockResolvedValue('ok') };
  });

  describe('CustomerService', () => {
    test('create validates required fields', async () => {
      const service = new CustomerService(client);
      await expect(service.create({})).rejects.toThrow('first_name is required');
    });

    test('create calls makeRequest', async () => {
      const service = new CustomerService(client);
      const data = {
        first_name: 'a',
        last_name: 'b',
        type: 'individual',
        email: 'e@example.com',
        country: 'NG',
        id_type: 'passport',
        id_number: '1'
      };
      await service.create(data);
      expect(client.makeRequest).toHaveBeenCalledWith('POST', '/api/external/customer', data);
    });

    test('get throws without id', async () => {
      const service = new CustomerService(client);
      await expect(service.get()).rejects.toThrow('Customer ID is required');
    });

    test('uploadFileComplete validates required fields', async () => {
      const service = new CustomerService(client);
      await expect(service.uploadFileComplete()).rejects.toThrow('Customer ID is required');
      await expect(service.uploadFileComplete('cust-123')).rejects.toThrow('File options are required');
      await expect(service.uploadFileComplete('cust-123', {})).rejects.toThrow('File is required');
      await expect(service.uploadFileComplete('cust-123', { file: Buffer.from('test') })).rejects.toThrow('file_category is required');
      await expect(service.uploadFileComplete('cust-123', { file: Buffer.from('test'), file_category: 'invalid' })).rejects.toThrow('file_category must be one of: identity, proof_of_address, liveness_check');
    });

    test('uploadFileComplete handles S3 upload error', async () => {
      const service = new CustomerService(client);
      
      const mockPresignedResponse = {
        data: {
          data: {
            url: 'https://s3.amazonaws.com/bucket/file',
            file_id: 'file-123'
          }
        }
      };
      
      client.makeRequest.mockResolvedValueOnce(mockPresignedResponse);
      
      service._uploadToS3 = jest.fn().mockRejectedValue(new Error('S3 upload failed'));
      
      await expect(service.uploadFileComplete('cust-123', {
        file: Buffer.from('test'),
        file_category: 'identity'
      })).rejects.toThrow('File upload failed: S3 upload failed');
      
      expect(client.makeRequest).toHaveBeenCalledWith('POST', '/api/external/file/get-presigned-url', {
        customer_id: 'cust-123',
        file_category: 'identity'
      });
    });

    test('uploadFileComplete success flow', async () => {
      const service = new CustomerService(client);
      
      const mockPresignedResponse = {
        data: {
          data: {
            url: 'https://s3.amazonaws.com/bucket/file',
            file_id: 'file-123'
          }
        }
      };
      
      const mockFileAssociationResponse = {
        data: { success: true }
      };
      
      client.makeRequest
        .mockResolvedValueOnce(mockPresignedResponse)
        .mockResolvedValueOnce(mockFileAssociationResponse);
      
      service._uploadToS3 = jest.fn().mockResolvedValue({ status: 200 });
      
      const result = await service.uploadFileComplete('cust-123', {
        file: Buffer.from('test'),
        file_category: 'identity'
      });
      
      expect(service._uploadToS3).toHaveBeenCalledWith(
        'https://s3.amazonaws.com/bucket/file',
        Buffer.from('test'),
        undefined,
        undefined
      );
      
      expect(client.makeRequest).toHaveBeenCalledWith('PUT', '/api/external/customer/cust-123/files', {
        id_file: 'file-123'
      });
      
      expect(result).toEqual({
        data: { success: true },
        file_id: 'file-123',
        presigned_url: 'https://s3.amazonaws.com/bucket/file'
      });
    });

    test('uploadFileComplete handles base64 string', async () => {
      const service = new CustomerService(client);
      
      const mockPresignedResponse = {
        data: {
          data: {
            url: 'https://s3.amazonaws.com/bucket/file',
            file_id: 'file-123'
          }
        }
      };
      
      const mockFileAssociationResponse = {
        data: { success: true }
      };
      
      client.makeRequest
        .mockResolvedValueOnce(mockPresignedResponse)
        .mockResolvedValueOnce(mockFileAssociationResponse);
      
      service._uploadToS3 = jest.fn().mockResolvedValue({ status: 200 });
      
      const base64String = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      
      const result = await service.uploadFileComplete('cust-123', {
        file: base64String,
        file_category: 'identity'
      });
      
      expect(service._uploadToS3).toHaveBeenCalledWith(
        'https://s3.amazonaws.com/bucket/file',
        Buffer.from(base64String, 'base64'),
        undefined,
        undefined
      );
      
      expect(result).toEqual({
        data: { success: true },
        file_id: 'file-123',
        presigned_url: 'https://s3.amazonaws.com/bucket/file'
      });
    });

    test('uploadFileComplete handles data URL with content type extraction', async () => {
      const service = new CustomerService(client);
      
      const mockPresignedResponse = {
        data: {
          data: {
            url: 'https://s3.amazonaws.com/bucket/file',
            file_id: 'file-123'
          }
        }
      };
      
      const mockFileAssociationResponse = {
        data: { success: true }
      };
      
      client.makeRequest
        .mockResolvedValueOnce(mockPresignedResponse)
        .mockResolvedValueOnce(mockFileAssociationResponse);
      
      service._uploadToS3 = jest.fn().mockResolvedValue({ status: 200 });
      
      const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      
      await service.uploadFileComplete('cust-123', {
        file: dataUrl,
        file_category: 'identity'
      });
      
      expect(service._uploadToS3).toHaveBeenCalledWith(
        'https://s3.amazonaws.com/bucket/file',
        Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64'),
        'image/png',
        undefined
      );
    });

    test('uploadFileComplete handles URL download', async () => {
      const service = new CustomerService(client);
      
      const mockPresignedResponse = {
        data: {
          data: {
            url: 'https://s3.amazonaws.com/bucket/file',
            file_id: 'file-123'
          }
        }
      };
      
      const mockFileAssociationResponse = {
        data: { success: true }
      };
      
      client.makeRequest
        .mockResolvedValueOnce(mockPresignedResponse)
        .mockResolvedValueOnce(mockFileAssociationResponse);
      
      service._uploadToS3 = jest.fn().mockResolvedValue({ status: 200 });
      service._downloadFile = jest.fn().mockResolvedValue({
        buffer: Buffer.from('downloaded file content'),
        contentType: 'image/jpeg',
        filename: 'downloaded-image.jpg'
      });
      
      const result = await service.uploadFileComplete('cust-123', {
        file: 'https://example.com/image.jpg',
        file_category: 'identity'
      });
      
      expect(service._downloadFile).toHaveBeenCalledWith('https://example.com/image.jpg');
      expect(service._uploadToS3).toHaveBeenCalledWith(
        'https://s3.amazonaws.com/bucket/file',
        Buffer.from('downloaded file content'),
        'image/jpeg',
        'downloaded-image.jpg'
      );
      
      expect(result).toEqual({
        data: { success: true },
        file_id: 'file-123',
        presigned_url: 'https://s3.amazonaws.com/bucket/file'
      });
    });

    test('uploadFileComplete handles URL download error', async () => {
      const service = new CustomerService(client);
      
      const mockPresignedResponse = {
        data: {
          data: {
            url: 'https://s3.amazonaws.com/bucket/file',
            file_id: 'file-123'
          }
        }
      };
      
      client.makeRequest.mockResolvedValueOnce(mockPresignedResponse);
      service._downloadFile = jest.fn().mockRejectedValue(new Error('Download failed'));
      
      await expect(service.uploadFileComplete('cust-123', {
        file: 'https://example.com/image.jpg',
        file_category: 'identity'
      })).rejects.toThrow('File upload failed: Download failed');
    });
  });

  describe('CollectionService', () => {
    test('initiate validates required fields', async () => {
      const service = new CollectionService(client);
      await expect(service.initiate({})).rejects.toThrow('method is required');
    });

    test('attachCustomer validates required fields', async () => {
      const service = new CollectionService(client);
      await expect(service.attachCustomer({})).rejects.toThrow('customer_id is required');
    });
  });

  describe('PayoutService', () => {
    test('initiate validates required fields', async () => {
      const service = new PayoutService(client);
      await expect(service.initiate({})).rejects.toThrow('wallet_id is required');
    });

    test('bank_transfer requires account_number', async () => {
      const service = new PayoutService(client);
      const data = {
        wallet_id: 'w',
        method: 'bank_transfer',
        from_amount: 1,
        from_currency_id: 'USD',
        to_currency_id: 'NGN'
      };
      await expect(service.initiate(data)).rejects.toThrow('account_number is required for bank_transfer method');
    });

    test('interac requires extra fields', async () => {
      const service = new PayoutService(client);
      const data = {
        wallet_id: 'w',
        method: 'interac',
        from_amount: 1,
        from_currency_id: 'USD',
        to_currency_id: 'CAD'
      };
      await expect(service.initiate(data)).rejects.toThrow('email is required for interac method');
    });
  });

  describe('WalletService', () => {
    test('get validates id', async () => {
      const service = new WalletService(client);
      await expect(service.get()).rejects.toThrow('Wallet ID is required');
    });
  });

  describe('VirtualBankAccountService', () => {
    test('create validates wallet_id', async () => {
      const service = new VirtualBankAccountService(client);
      await expect(service.create({})).rejects.toThrow('wallet_id is required');
    });

    test('get validates id', async () => {
      const service = new VirtualBankAccountService(client);
      await expect(service.get()).rejects.toThrow('Virtual bank account ID is required');
    });
  });

  describe('TransactionService', () => {
    test('get validates id', async () => {
      const service = new TransactionService(client);
      await expect(service.get()).rejects.toThrow('Transaction ID is required');
    });
  });

  describe('BankService', () => {
    test('lookupAccount validates fields', async () => {
      const service = new BankService(client);
      await expect(service.lookupAccount({})).rejects.toThrow('account_number is required');
    });
  });

  describe('CurrencyService', () => {
    test('list calls makeRequest', async () => {
      const service = new CurrencyService(client);
      await service.list();
      expect(client.makeRequest).toHaveBeenCalledWith('GET', '/api/external/currency');
    });
  });

  describe('FeesService', () => {
    test('getBreakdown validates fields', async () => {
      const service = new FeesService(client);
      await expect(service.getBreakdown({})).rejects.toThrow('from_currency_id is required');
    });
  });

  describe('FileService', () => {
    test('getPresignedUrl validates fields', async () => {
      const service = new FileService(client);
      await expect(service.getPresignedUrl({})).rejects.toThrow('customer_id is required');
    });
  });

  describe('WebhookService', () => {
    test('register validates fields', async () => {
      const service = new WebhookService(client);
      await expect(service.register({})).rejects.toThrow('collection_url is required');
    });

    test('replay validates fields', async () => {
      const service = new WebhookService(client);
      await expect(service.replay({})).rejects.toThrow('transaction_id is required');
    });

    test('verifySignature validates required parameters', () => {
      const service = new WebhookService(client);
      
      expect(() => service.verifySignature('', 'sig', 'secret')).toThrow('Payload is required for signature verification');
      expect(() => service.verifySignature('payload', '', 'secret')).toThrow('Signature is required for signature verification');
      expect(() => service.verifySignature('payload', 'sig', '')).toThrow('Webhook secret is required for signature verification');
    });

    test('verifySignature returns true for valid signature', () => {
      const service = new WebhookService(client);
      const payload = '{"transaction_id":"txn_123","status":"completed"}';
      const secret = 'webhook_secret_key';
      
      const crypto = require('crypto');
      const validSignature = crypto.createHmac('sha256', secret).update(payload, 'utf8').digest('hex');
      
      expect(service.verifySignature(payload, validSignature, secret)).toBe(true);
      expect(service.verifySignature(payload, `sha256=${validSignature}`, secret)).toBe(true);
    });

    test('verifySignature returns false for invalid signature', () => {
      const service = new WebhookService(client);
      const payload = '{"transaction_id":"txn_123","status":"completed"}';
      const secret = 'webhook_secret_key';
      const invalidSignature = 'invalid_signature';
      
      expect(service.verifySignature(payload, invalidSignature, secret)).toBe(false);
    });

    test('verifySignature works with object payload', () => {
      const service = new WebhookService(client);
      const payload = { transaction_id: 'txn_123', status: 'completed' };
      const secret = 'webhook_secret_key';
      
      const crypto = require('crypto');
      const validSignature = crypto.createHmac('sha256', secret).update(JSON.stringify(payload), 'utf8').digest('hex');
      
      expect(service.verifySignature(payload, validSignature, secret)).toBe(true);
    });

    test('constructEvent validates signature and returns event', () => {
      const service = new WebhookService(client);
      const payload = '{"transaction_id":"txn_123","status":"completed"}';
      const secret = 'webhook_secret_key';
      
      const crypto = require('crypto');
      const validSignature = crypto.createHmac('sha256', secret).update(payload, 'utf8').digest('hex');
      
      const event = service.constructEvent(payload, validSignature, secret);
      
      expect(event.transaction_id).toBe('txn_123');
      expect(event.status).toBe('completed');
      expect(event.verified).toBe(true);
      expect(event.timestamp).toBeDefined();
    });

    test('constructEvent throws error for invalid signature', () => {
      const service = new WebhookService(client);
      const payload = '{"transaction_id":"txn_123","status":"completed"}';
      const secret = 'webhook_secret_key';
      const invalidSignature = 'invalid_signature';
      
      expect(() => service.constructEvent(payload, invalidSignature, secret)).toThrow('Invalid webhook signature');
    });

    test('constructEvent throws error for invalid JSON', () => {
      const service = new WebhookService(client);
      const payload = 'invalid json';
      const secret = 'webhook_secret_key';
      
      const crypto = require('crypto');
      const validSignature = crypto.createHmac('sha256', secret).update(payload, 'utf8').digest('hex');
      
      expect(() => service.constructEvent(payload, validSignature, secret)).toThrow('Invalid webhook payload: unable to parse JSON');
    });

    test('constructEvent works with object payload', () => {
      const service = new WebhookService(client);
      const payload = { transaction_id: 'txn_123', status: 'completed' };
      const secret = 'webhook_secret_key';
      
      const crypto = require('crypto');
      const validSignature = crypto.createHmac('sha256', secret).update(JSON.stringify(payload), 'utf8').digest('hex');
      
      const event = service.constructEvent(payload, validSignature, secret);
      
      expect(event.transaction_id).toBe('txn_123');
      expect(event.status).toBe('completed');
      expect(event.verified).toBe(true);
    });
  });
});

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
  });
});

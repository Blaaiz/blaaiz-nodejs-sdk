const https = require('https');
const http = require('http');
const { URL } = require('url');

/**
 * Blaaiz RaaS (Remittance as a Service) Node.js SDK
 * 
 * This SDK provides a comprehensive interface to the Blaaiz API for payment processing,
 * collections, payouts, customer management, and more.
 * 
 * @author Blaaiz SDK Team
 * @version 1.0.0
 */

class BlaaizError extends Error {
  constructor(message, status, code) {
    super(message);
    this.name = 'BlaaizError';
    this.status = status;
    this.code = code;
  }
}

class BlaaizAPIClient {
  constructor(apiKey, options = {}) {
    if (!apiKey) {
      throw new Error('API key is required');
    }

    this.apiKey = apiKey;
    this.baseURL = options.baseURL || 'https://api-dev.blaaiz.com';
    this.timeout = options.timeout || 30000;
    this.defaultHeaders = {
      'x-blaaiz-api-key': this.apiKey,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'Blaaiz-NodeJS-SDK/1.0.0'
    };
  }

  /**
   * Make HTTP request to Blaaiz API
   * @param {string} method - HTTP method
   * @param {string} endpoint - API endpoint
   * @param {object} data - Request body data
   * @param {object} headers - Additional headers
   * @returns {Promise<object>} API response
   */
  async makeRequest(method, endpoint, data = null, headers = {}) {
    return new Promise((resolve, reject) => {
      const url = new URL(endpoint, this.baseURL);
      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + url.search,
        method: method.toUpperCase(),
        headers: { ...this.defaultHeaders, ...headers },
        timeout: this.timeout
      };

      const client = url.protocol === 'https:' ? https : http;
      const req = client.request(options, (res) => {
        let responseData = '';

        res.on('data', (chunk) => {
          responseData += chunk;
        });

        res.on('end', () => {
          try {
            const parsedData = JSON.parse(responseData);
            
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve({
                data: parsedData,
                status: res.statusCode,
                headers: res.headers
              });
            } else {
              reject(new BlaaizError(
                parsedData.message || 'API request failed',
                res.statusCode,
                parsedData.code
              ));
            }
          } catch (error) {
            reject(new BlaaizError(
              'Failed to parse API response',
              res.statusCode,
              'PARSE_ERROR'
            ));
          }
        });
      });

      req.on('error', (error) => {
        reject(new BlaaizError(
          `Request failed: ${error.message}`,
          null,
          'REQUEST_ERROR'
        ));
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new BlaaizError(
          'Request timeout',
          null,
          'TIMEOUT_ERROR'
        ));
      });

      if (data && method.toUpperCase() !== 'GET') {
        req.write(JSON.stringify(data));
      }

      req.end();
    });
  }
}

/**
 * Customer Management
 */
class CustomerService {
  constructor(client) {
    this.client = client;
  }

  /**
   * Create a new customer
   * @param {object} customerData - Customer information
   * @returns {Promise<object>} Created customer data
   */
  async create(customerData) {
    const requiredFields = ['first_name', 'last_name', 'type', 'email', 'country', 'id_type', 'id_number'];
    for (const field of requiredFields) {
      if (!customerData[field]) {
        throw new Error(`${field} is required`);
      }
    }

    if (customerData.type === 'business' && !customerData.business_name) {
      throw new Error('business_name is required when type is business');
    }

    return this.client.makeRequest('POST', '/api/external/customer', customerData);
  }

  /**
   * Retrieve all customers
   * @returns {Promise<object>} List of customers
   */
  async list() {
    return this.client.makeRequest('GET', '/api/external/customer');
  }

  /**
   * Retrieve a single customer
   * @param {string} customerId - Customer ID
   * @returns {Promise<object>} Customer data
   */
  async get(customerId) {
    if (!customerId) {
      throw new Error('Customer ID is required');
    }
    return this.client.makeRequest('GET', `/api/external/customer/${customerId}`);
  }

  /**
   * Update a customer
   * @param {string} customerId - Customer ID
   * @param {object} updateData - Data to update
   * @returns {Promise<object>} Updated customer data
   */
  async update(customerId, updateData) {
    if (!customerId) {
      throw new Error('Customer ID is required');
    }
    return this.client.makeRequest('PUT', `/api/external/customer/${customerId}`, updateData);
  }

  /**
   * Add KYC details to a customer
   * @param {string} customerId - Customer ID
   * @param {object} kycData - KYC information
   * @returns {Promise<object>} Response data
   */
  async addKYC(customerId, kycData) {
    if (!customerId) {
      throw new Error('Customer ID is required');
    }
    return this.client.makeRequest('POST', `/api/external/customer/${customerId}/kyc-data`, kycData);
  }

  /**
   * Upload files for a customer
   * @param {string} customerId - Customer ID
   * @param {object} fileData - File information with file IDs
   * @returns {Promise<object>} Response data
   */
  async uploadFiles(customerId, fileData) {
    if (!customerId) {
      throw new Error('Customer ID is required');
    }
    return this.client.makeRequest('PUT', `/api/external/customer/${customerId}/files`, fileData);
  }
}

/**
 * Collection Management
 */
class CollectionService {
  constructor(client) {
    this.client = client;
  }

  /**
   * Initiate a collection
   * @param {object} collectionData - Collection information
   * @returns {Promise<object>} Collection response with transaction ID and URL (if applicable)
   */
  async initiate(collectionData) {
    const requiredFields = ['method', 'amount', 'wallet_id'];
    for (const field of requiredFields) {
      if (!collectionData[field]) {
        throw new Error(`${field} is required`);
      }
    }

    return this.client.makeRequest('POST', '/api/external/collection', collectionData);
  }

  /**
   * Initiate a crypto collection
   * @param {object} cryptoData - Crypto collection information
   * @returns {Promise<object>} Crypto collection response
   */
  async initiateCrypto(cryptoData) {
    return this.client.makeRequest('POST', '/api/external/collection/crypto', cryptoData);
  }

  /**
   * Attach customer to collection
   * @param {object} attachData - Customer and transaction information
   * @returns {Promise<object>} Response data
   */
  async attachCustomer(attachData) {
    const requiredFields = ['customer_id', 'transaction_id'];
    for (const field of requiredFields) {
      if (!attachData[field]) {
        throw new Error(`${field} is required`);
      }
    }

    return this.client.makeRequest('POST', '/api/external/collection/attach-customer', attachData);
  }

  /**
   * Get available crypto networks and tokens
   * @returns {Promise<object>} Available networks and tokens
   */
  async getCryptoNetworks() {
    return this.client.makeRequest('GET', '/api/external/collection/crypto/networks');
  }
}

/**
 * Payout Management
 */
class PayoutService {
  constructor(client) {
    this.client = client;
  }

  /**
   * Initiate a payout
   * @param {object} payoutData - Payout information
   * @returns {Promise<object>} Payout response
   */
  async initiate(payoutData) {
    const requiredFields = ['wallet_id', 'method', 'from_amount', 'from_currency_id', 'to_currency_id'];
    for (const field of requiredFields) {
      if (!payoutData[field]) {
        throw new Error(`${field} is required`);
      }
    }

    // Validate method-specific requirements
    if (payoutData.method === 'bank_transfer' && !payoutData.account_number) {
      throw new Error('account_number is required for bank_transfer method');
    }

    if (payoutData.method === 'interac') {
      const interacFields = ['email', 'interac_first_name', 'interac_last_name'];
      for (const field of interacFields) {
        if (!payoutData[field]) {
          throw new Error(`${field} is required for interac method`);
        }
      }
    }

    return this.client.makeRequest('POST', '/api/external/payout', payoutData);
  }
}

/**
 * Wallet Management
 */
class WalletService {
  constructor(client) {
    this.client = client;
  }

  /**
   * Retrieve all wallets
   * @returns {Promise<object>} List of wallets
   */
  async list() {
    return this.client.makeRequest('GET', '/api/external/wallet');
  }

  /**
   * Retrieve a single wallet
   * @param {string} walletId - Wallet ID
   * @returns {Promise<object>} Wallet data
   */
  async get(walletId) {
    if (!walletId) {
      throw new Error('Wallet ID is required');
    }
    return this.client.makeRequest('GET', `/api/external/wallet/${walletId}`);
  }
}

/**
 * Virtual Bank Account Management
 */
class VirtualBankAccountService {
  constructor(client) {
    this.client = client;
  }

  /**
   * Create a virtual bank account
   * @param {object} vbaData - Virtual bank account information
   * @returns {Promise<object>} Created VBA data
   */
  async create(vbaData) {
    const requiredFields = ['wallet_id'];
    for (const field of requiredFields) {
      if (!vbaData[field]) {
        throw new Error(`${field} is required`);
      }
    }

    return this.client.makeRequest('POST', '/api/external/virtual-bank-account', vbaData);
  }

  /**
   * Retrieve all virtual bank accounts
   * @param {string} walletId - Wallet ID to filter by
   * @returns {Promise<object>} List of virtual bank accounts
   */
  async list(walletId) {
    const params = walletId ? `?wallet_id=${walletId}` : '';
    return this.client.makeRequest('GET', `/api/external/virtual-bank-account${params}`);
  }

  /**
   * Retrieve a single virtual bank account
   * @param {string} vbaId - Virtual bank account ID
   * @returns {Promise<object>} VBA data
   */
  async get(vbaId) {
    if (!vbaId) {
      throw new Error('Virtual bank account ID is required');
    }
    return this.client.makeRequest('GET', `/api/external/virtual-bank-account/${vbaId}`);
  }
}

/**
 * Transaction Management
 */
class TransactionService {
  constructor(client) {
    this.client = client;
  }

  /**
   * List transactions with optional filtering
   * @param {object} filters - Transaction filters
   * @returns {Promise<object>} List of transactions
   */
  async list(filters = {}) {
    return this.client.makeRequest('POST', '/api/external/transaction', filters);
  }

  /**
   * Get a specific transaction
   * @param {string} transactionId - Transaction ID
   * @returns {Promise<object>} Transaction data
   */
  async get(transactionId) {
    if (!transactionId) {
      throw new Error('Transaction ID is required');
    }
    return this.client.makeRequest('GET', `/api/external/transaction/${transactionId}`);
  }
}

/**
 * Bank and Currency Services
 */
class BankService {
  constructor(client) {
    this.client = client;
  }

  /**
   * Retrieve all banks
   * @returns {Promise<object>} List of banks
   */
  async list() {
    return this.client.makeRequest('GET', '/api/external/bank');
  }

  /**
   * Bank account lookup
   * @param {object} lookupData - Account lookup information
   * @returns {Promise<object>} Account verification data
   */
  async lookupAccount(lookupData) {
    const requiredFields = ['account_number', 'bank_id'];
    for (const field of requiredFields) {
      if (!lookupData[field]) {
        throw new Error(`${field} is required`);
      }
    }

    return this.client.makeRequest('POST', '/api/external/bank/account-lookup', lookupData);
  }
}

class CurrencyService {
  constructor(client) {
    this.client = client;
  }

  /**
   * Retrieve all currencies
   * @returns {Promise<object>} List of currencies
   */
  async list() {
    return this.client.makeRequest('GET', '/api/external/currency');
  }
}

/**
 * Fees and Processing
 */
class FeesService {
  constructor(client) {
    this.client = client;
  }

  /**
   * Get fees breakdown
   * @param {object} feeData - Fee calculation data
   * @returns {Promise<object>} Fee breakdown
   */
  async getBreakdown(feeData) {
    const requiredFields = ['from_currency_id', 'to_currency_id', 'from_amount'];
    for (const field of requiredFields) {
      if (!feeData[field]) {
        throw new Error(`${field} is required`);
      }
    }

    return this.client.makeRequest('POST', '/api/external/fees/breakdown', feeData);
  }
}

/**
 * File Management
 */
class FileService {
  constructor(client) {
    this.client = client;
  }

  /**
   * Request pre-signed URL for file upload
   * @param {object} fileData - File information
   * @returns {Promise<object>} Pre-signed URL and file ID
   */
  async getPresignedUrl(fileData) {
    const requiredFields = ['customer_id', 'file_category'];
    for (const field of requiredFields) {
      if (!fileData[field]) {
        throw new Error(`${field} is required`);
      }
    }

    return this.client.makeRequest('POST', '/api/external/file/get-presigned-url', fileData);
  }
}

/**
 * Webhook Management
 */
class WebhookService {
  constructor(client) {
    this.client = client;
  }

  /**
   * Register webhook URLs
   * @param {object} webhookData - Webhook configuration
   * @returns {Promise<object>} Registration response
   */
  async register(webhookData) {
    const requiredFields = ['collection_url', 'payout_url'];
    for (const field of requiredFields) {
      if (!webhookData[field]) {
        throw new Error(`${field} is required`);
      }
    }

    return this.client.makeRequest('POST', '/api/external/webhook', webhookData);
  }

  /**
   * Retrieve webhook configuration
   * @returns {Promise<object>} Webhook configuration
   */
  async get() {
    return this.client.makeRequest('GET', '/api/external/webhook');
  }

  /**
   * Update webhook URLs
   * @param {object} webhookData - Updated webhook configuration
   * @returns {Promise<object>} Update response
   */
  async update(webhookData) {
    return this.client.makeRequest('PUT', '/api/external/webhook', webhookData);
  }

  /**
   * Replay webhook for a transaction
   * @param {object} replayData - Replay information
   * @returns {Promise<object>} Replay response
   */
  async replay(replayData) {
    const requiredFields = ['transaction_id'];
    for (const field of requiredFields) {
      if (!replayData[field]) {
        throw new Error(`${field} is required`);
      }
    }

    return this.client.makeRequest('POST', '/api/external/webhook/replay', replayData);
  }
}

/**
 * Main Blaaiz SDK Class
 */
class Blaaiz {
  constructor(apiKey, options = {}) {
    this.client = new BlaaizAPIClient(apiKey, options);
    
    // Initialize all services
    this.customers = new CustomerService(this.client);
    this.collections = new CollectionService(this.client);
    this.payouts = new PayoutService(this.client);
    this.wallets = new WalletService(this.client);
    this.virtualBankAccounts = new VirtualBankAccountService(this.client);
    this.transactions = new TransactionService(this.client);
    this.banks = new BankService(this.client);
    this.currencies = new CurrencyService(this.client);
    this.fees = new FeesService(this.client);
    this.files = new FileService(this.client);
    this.webhooks = new WebhookService(this.client);
  }

  /**
   * Test API connection
   * @returns {Promise<boolean>} Connection status
   */
  async testConnection() {
    try {
      await this.currencies.list();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Create a complete payout workflow
   * @param {object} payoutConfig - Complete payout configuration
   * @returns {Promise<object>} Payout result
   */
  async createCompleteePayout(payoutConfig) {
    const { customerData, payoutData } = payoutConfig;
    
    try {
      // Step 1: Create customer if not provided
      let customerId = payoutData.customer_id;
      if (!customerId && customerData) {
        const customerResult = await this.customers.create(customerData);
        customerId = customerResult.data.data.id;
      }

      // Step 2: Get fee breakdown
      const feeBreakdown = await this.fees.getBreakdown({
        from_currency_id: payoutData.from_currency_id,
        to_currency_id: payoutData.to_currency_id,
        from_amount: payoutData.from_amount
      });

      // Step 3: Initiate payout
      const payoutResult = await this.payouts.initiate({
        ...payoutData,
        customer_id: customerId
      });

      return {
        customer_id: customerId,
        payout: payoutResult.data,
        fees: feeBreakdown.data
      };
    } catch (error) {
      throw new BlaaizError(
        `Complete payout failed: ${error.message}`,
        error.status,
        error.code
      );
    }
  }

  /**
   * Create a complete collection workflow
   * @param {object} collectionConfig - Complete collection configuration
   * @returns {Promise<object>} Collection result
   */
  async createCompleteCollection(collectionConfig) {
    const { customerData, collectionData, createVBA = false } = collectionConfig;
    
    try {
      // Step 1: Create customer if not provided
      let customerId = collectionData.customer_id;
      if (!customerId && customerData) {
        const customerResult = await this.customers.create(customerData);
        customerId = customerResult.data.data.id;
      }

      // Step 2: Create virtual bank account if requested
      let vbaData = null;
      if (createVBA) {
        const vbaResult = await this.virtualBankAccounts.create({
          wallet_id: collectionData.wallet_id,
          account_name: customerData ? `${customerData.first_name} ${customerData.last_name}` : 'Customer Account'
        });
        vbaData = vbaResult.data;
      }

      // Step 3: Initiate collection
      const collectionResult = await this.collections.initiate({
        ...collectionData,
        customer_id: customerId
      });

      return {
        customer_id: customerId,
        collection: collectionResult.data,
        virtual_account: vbaData
      };
    } catch (error) {
      throw new BlaaizError(
        `Complete collection failed: ${error.message}`,
        error.status,
        error.code
      );
    }
  }
}

// Export the SDK
module.exports = {
  Blaaiz,
  BlaaizError,
  // Export individual services for advanced usage
  CustomerService,
  CollectionService,
  PayoutService,
  WalletService,
  VirtualBankAccountService,
  TransactionService,
  BankService,
  CurrencyService,
  FeesService,
  FileService,
  WebhookService
};

// Export as default for ES6 imports
module.exports.default = Blaaiz;

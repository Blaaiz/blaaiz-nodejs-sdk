# Blaaiz Node.js SDK

A comprehensive Node.js SDK for the Blaaiz RaaS (Remittance as a Service) API. This SDK provides easy-to-use methods for payment processing, collections, payouts, customer management, and more.

## Installation

```bash
npm install blaaiz-nodejs-sdk
```

## Quick Start

```javascript
const { Blaaiz } = require('blaaiz-nodejs-sdk');

// Initialize the SDK (defaults to development environment)
const blaaiz = new Blaaiz('your-api-key-here', {
  baseURL: 'https://api-dev.blaaiz.com', // Optional: defaults to dev environment
  timeout: 30000 // Optional: request timeout in milliseconds
});

// For production, change the baseURL:
// const blaaiz = new Blaaiz('your-prod-api-key', {
//   baseURL: 'https://api.blaaiz.com'
// });

// Test the connection
const isConnected = await blaaiz.testConnection();
console.log('API Connected:', isConnected);
```

## Features

- **Customer Management**: Create, update, and manage customers with KYC verification
- **Collections**: Support for multiple collection methods (Open Banking, Card, Crypto, Bank Transfer)
- **Payouts**: Bank transfers and Interac payouts across multiple currencies
- **Virtual Bank Accounts**: Create and manage virtual accounts for NGN collections
- **Wallets**: Multi-currency wallet management
- **Transactions**: Transaction history and status tracking
- **Webhooks**: Webhook configuration and management
- **Files**: Document upload with pre-signed URLs
- **Fees**: Real-time fee calculations and breakdowns
- **Banks & Currencies**: Access to supported banks and currencies

## Supported Currencies & Methods

### Collections
- **CAD**: Interac (push mechanism)
- **NGN**: Bank Transfer (VBA) and Card Payment
- **USD**: Card Payment
- **EUR/GBP**: Open Banking

### Payouts
- **Bank Transfer**: All supported currencies
- **Interac**: CAD transactions

## API Reference

### Customer Management

#### Create a Customer

```javascript
const customer = await blaaiz.customers.create({
  first_name: "John",
  last_name: "Doe",
  type: "individual", // or "business"
  email: "john.doe@example.com",
  country: "NG",
  id_type: "passport", // drivers_license, passport, id_card, resident_permit
  id_number: "A12345678",
  // business_name: "Company Name" // Required if type is "business"
});

console.log('Customer ID:', customer.data.data.id);
```

#### Get Customer

```javascript
const customer = await blaaiz.customers.get('customer-id');
console.log('Customer:', customer.data);
```

#### List All Customers

```javascript
const customers = await blaaiz.customers.list();
console.log('Customers:', customers.data);
```

#### Update Customer

```javascript
const updatedCustomer = await blaaiz.customers.update('customer-id', {
  first_name: "Jane",
  email: "jane.doe@example.com"
});
```

### File Management & KYC

#### Upload Customer Documents

**Method 1: Complete File Upload (Recommended)**
```javascript
// Option A: Upload from Buffer
const result = await blaaiz.customers.uploadFileComplete('customer-id', {
  file: fileBuffer, // Buffer or Uint8Array
  file_category: 'identity', // identity, proof_of_address, liveness_check
  filename: 'passport.jpg', // Optional
  contentType: 'image/jpeg' // Optional
});

// Option B: Upload from Base64 string
const result = await blaaiz.customers.uploadFileComplete('customer-id', {
  file: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  file_category: 'identity'
});

// Option C: Upload from Data URL (with automatic content type detection)
const result = await blaaiz.customers.uploadFileComplete('customer-id', {
  file: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  file_category: 'identity'
});

// Option D: Upload from Public URL (automatically downloads and uploads)
const result = await blaaiz.customers.uploadFileComplete('customer-id', {
  file: 'https://example.com/documents/passport.jpg',
  file_category: 'identity'
});

console.log('Upload complete:', result.data);
console.log('File ID:', result.file_id);
```

**Method 2: Manual 3-Step Process**
```javascript
// Step 1: Get pre-signed URL
const presignedUrl = await blaaiz.files.getPresignedUrl({
  customer_id: 'customer-id',
  file_category: 'identity' // identity, proof_of_address, liveness_check
});

// Step 2: Upload file to the pre-signed URL (implement your file upload logic)
// const uploadResponse = await uploadFileToUrl(presignedUrl.data.url, fileBuffer);

// Step 3: Associate file with customer
const fileAssociation = await blaaiz.customers.uploadFiles('customer-id', {
  id_file: presignedUrl.data.file_id // Use the file_id from step 1
});
```

> **Note**: The `uploadFileComplete` method is recommended as it handles all three steps automatically: getting the pre-signed URL, uploading the file to S3, and associating the file with the customer. It supports multiple file input formats:
> - **Buffer/Uint8Array**: Direct binary data
> - **Base64 string**: Plain base64 encoded data
> - **Data URL**: Complete data URL with mime type (e.g., `data:image/jpeg;base64,/9j/4AAQ...`)
> - **Public URL**: HTTP/HTTPS URL that will be downloaded automatically (supports redirects, content-type detection, and filename extraction)

### Collections

#### Initiate Open Banking Collection (EUR/GBP)

```javascript
const collection = await blaaiz.collections.initiate({
  method: "open_banking",
  amount: 100.00,
  customer_id: "customer-id",
  wallet_id: "wallet-id",
  phone: "+1234567890" // Optional
});

console.log('Payment URL:', collection.data.url);
console.log('Transaction ID:', collection.data.transaction_id);
```

#### Initiate Card Collection (NGN/USD)

```javascript
const collection = await blaaiz.collections.initiate({
  method: "card",
  amount: 5000,
  customer_id: "customer-id",
  wallet_id: "wallet-id"
});

console.log('Payment URL:', collection.data.url);
```

#### Crypto Collection

```javascript
// Get available networks
const networks = await blaaiz.collections.getCryptoNetworks();
console.log('Available networks:', networks.data);

// Initiate crypto collection
const cryptoCollection = await blaaiz.collections.initiateCrypto({
  amount: 100,
  network: "ethereum",
  token: "USDT",
  wallet_id: "wallet-id"
});
```

#### Attach Customer to Collection

```javascript
const attachment = await blaaiz.collections.attachCustomer({
  customer_id: "customer-id",
  transaction_id: "transaction-id"
});
```

### Payouts

#### Bank Transfer Payout

```javascript
const payout = await blaaiz.payouts.initiate({
  wallet_id: "wallet-id",
  customer_id: "customer-id",
  method: "bank_transfer",
  from_amount: 1000,
  from_currency_id: "1", // NGN
  to_currency_id: "1", // NGN
  account_number: "0123456789",
  bank_id: "1", // Required for NGN
  phone_number: "+2348012345678"
});

console.log('Payout Status:', payout.data.transaction.status);
```

#### Interac Payout (CAD)

```javascript
const interacPayout = await blaaiz.payouts.initiate({
  wallet_id: "wallet-id",
  customer_id: "customer-id",
  method: "interac",
  from_amount: 100,
  from_currency_id: "2", // CAD
  to_currency_id: "2", // CAD
  email: "recipient@example.com",
  interac_first_name: "John",
  interac_last_name: "Doe"
});
```

### Virtual Bank Accounts

#### Create Virtual Bank Account

```javascript
const vba = await blaaiz.virtualBankAccounts.create({
  wallet_id: "wallet-id",
  account_name: "John Doe"
});

console.log('Account Number:', vba.data.account_number);
console.log('Bank Name:', vba.data.bank_name);
```

#### List Virtual Bank Accounts

```javascript
const vbas = await blaaiz.virtualBankAccounts.list("wallet-id");
console.log('Virtual Accounts:', vbas.data);
```

### Wallets

#### List All Wallets

```javascript
const wallets = await blaaiz.wallets.list();
console.log('Wallets:', wallets.data);
```

#### Get Specific Wallet

```javascript
const wallet = await blaaiz.wallets.get("wallet-id");
console.log('Wallet Balance:', wallet.data.balance);
```

### Transactions

#### List Transactions

```javascript
const transactions = await blaaiz.transactions.list({
  page: 1,
  limit: 10,
  status: "SUCCESSFUL" // Optional filter
});

console.log('Transactions:', transactions.data);
```

#### Get Transaction Details

```javascript
const transaction = await blaaiz.transactions.get("transaction-id");
console.log('Transaction:', transaction.data);
```

### Banks & Currencies

#### List Banks

```javascript
const banks = await blaaiz.banks.list();
console.log('Available Banks:', banks.data);
```

#### Bank Account Lookup

```javascript
const accountInfo = await blaaiz.banks.lookupAccount({
  account_number: "0123456789",
  bank_id: "1"
});

console.log('Account Name:', accountInfo.data.account_name);
```

#### List Currencies

```javascript
const currencies = await blaaiz.currencies.list();
console.log('Supported Currencies:', currencies.data);
```

### Fees

#### Get Fee Breakdown

```javascript
const feeBreakdown = await blaaiz.fees.getBreakdown({
  from_currency_id: "1", // NGN
  to_currency_id: "2", // CAD
  from_amount: 100000
});

console.log('You send:', feeBreakdown.data.you_send);
console.log('Recipient gets:', feeBreakdown.data.recipient_gets);
console.log('Total fees:', feeBreakdown.data.total_fees);
```

### Webhooks

#### Register Webhooks

```javascript
const webhook = await blaaiz.webhooks.register({
  collection_url: "https://your-domain.com/webhooks/collection",
  payout_url: "https://your-domain.com/webhooks/payout"
});
```

#### Get Webhook Configuration

```javascript
const webhookConfig = await blaaiz.webhooks.get();
console.log('Webhook URLs:', webhookConfig.data);
```

#### Replay Webhook

```javascript
const replay = await blaaiz.webhooks.replay({
  transaction_id: "transaction-id"
});
```

## Advanced Usage

### Complete Payout Workflow

```javascript
const completePayoutResult = await blaaiz.createCompleteePayout({
  customerData: {
    first_name: "John",
    last_name: "Doe",
    type: "individual",
    email: "john@example.com",
    country: "NG",
    id_type: "passport",
    id_number: "A12345678"
  },
  payoutData: {
    wallet_id: "wallet-id",
    method: "bank_transfer",
    from_amount: 1000,
    from_currency_id: "1",
    to_currency_id: "1",
    account_number: "0123456789",
    bank_id: "1",
    phone_number: "+2348012345678"
  }
});

console.log('Customer ID:', completePayoutResult.customer_id);
console.log('Payout:', completePayoutResult.payout);
console.log('Fees:', completePayoutResult.fees);
```

### Complete Collection Workflow

```javascript
const completeCollectionResult = await blaaiz.createCompleteCollection({
  customerData: {
    first_name: "Jane",
    last_name: "Smith",
    type: "individual",
    email: "jane@example.com",
    country: "NG",
    id_type: "drivers_license",
    id_number: "ABC123456"
  },
  collectionData: {
    method: "card",
    amount: 5000,
    wallet_id: "wallet-id"
  },
  createVBA: true // Optionally create a virtual bank account
});

console.log('Customer ID:', completeCollectionResult.customer_id);
console.log('Collection:', completeCollectionResult.collection);
console.log('Virtual Account:', completeCollectionResult.virtual_account);
```

## Error Handling

The SDK uses a custom `BlaaizError` class that provides detailed error information:

```javascript
try {
  const customer = await blaaiz.customers.create(invalidData);
} catch (error) {
  if (error instanceof BlaaizError) {
    console.error('Blaaiz API Error:', error.message);
    console.error('Status Code:', error.status);
    console.error('Error Code:', error.code);
  } else {
    console.error('Unexpected Error:', error.message);
  }
}
```

## Rate Limiting

The Blaaiz API has a rate limit of 100 requests per minute. The SDK automatically includes rate limit headers in responses:

- `X-RateLimit-Limit`: Maximum requests per minute
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: When the rate limit resets

## Webhook Handling

### Webhook Signature Verification

The SDK provides built-in webhook signature verification to ensure webhook authenticity:

```javascript
const { Blaaiz } = require('blaaiz-nodejs-sdk');

const blaaiz = new Blaaiz('your-api-key');

// Method 1: Verify signature manually
const isValid = blaaiz.webhooks.verifySignature(
  payload,        // Raw webhook payload (string or object)
  signature,      // Signature from webhook headers
  webhookSecret   // Your webhook secret key
);

if (isValid) {
  console.log('Webhook signature is valid');
} else {
  console.log('Invalid webhook signature');
}

// Method 2: Construct verified event (recommended)
try {
  const event = blaaiz.webhooks.constructEvent(
    payload,        // Raw webhook payload
    signature,      // Signature from webhook headers  
    webhookSecret   // Your webhook secret key
  );
  
  console.log('Verified event:', event);
  // event.verified will be true
  // event.timestamp will contain verification timestamp
} catch (error) {
  console.error('Webhook verification failed:', error.message);
}
```

### Complete Express.js Webhook Handler

```javascript
const express = require('express');
const { Blaaiz } = require('blaaiz-nodejs-sdk');

const app = express();
const blaaiz = new Blaaiz('your-api-key');

// Webhook secret (get this from your Blaaiz dashboard)
const WEBHOOK_SECRET = process.env.BLAAIZ_WEBHOOK_SECRET;

// Middleware to capture raw body for signature verification
app.use('/webhooks', express.raw({ type: 'application/json' }));

// Collection webhook with signature verification
app.post('/webhooks/collection', (req, res) => {
  const signature = req.headers['x-blaaiz-signature'];
  const payload = req.body.toString();
  
  try {
    // Verify webhook signature and construct event
    const event = blaaiz.webhooks.constructEvent(payload, signature, WEBHOOK_SECRET);
    
    console.log('Verified collection event:', {
      transaction_id: event.transaction_id,
      status: event.status,
      amount: event.amount,
      currency: event.currency,
      verified: event.verified
    });
    
    // Process the collection
    // Update your database, send notifications, etc.
    
    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook verification failed:', error.message);
    res.status(400).json({ error: 'Invalid signature' });
  }
});

// Payout webhook with signature verification
app.post('/webhooks/payout', (req, res) => {
  const signature = req.headers['x-blaaiz-signature'];
  const payload = req.body.toString();
  
  try {
    // Verify webhook signature and construct event
    const event = blaaiz.webhooks.constructEvent(payload, signature, WEBHOOK_SECRET);
    
    console.log('Verified payout event:', {
      transaction_id: event.transaction_id,
      status: event.status,
      recipient: event.recipient,
      verified: event.verified
    });
    
    // Process the payout completion
    // Update your database, send notifications, etc.
    
    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook verification failed:', error.message);
    res.status(400).json({ error: 'Invalid signature' });
  }
});

app.listen(3000, () => {
  console.log('Webhook server running on port 3000');
});
```

### Manual Signature Verification (Alternative)

If you prefer manual verification:

```javascript
app.post('/webhooks/collection', (req, res) => {
  const signature = req.headers['x-blaaiz-signature'];
  const payload = req.body.toString();
  
  // Verify signature manually
  const isValid = blaaiz.webhooks.verifySignature(payload, signature, WEBHOOK_SECRET);
  
  if (!isValid) {
    console.error('Invalid webhook signature');
    return res.status(400).json({ error: 'Invalid signature' });
  }
  
  // Parse payload manually
  const event = JSON.parse(payload);
  console.log('Collection received:', event);
  
  res.status(200).json({ received: true });
});
```

## Environment Configuration

The SDK defaults to the development environment. To use different environments:

```javascript
// Development (default)
const blaaizDev = new Blaaiz('dev-api-key');
// OR explicitly specify dev URL
const blaaizDev = new Blaaiz('dev-api-key', {
  baseURL: 'https://api-dev.blaaiz.com'
});

// Production
const blaaizProd = new Blaaiz('prod-api-key', {
  baseURL: 'https://api.blaaiz.com'
});

// Staging (if available)
const blaaizStaging = new Blaaiz('staging-api-key', {
  baseURL: 'https://api-staging.blaaiz.com'
});
```

### Environment Variables Approach (Recommended)

```javascript
const { Blaaiz } = require('blaaiz-nodejs-sdk');

const blaaiz = new Blaaiz(process.env.BLAAIZ_API_KEY, {
  baseURL: process.env.BLAAIZ_API_URL || 'https://api-dev.blaaiz.com'
});
```

**Environment Variables:**
- `BLAAIZ_API_KEY` - Your API key
- `BLAAIZ_API_URL` - API base URL (optional, defaults to dev)
- `BLAAIZ_WEBHOOK_SECRET` - Webhook secret for signature verification
- `BLAAIZ_TEST_WALLET_ID` - Test wallet ID for integration tests (optional)

**.env file example:**
```bash
# Development
BLAAIZ_API_KEY=your-dev-api-key
BLAAIZ_API_URL=https://api-dev.blaaiz.com
BLAAIZ_WEBHOOK_SECRET=your-webhook-secret
BLAAIZ_TEST_WALLET_ID=your-test-wallet-id

# Production
# BLAAIZ_API_KEY=your-prod-api-key
# BLAAIZ_API_URL=https://api.blaaiz.com
# BLAAIZ_WEBHOOK_SECRET=your-prod-webhook-secret
```

## Best Practices

1. **Always validate customer data before creating customers**
2. **Use the fees API to calculate and display fees to users**
3. **Always verify webhook signatures using the SDK's built-in methods**
4. **Store customer IDs and transaction IDs for tracking**
5. **Handle rate limiting gracefully with exponential backoff**
6. **Use environment variables for API keys and webhook secrets**
7. **Implement proper error handling and logging**
8. **Test webhook endpoints thoroughly with signature verification**
9. **Use raw body parsing for webhook endpoints to preserve signature integrity**
10. **Return appropriate HTTP status codes from webhook handlers (200 for success, 400 for invalid signatures)**

## Support

For support and additional documentation:
- Email: onboarding@blaaiz.com
- Documentation: https://docs.business.blaaiz.com

## License

This SDK is provided under the MIT License

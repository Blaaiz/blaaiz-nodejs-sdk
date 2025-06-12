# Blaaiz Node.js SDK

A comprehensive Node.js SDK for the Blaaiz RaaS (Remittance as a Service) API. This SDK provides easy-to-use methods for payment processing, collections, payouts, customer management, and more.

## Installation

```bash
npm install blaaiz-nodejs-sdk
```

## Quick Start

```javascript
const { Blaaiz } = require('blaaiz-nodejs-sdk');

// Initialize the SDK
const blaaiz = new Blaaiz('your-api-key-here', {
  baseURL: 'https://api-dev.blaaiz.com', // Optional: defaults to dev environment
  timeout: 30000 // Optional: request timeout in milliseconds
});

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

Example webhook handler for Express.js:

```javascript
const express = require('express');
const app = express();

app.use(express.json());

// Collection webhook
app.post('/webhooks/collection', (req, res) => {
  const { transaction_id, status, amount, currency } = req.body;
  
  console.log('Collection received:', {
    transaction_id,
    status,
    amount,
    currency
  });
  
  // Process the collection
  // Update your database, send notifications, etc.
  
  res.status(200).json({ received: true });
});

// Payout webhook
app.post('/webhooks/payout', (req, res) => {
  const { transaction_id, status, recipient } = req.body;
  
  console.log('Payout completed:', {
    transaction_id,
    status,
    recipient
  });
  
  // Process the payout completion
  // Update your database, send notifications, etc.
  
  res.status(200).json({ received: true });
});

app.listen(3000, () => {
  console.log('Webhook server running on port 3000');
});
```

## Environment Configuration

```javascript
// Development
const blaaizDev = new Blaaiz('dev-api-key', {
  baseURL: 'https://api-dev.blaaiz.com'
});

// Production (when available)
const blaaizProd = new Blaaiz('prod-api-key', {
  baseURL: 'https://api.blaaiz.com'
});
```

## Best Practices

1. **Always validate customer data before creating customers**
2. **Use the fees API to calculate and display fees to users**
3. **Implement proper webhook signature verification** (when available)
4. **Store customer IDs and transaction IDs for tracking**
5. **Handle rate limiting gracefully with exponential backoff**
6. **Use environment variables for API keys**
7. **Implement proper error handling and logging**
8. **Test webhook endpoints thoroughly**

## Support

For support and additional documentation:
- Email: onboarding@blaaiz.com
- Documentation: https://docs.business.blaaiz.com

## License

This SDK is provided under the MIT License

// Type definitions for blaaiz-nodejs-sdk
// Project: https://github.com/blaaiz/nodejs-sdk
// Definitions by: Blaaiz Team

export interface BlaaizOptions {
  baseURL?: string;
  timeout?: number;
}

export interface BlaaizResponse<T = any> {
  data: T;
  status: number;
  headers: { [key: string]: string };
}

export class BlaaizError extends Error {
  public status: number | null;
  public code: string;
  
  constructor(message: string, status?: number | null, code?: string);
}

// Customer Types
export interface CustomerData {
  first_name: string;
  last_name: string;
  business_name?: string;
  type: 'individual' | 'business';
  email: string;
  country: string;
  id_type: 'drivers_license' | 'passport' | 'id_card' | 'resident_permit' | 'certificate_of_incorporation';
  id_number: string;
}

export interface Customer extends CustomerData {
  id: string;
  business_id: string;
  verification_status: 'PENDING' | 'VERIFIED' | 'REJECTED';
}

export interface CustomerKYCData {
  [key: string]: any;
}

export interface CustomerFileData {
  id_file?: string;
  proof_of_address_file?: string;
  liveness_check_file?: string;
}

// Collection Types
export interface CollectionData {
  method: 'open_banking' | 'card' | 'bank_transfer' | 'crypto';
  amount: number;
  customer_id?: string;
  wallet_id: string;
  phone?: string;
}

export interface CryptoCollectionData {
  amount: number;
  network: string;
  token: string;
  wallet_id: string;
  customer_id?: string;
}

export interface CollectionResponse {
  message: string;
  transaction_id: string;
  url?: string;
}

export interface AttachCustomerData {
  customer_id: string;
  transaction_id: string;
}

// Payout Types
export interface PayoutData {
  wallet_id: string;
  customer_id?: string;
  method: 'bank_transfer' | 'interac';
  from_amount: number;
  to_amount?: number;
  phone_number?: string;
  from_currency_id: string;
  to_currency_id: string;
  account_number?: string;
  bank_id?: string;
  email?: string;
  interac_first_name?: string;
  interac_last_name?: string;
  wallet_address?: string;
  wallet_network?: string;
  wallet_token?: string;
}

export interface PayoutResponse {
  message: string;
  transaction: Transaction;
}

// Transaction Types
export interface Transaction {
  id: string;
  business_id: string;
  business_customer_id: string;
  business_wallet_id: string;
  status: 'PENDING' | 'SUCCESSFUL' | 'FAILED' | 'CANCELLED';
  reference: string;
  currency: string;
  amount: number;
  amount_without_fee: number;
  fee: number;
  rate: number;
  date: string;
  recipient?: {
    id: string;
    account_number: string;
    account_name: string;
    amount: number;
    currency: string;
    bank_name: string;
    bank_code: string;
  };
}

export interface TransactionFilters {
  page?: number;
  limit?: number;
  status?: string;
  currency?: string;
  type?: 'COLLECTION' | 'PAYOUT';
}

// Wallet Types
export interface Wallet {
  id: string;
  currency: string;
  balance: number;
  status: string;
}

// Virtual Bank Account Types
export interface VirtualBankAccountData {
  wallet_id: string;
  account_name?: string;
}

export interface VirtualBankAccount {
  id: string;
  account_number: string;
  account_name: string;
  bank_name: string;
  bank_code: string;
  wallet_id: string;
}

// Bank Types
export interface Bank {
  id: string;
  name: string;
  code: string;
  country: string;
}

export interface BankAccountLookupData {
  account_number: string;
  bank_id: string;
}

export interface BankAccountInfo {
  account_name: string;
  account_number: string;
  bank_name: string;
}

// Currency Types
export interface Currency {
  id: string;
  name: string;
  code: string;
  status: string;
}

// Fees Types
export interface FeeBreakdownData {
  from_currency_id: string;
  to_currency_id: string;
  from_amount: number;
  to_amount?: number;
}

export interface FeeBreakdown {
  you_send: number;
  total_amount_to_send: number;
  recipient_gets: number;
  total_fees: number;
  exchange_rate?: number;
  collection_fees?: any[];
  payout_fees?: any[];
}

// File Types
export interface FileUploadData {
  customer_id: string;
  file_category: 'identity' | 'proof_of_address' | 'liveness_check';
}

export interface PreSignedUrlResponse {
  url: string;
  file_id: string;
  headers: { [key: string]: string };
}

// Webhook Types
export interface WebhookData {
  collection_url: string;
  payout_url: string;
}

export interface WebhookReplayData {
  transaction_id: string;
}

// Service Classes
export declare class CustomerService {
  constructor(client: any);
  create(customerData: CustomerData): Promise<BlaaizResponse<{ data: Customer }>>;
  list(): Promise<BlaaizResponse<Customer[]>>;
  get(customerId: string): Promise<BlaaizResponse<Customer>>;
  update(customerId: string, updateData: Partial<CustomerData>): Promise<BlaaizResponse<Customer>>;
  addKYC(customerId: string, kycData: CustomerKYCData): Promise<BlaaizResponse<any>>;
  uploadFiles(customerId: string, fileData: CustomerFileData): Promise<BlaaizResponse<any>>;
}

export declare class CollectionService {
  constructor(client: any);
  initiate(collectionData: CollectionData): Promise<BlaaizResponse<CollectionResponse>>;
  initiateCrypto(cryptoData: CryptoCollectionData): Promise<BlaaizResponse<CollectionResponse>>;
  attachCustomer(attachData: AttachCustomerData): Promise<BlaaizResponse<any>>;
  getCryptoNetworks(): Promise<BlaaizResponse<any>>;
}

export declare class PayoutService {
  constructor(client: any);
  initiate(payoutData: PayoutData): Promise<BlaaizResponse<PayoutResponse>>;
}

export declare class WalletService {
  constructor(client: any);
  list(): Promise<BlaaizResponse<Wallet[]>>;
  get(walletId: string): Promise<BlaaizResponse<Wallet>>;
}

export declare class VirtualBankAccountService {
  constructor(client: any);
  create(vbaData: VirtualBankAccountData): Promise<BlaaizResponse<VirtualBankAccount>>;
  list(walletId?: string): Promise<BlaaizResponse<VirtualBankAccount[]>>;
  get(vbaId: string): Promise<BlaaizResponse<VirtualBankAccount>>;
}

export declare class TransactionService {
  constructor(client: any);
  list(filters?: TransactionFilters): Promise<BlaaizResponse<Transaction[]>>;
  get(transactionId: string): Promise<BlaaizResponse<Transaction>>;
}

export declare class BankService {
  constructor(client: any);
  list(): Promise<BlaaizResponse<Bank[]>>;
  lookupAccount(lookupData: BankAccountLookupData): Promise<BlaaizResponse<BankAccountInfo>>;
}

export declare class CurrencyService {
  constructor(client: any);
  list(): Promise<BlaaizResponse<Currency[]>>;
}

export declare class FeesService {
  constructor(client: any);
  getBreakdown(feeData: FeeBreakdownData): Promise<BlaaizResponse<FeeBreakdown>>;
}

export declare class FileService {
  constructor(client: any);
  getPresignedUrl(fileData: FileUploadData): Promise<BlaaizResponse<PreSignedUrlResponse>>;
}

export declare class WebhookService {
  constructor(client: any);
  register(webhookData: WebhookData): Promise<BlaaizResponse<any>>;
  get(): Promise<BlaaizResponse<WebhookData>>;
  update(webhookData: Partial<WebhookData>): Promise<BlaaizResponse<any>>;
  replay(replayData: WebhookReplayData): Promise<BlaaizResponse<any>>;
}

// Main SDK Class
export declare class Blaaiz {
  public customers: CustomerService;
  public collections: CollectionService;
  public payouts: PayoutService;
  public wallets: WalletService;
  public virtualBankAccounts: VirtualBankAccountService;
  public transactions: TransactionService;
  public banks: BankService;
  public currencies: CurrencyService;
  public fees: FeesService;
  public files: FileService;
  public webhooks: WebhookService;

  constructor(apiKey: string, options?: BlaaizOptions);
  
  testConnection(): Promise<boolean>;
  
  createCompleteePayout(payoutConfig: {
    customerData?: CustomerData;
    payoutData: PayoutData;
  }): Promise<{
    customer_id: string;
    payout: PayoutResponse;
    fees: FeeBreakdown;
  }>;
  
  createCompleteCollection(collectionConfig: {
    customerData?: CustomerData;
    collectionData: CollectionData;
    createVBA?: boolean;
  }): Promise<{
    customer_id: string;
    collection: CollectionResponse;
    virtual_account?: VirtualBankAccount;
  }>;
}

// Default export
export default Blaaiz;

// Type definitions for blaaiz-nodejs-sdk
// Project: https://github.com/blaaiz/nodejs-sdk
// Definitions by: Blaaiz Team

export interface BlaaizOptions {
  baseURL?: string;
  base_url?: string;
  timeout?: number;
  api_key?: string;
  client_id?: string;
  client_secret?: string;
  oauth_scope?: string;
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
  verification_status: 'PENDING' | 'PROCESSING' | 'VERIFIED' | 'REJECTED';
}

export interface CustomerListFilters {
  email?: string;
  id_number?: string;
  registration_number?: string;
  verification_status?: 'PENDING' | 'PROCESSING' | 'VERIFIED' | 'REJECTED';
  type?: 'individual' | 'business';
  paginate?: boolean;
  page?: number;
  per_page?: number;
  [key: string]: string | number | boolean | undefined;
}

export interface PaginationLinks {
  first?: string | null;
  last?: string | null;
  prev?: string | null;
  next?: string | null;
}

export interface PaginationMeta {
  current_page: number;
  from?: number | null;
  last_page?: number;
  path?: string;
  per_page?: number;
  to?: number | null;
  total: number;
}

export interface PaginatedCustomers {
  data: Customer[];
  links: PaginationLinks;
  meta: PaginationMeta;
  message?: string;
}

export interface CustomerKYCData {
  [key: string]: any;
}

export interface CustomerFileData {
  id_file?: string;
  proof_of_address_file?: string;
  liveness_check_file?: string;
}

export interface FileUploadOptions {
  file: Buffer | Uint8Array | string;
  file_category: 'identity' | 'proof_of_address' | 'liveness_check';
  filename?: string;
  content_type?: string;
  /** @deprecated Use content_type instead */
  contentType?: string;
}

// Collection Types
export type CustomerDocumentType =
  | 'CERTIFICATE_OF_INCORPORATION'
  | 'ARTICLES_OF_INCORPORATION'
  | 'BENEFICIAL_OWNERSHIP_CERTIFICATE'
  | 'INCORPORATION_DOCUMENTS'
  | 'CAC_STATUS_REPORT'
  | 'ACCOUNT_AGREEMENT'
  | 'PROOF_OF_ADDRESS'
  | 'BANK_STATEMENT'
  | 'LICENSE'
  | 'SHARE_REGISTRATION'
  | 'COMPANY_OWNERSHIP_STRUCTURE'
  | 'DIRECTORS_REGISTER'
  | 'OTHER';

export interface CustomerDocumentData {
  type: CustomerDocumentType;
  name: string;
  file_id: string;
  description?: string;
}

export interface CustomerDocument {
  id: string;
  business_customer_id: string;
  type: CustomerDocumentType | null;
  name: string;
  extension: string | null;
  description: string | null;
  status: 'PENDING' | 'PROCESSING' | 'APPROVED' | 'REJECTED';
  admin_comments: string[] | null;
  url: string | null;
  created_at: string;
  updated_at: string;
}

export interface CollectionData {
  method: 'open_banking' | 'card';
  amount: number;
  wallet_id: string;
  customer_id?: string;
  phone?: string;
  card_holder_name?: string;
  card_number?: string;
  expiry?: string;
  cvc?: string;
  redirect_url?: string;
  merchant_reference?: string;
}

export interface InteracMoneyRequestData {
  amount: number;
  email: string;
  customer_name?: string;
  customer_id?: string;
  expiry_hours?: number;
  note?: string;
}

export interface AcceptInteracMoneyRequestData {
  reference_number: string;
  security_answer?: string;
  email?: string;
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
  customer_id: string;
  method: 'bank_transfer' | 'interac' | 'ach' | 'wire' | 'crypto';
  from_currency_id: string;
  to_currency_id: string;
  from_amount?: number;
  to_amount?: number;
  amount?: number;
  country_id?: string;
  type?: 'business' | 'individual';
  phone_number?: string;
  email?: string;
  interac_first_name?: string;
  interac_last_name?: string;
  bank_id?: string;
  account_number?: string;
  account_name?: string;
  account_type?: 'savings' | 'checking';
  bank_name?: string;
  routing_number?: string;
  swift_code?: string;
  sort_code?: string;
  iban?: string;
  bic_code?: string;
  wallet_address?: string;
  wallet_network?: string;
  wallet_token?: string;
  street?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  note?: string;
  merchant_reference?: string;
}

export interface PayoutResponse {
  message: string;
  transaction: Transaction;
}

// Transaction Types
export interface Transaction {
  id: string;
  business_id: string;
  business_customer_id: string | null;
  business_wallet_id: string | null;
  status: 'PENDING' | 'PROCESSING' | 'SUCCESSFUL' | 'FAILED' | 'EXPIRED' | 'REVERSED' | 'CANCELLED' | 'AWAITING_APPROVAL';
  refund_status?: string | null;
  type: string;
  reference: string | null;
  merchant_reference: string | null;
  currency: string;
  amount: number;
  amount_without_fee: number;
  fee: number;
  rate: number;
  date: string;
  payee_collection_email?: string | null;
  source_information?: {
    collection_email: string | null;
    collection_name: string | null;
  };
  recipient?: {
    id: string;
    account_number: string;
    account_name: string;
    amount: number;
    currency: string;
    bank_name: string;
    bank_code: string;
    status?: string;
    routing_number?: string;
    email?: string;
  };
}

export interface TransactionFilters {
  start_date?: string;
  end_date?: string;
  wallet_id?: string;
  customer_id?: string;
  type?: 'SEND_MONEY' | 'FUND_WALLET' | 'SWAP';
  status?: 'FAILED' | 'SUCCESSFUL' | 'EXPIRED';
  merchant_reference?: string;
  page?: number;
}

export interface SwapData {
  from_business_wallet_id: string;
  to_business_wallet_id: string;
  amount: number;
  amount_type?: 'from' | 'to';
}

export interface RefundData {
  transaction_id: string;
  reason?: string;
  reference?: string;
}

export interface RateListFilters {
  search_term?: string;
}

export interface BankListFilters {
  currency?: string;
  country?: string;
  country_id?: number;
}

export interface PayeeVerificationData {
  sort_code: string;
  account_number: string;
  account_name: string;
}

export interface IbanVerificationData {
  iban: string;
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
  message: string;
  file_id: string;
  url: string;
  headers: any[];
}

// Webhook Types
export interface WebhookData {
  collection_url: string;
  payout_url: string;
}

export interface WebhookReplayData {
  transaction_id: string;
}

export interface WebhookEvent {
  [key: string]: any;
  verified: boolean;
  timestamp: string;
}

// Service Classes
export declare class CustomerService {
  constructor(client: any);
  create(customerData: CustomerData): Promise<BlaaizResponse<{ data: Customer }>>;
  list(filters?: CustomerListFilters): Promise<BlaaizResponse<Customer[] | PaginatedCustomers>>;
  get(customerId: string): Promise<BlaaizResponse<Customer>>;
  update(customerId: string, updateData: Partial<CustomerData>): Promise<BlaaizResponse<Customer>>;
  addKYC(customerId: string, kycData: CustomerKYCData): Promise<BlaaizResponse<any>>;
  uploadFiles(customerId: string, fileData: CustomerFileData): Promise<BlaaizResponse<any>>;
  uploadFileComplete(customerId: string, fileOptions: FileUploadOptions): Promise<BlaaizResponse<any>>;
  listBeneficiaries(customerId: string): Promise<BlaaizResponse<any>>;
  getBeneficiary(customerId: string, beneficiaryId: string): Promise<BlaaizResponse<any>>;
  submit(customerId: string): Promise<BlaaizResponse<{ data: Customer }>>;
  upgradeKybScope(customerId: string, upgradeData: { owners: Array<Record<string, any>>; [key: string]: any }): Promise<BlaaizResponse<{ data: Customer }>>;
  deleteOwner(customerId: string, ownerId: string): Promise<BlaaizResponse<any>>;
  getOwnerFilePresignedUrl(customerId: string, ownerId: string, presignedData: { file_category: 'id_document_front' | 'id_document_back' }): Promise<BlaaizResponse<PreSignedUrlResponse>>;
  uploadOwnerFiles(customerId: string, ownerId: string, fileData: { id_document_front: string; id_document_back?: string }): Promise<BlaaizResponse<any>>;
  listDocuments(customerId: string): Promise<BlaaizResponse<{ data: CustomerDocument[] }>>;
  getDocument(customerId: string, documentId: string): Promise<BlaaizResponse<{ data: CustomerDocument }>>;
  getDocumentPresignedUrl(customerId: string): Promise<BlaaizResponse<PreSignedUrlResponse>>;
  createDocument(customerId: string, documentData: CustomerDocumentData): Promise<BlaaizResponse<{ data: CustomerDocument }>>;
  updateDocument(customerId: string, documentId: string, documentData: Partial<CustomerDocumentData>): Promise<BlaaizResponse<{ data: CustomerDocument }>>;
  deleteDocument(customerId: string, documentId: string): Promise<BlaaizResponse<any>>;
}

export declare class CollectionService {
  constructor(client: any);
  initiate(collectionData: CollectionData): Promise<BlaaizResponse<CollectionResponse>>;
  initiateCrypto(cryptoData: CryptoCollectionData): Promise<BlaaizResponse<any>>;
  getCryptoNetworks(filters?: { transaction_type?: 'collection' | 'payout' }): Promise<BlaaizResponse<any>>;
  attachCustomer(attachData: AttachCustomerData): Promise<BlaaizResponse<any>>;
  initiateInteracMoneyRequest(interacData: InteracMoneyRequestData): Promise<BlaaizResponse<any>>;
  acceptInteracMoneyRequest(interacData: AcceptInteracMoneyRequestData): Promise<BlaaizResponse<any>>;
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
  list(filters?: BankListFilters): Promise<BlaaizResponse<Bank[]>>;
  lookupAccount(lookupData: BankAccountLookupData): Promise<BlaaizResponse<BankAccountInfo>>;
  verifyPayee(payeeData: PayeeVerificationData): Promise<BlaaizResponse<any>>;
  verifyIban(ibanData: IbanVerificationData): Promise<BlaaizResponse<any>>;
}

export declare class RateService {
  constructor(client: any);
  list(filters?: RateListFilters): Promise<BlaaizResponse<any>>;
}

export declare class SwapService {
  constructor(client: any);
  initiate(swapData: SwapData): Promise<BlaaizResponse<any>>;
}

export declare class RefundService {
  constructor(client: any);
  initiate(refundData: RefundData): Promise<BlaaizResponse<any>>;
  get(refundId: string): Promise<BlaaizResponse<any>>;
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
  update(webhookId: string, webhookData: Partial<WebhookData>): Promise<BlaaizResponse<any>>;
  replay(replayData: WebhookReplayData): Promise<BlaaizResponse<any>>;
  verifySignature(payload: string, signature: string, timestamp: string, secret: string): boolean;
  constructEvent(payload: string, signature: string, timestamp: string, secret: string): WebhookEvent;
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
  public rates: RateService;
  public swaps: SwapService;
  public refunds: RefundService;

  constructor(apiKey: string, options?: BlaaizOptions);
  constructor(options: BlaaizOptions);

  testConnection(): Promise<boolean>;
  
  createCompletePayout(payoutConfig: {
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

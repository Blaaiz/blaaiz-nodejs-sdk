const CustomerService = require('../src/services/CustomerService')
const CollectionService = require('../src/services/CollectionService')
const PayoutService = require('../src/services/PayoutService')
const WalletService = require('../src/services/WalletService')
const VirtualBankAccountService = require('../src/services/VirtualBankAccountService')
const TransactionService = require('../src/services/TransactionService')
const BankService = require('../src/services/BankService')
const CurrencyService = require('../src/services/CurrencyService')
const FeesService = require('../src/services/FeesService')
const FileService = require('../src/services/FileService')
const WebhookService = require('../src/services/WebhookService')

describe('Service classes validate input and call makeRequest', () => {
  let client
  beforeEach(() => {
    client = { makeRequest: jest.fn().mockResolvedValue('ok') }
  })

  describe('CustomerService', () => {
    test('create validates required fields', async () => {
      const service = new CustomerService(client)
      await expect(service.create({})).rejects.toThrow('type is required')
    })

    test('create validates first_name for individual type', async () => {
      const service = new CustomerService(client)
      await expect(service.create({
        type: 'individual',
        email: 'e@example.com',
        country: 'NG',
        id_type: 'passport',
        id_number: '1'
      })).rejects.toThrow('first_name is required when type is individual')
    })

    test('create validates last_name for individual type', async () => {
      const service = new CustomerService(client)
      await expect(service.create({
        type: 'individual',
        first_name: 'John',
        email: 'e@example.com',
        country: 'NG',
        id_type: 'passport',
        id_number: '1'
      })).rejects.toThrow('last_name is required when type is individual')
    })

    test('create validates business_name for business type', async () => {
      const service = new CustomerService(client)
      await expect(service.create({
        type: 'business',
        email: 'e@example.com',
        country: 'NG',
        id_type: 'passport',
        id_number: '1'
      })).rejects.toThrow('business_name is required when type is business')
    })

    test('create calls makeRequest for individual', async () => {
      const service = new CustomerService(client)
      const data = {
        first_name: 'a',
        last_name: 'b',
        type: 'individual',
        email: 'e@example.com',
        country: 'NG',
        id_type: 'passport',
        id_number: '1'
      }
      await service.create(data)
      expect(client.makeRequest).toHaveBeenCalledWith('POST', '/api/external/customer', data)
    })

    test('create calls makeRequest for business', async () => {
      const service = new CustomerService(client)
      const data = {
        business_name: 'Test Company',
        type: 'business',
        email: 'e@example.com',
        country: 'NG',
        id_type: 'passport',
        id_number: '1'
      }
      await service.create(data)
      expect(client.makeRequest).toHaveBeenCalledWith('POST', '/api/external/customer', data)
    })

    test('get throws without id', async () => {
      const service = new CustomerService(client)
      await expect(service.get()).rejects.toThrow('Customer ID is required')
    })

    test('listBeneficiaries validates customer id', async () => {
      const service = new CustomerService(client)
      await expect(service.listBeneficiaries()).rejects.toThrow('Customer ID is required')
    })

    test('listBeneficiaries calls makeRequest', async () => {
      const service = new CustomerService(client)
      await service.listBeneficiaries('cust-123')
      expect(client.makeRequest).toHaveBeenCalledWith('GET', '/api/external/customer/cust-123/beneficiary')
    })

    test('getBeneficiary validates customer id', async () => {
      const service = new CustomerService(client)
      await expect(service.getBeneficiary()).rejects.toThrow('Customer ID is required')
    })

    test('getBeneficiary validates beneficiary id', async () => {
      const service = new CustomerService(client)
      await expect(service.getBeneficiary('cust-123')).rejects.toThrow('Beneficiary ID is required')
    })

    test('getBeneficiary calls makeRequest', async () => {
      const service = new CustomerService(client)
      await service.getBeneficiary('cust-123', 'ben-456')
      expect(client.makeRequest).toHaveBeenCalledWith('GET', '/api/external/customer/cust-123/beneficiary/ben-456')
    })

    test('uploadFileComplete validates required fields', async () => {
      const service = new CustomerService(client)
      await expect(service.uploadFileComplete()).rejects.toThrow('Customer ID is required')
      await expect(service.uploadFileComplete('cust-123')).rejects.toThrow('File options are required')
      await expect(service.uploadFileComplete('cust-123', {})).rejects.toThrow('File is required')
      await expect(service.uploadFileComplete('cust-123', { file: Buffer.from('test') })).rejects.toThrow('file_category is required')
      await expect(service.uploadFileComplete('cust-123', { file: Buffer.from('test'), file_category: 'invalid' })).rejects.toThrow('file_category must be one of: identity, proof_of_address, liveness_check')
    })

    test('uploadFileComplete handles S3 upload error', async () => {
      const service = new CustomerService(client)

      const mockPresignedResponse = {
        data: {
          message: 'Url generated successfully',
          url: 'https://s3.amazonaws.com/bucket/file',
          file_id: 'file-123',
          headers: []
        }
      }

      client.makeRequest.mockResolvedValueOnce(mockPresignedResponse)

      service._uploadToS3 = jest.fn().mockRejectedValue(new Error('S3 upload failed'))

      await expect(service.uploadFileComplete('cust-123', {
        file: Buffer.from('test'),
        file_category: 'identity',
        contentType: 'application/pdf'
      })).rejects.toThrow('File upload failed: S3 upload failed')

      expect(client.makeRequest).toHaveBeenCalledWith('POST', '/api/external/file/get-presigned-url', {
        customer_id: 'cust-123',
        file_category: 'identity'
      })
    })

    test('uploadFileComplete success flow with contentType', async () => {
      const service = new CustomerService(client)

      const mockPresignedResponse = {
        data: {
          message: 'Url generated successfully',
          url: 'https://s3.amazonaws.com/bucket/file',
          file_id: 'file-123',
          headers: []
        }
      }

      const mockFileAssociationResponse = {
        data: { success: true }
      }

      client.makeRequest
        .mockResolvedValueOnce(mockPresignedResponse)
        .mockResolvedValueOnce(mockFileAssociationResponse)

      service._uploadToS3 = jest.fn().mockResolvedValue({ status: 200 })

      const result = await service.uploadFileComplete('cust-123', {
        file: Buffer.from('test'),
        file_category: 'identity',
        contentType: 'application/pdf'
      })

      expect(service._uploadToS3).toHaveBeenCalledWith(
        'https://s3.amazonaws.com/bucket/file',
        Buffer.from('test'),
        'application/pdf',
        undefined
      )

      expect(client.makeRequest).toHaveBeenCalledWith('POST', '/api/external/customer/cust-123/files', {
        id_file: 'file-123'
      })

      expect(result).toEqual({
        data: { success: true },
        file_id: 'file-123',
        presigned_url: 'https://s3.amazonaws.com/bucket/file'
      })
    })

    test('uploadFileComplete auto-detects content type from magic bytes', async () => {
      const service = new CustomerService(client)

      const mockPresignedResponse = {
        data: {
          message: 'Url generated successfully',
          url: 'https://s3.amazonaws.com/bucket/file',
          file_id: 'file-123',
          headers: []
        }
      }

      const mockFileAssociationResponse = {
        data: { success: true }
      }

      client.makeRequest
        .mockResolvedValueOnce(mockPresignedResponse)
        .mockResolvedValueOnce(mockFileAssociationResponse)

      service._uploadToS3 = jest.fn().mockResolvedValue({ status: 200 })

      // PNG magic bytes
      const pngBuffer = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])

      const result = await service.uploadFileComplete('cust-123', {
        file: pngBuffer,
        file_category: 'identity'
      })

      expect(service._uploadToS3).toHaveBeenCalledWith(
        'https://s3.amazonaws.com/bucket/file',
        pngBuffer,
        'image/png',
        undefined
      )
    })

    test('uploadFileComplete auto-detects content type from filename extension', async () => {
      const service = new CustomerService(client)

      const mockPresignedResponse = {
        data: {
          message: 'Url generated successfully',
          url: 'https://s3.amazonaws.com/bucket/file',
          file_id: 'file-123',
          headers: []
        }
      }

      const mockFileAssociationResponse = {
        data: { success: true }
      }

      client.makeRequest
        .mockResolvedValueOnce(mockPresignedResponse)
        .mockResolvedValueOnce(mockFileAssociationResponse)

      service._uploadToS3 = jest.fn().mockResolvedValue({ status: 200 })

      // Random bytes (no magic byte match), but with a filename
      const result = await service.uploadFileComplete('cust-123', {
        file: Buffer.from('random content'),
        file_category: 'identity',
        filename: 'document.pdf'
      })

      expect(service._uploadToS3).toHaveBeenCalledWith(
        'https://s3.amazonaws.com/bucket/file',
        Buffer.from('random content'),
        'application/pdf',
        'document.pdf'
      )
    })

    test('uploadFileComplete throws error when content type cannot be determined', async () => {
      const service = new CustomerService(client)

      const mockPresignedResponse = {
        data: {
          message: 'Url generated successfully',
          url: 'https://s3.amazonaws.com/bucket/file',
          file_id: 'file-123',
          headers: []
        }
      }

      client.makeRequest.mockResolvedValueOnce(mockPresignedResponse)

      await expect(service.uploadFileComplete('cust-123', {
        file: Buffer.from('test'),
        file_category: 'identity'
      })).rejects.toThrow('Could not determine file content type')
    })

    test('uploadFileComplete handles base64 string with auto-detected content type', async () => {
      const service = new CustomerService(client)

      const mockPresignedResponse = {
        data: {
          message: 'Url generated successfully',
          url: 'https://s3.amazonaws.com/bucket/file',
          file_id: 'file-123',
          headers: []
        }
      }

      const mockFileAssociationResponse = {
        data: { success: true }
      }

      client.makeRequest
        .mockResolvedValueOnce(mockPresignedResponse)
        .mockResolvedValueOnce(mockFileAssociationResponse)

      service._uploadToS3 = jest.fn().mockResolvedValue({ status: 200 })

      // This is a valid 1x1 PNG - magic bytes will be detected
      const base64String = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

      const result = await service.uploadFileComplete('cust-123', {
        file: base64String,
        file_category: 'identity'
      })

      // PNG magic bytes are auto-detected from the base64-decoded content
      expect(service._uploadToS3).toHaveBeenCalledWith(
        'https://s3.amazonaws.com/bucket/file',
        Buffer.from(base64String, 'base64'),
        'image/png',
        undefined
      )

      expect(result).toEqual({
        data: { success: true },
        file_id: 'file-123',
        presigned_url: 'https://s3.amazonaws.com/bucket/file'
      })
    })

    test('uploadFileComplete handles data URL with content type extraction', async () => {
      const service = new CustomerService(client)

      const mockPresignedResponse = {
        data: {
          message: 'Url generated successfully',
          url: 'https://s3.amazonaws.com/bucket/file',
          file_id: 'file-123',
          headers: []
        }
      }

      const mockFileAssociationResponse = {
        data: { success: true }
      }

      client.makeRequest
        .mockResolvedValueOnce(mockPresignedResponse)
        .mockResolvedValueOnce(mockFileAssociationResponse)

      service._uploadToS3 = jest.fn().mockResolvedValue({ status: 200 })

      const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

      await service.uploadFileComplete('cust-123', {
        file: dataUrl,
        file_category: 'identity'
      })

      expect(service._uploadToS3).toHaveBeenCalledWith(
        'https://s3.amazonaws.com/bucket/file',
        Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64'),
        'image/png',
        undefined
      )
    })

    test('uploadFileComplete handles URL download', async () => {
      const service = new CustomerService(client)

      const mockPresignedResponse = {
        data: {
          message: 'Url generated successfully',
          url: 'https://s3.amazonaws.com/bucket/file',
          file_id: 'file-123',
          headers: []
        }
      }

      const mockFileAssociationResponse = {
        data: { success: true }
      }

      client.makeRequest
        .mockResolvedValueOnce(mockPresignedResponse)
        .mockResolvedValueOnce(mockFileAssociationResponse)

      service._uploadToS3 = jest.fn().mockResolvedValue({ status: 200 })
      service._downloadFile = jest.fn().mockResolvedValue({
        buffer: Buffer.from('downloaded file content'),
        contentType: 'image/jpeg',
        filename: 'downloaded-image.jpg'
      })

      const result = await service.uploadFileComplete('cust-123', {
        file: 'https://example.com/image.jpg',
        file_category: 'identity'
      })

      expect(service._downloadFile).toHaveBeenCalledWith('https://example.com/image.jpg')
      expect(service._uploadToS3).toHaveBeenCalledWith(
        'https://s3.amazonaws.com/bucket/file',
        Buffer.from('downloaded file content'),
        'image/jpeg',
        'downloaded-image.jpg'
      )

      expect(result).toEqual({
        data: { success: true },
        file_id: 'file-123',
        presigned_url: 'https://s3.amazonaws.com/bucket/file'
      })
    })

    test('uploadFileComplete handles URL download error', async () => {
      const service = new CustomerService(client)

      const mockPresignedResponse = {
        data: {
          message: 'Url generated successfully',
          url: 'https://s3.amazonaws.com/bucket/file',
          file_id: 'file-123',
          headers: []
        }
      }

      client.makeRequest.mockResolvedValueOnce(mockPresignedResponse)
      service._downloadFile = jest.fn().mockRejectedValue(new Error('Download failed'))

      await expect(service.uploadFileComplete('cust-123', {
        file: 'https://example.com/image.jpg',
        file_category: 'identity'
      })).rejects.toThrow('File upload failed: Download failed')
    })

    test('uploadFileComplete throws error for invalid plain base64 string', async () => {
      const service = new CustomerService(client)

      const mockPresignedResponse = {
        data: {
          message: 'Url generated successfully',
          url: 'https://s3.amazonaws.com/bucket/file',
          file_id: 'file-123',
          headers: []
        }
      }

      client.makeRequest.mockResolvedValueOnce(mockPresignedResponse)

      await expect(service.uploadFileComplete('cust-123', {
        file: '/home/user/photo.jpg',
        file_category: 'identity'
      })).rejects.toThrow('does not appear to be valid base64')
    })

    test('uploadFileComplete throws error for invalid base64 in data URL', async () => {
      const service = new CustomerService(client)

      const mockPresignedResponse = {
        data: {
          message: 'Url generated successfully',
          url: 'https://s3.amazonaws.com/bucket/file',
          file_id: 'file-123',
          headers: []
        }
      }

      client.makeRequest.mockResolvedValueOnce(mockPresignedResponse)

      await expect(service.uploadFileComplete('cust-123', {
        file: 'data:image/jpeg;base64,not valid base64!!',
        file_category: 'identity'
      })).rejects.toThrow('does not appear to be valid base64')
    })
  })

  describe('CollectionService', () => {
    test('initiate validates required fields', async () => {
      const service = new CollectionService(client)
      await expect(service.initiate({})).rejects.toThrow('customer_id is required')
    })

    test('initiate validates all required fields in order', async () => {
      const service = new CollectionService(client)
      await expect(service.initiate({ customer_id: 'c' })).rejects.toThrow('wallet_id is required')
      await expect(service.initiate({ customer_id: 'c', wallet_id: 'w' })).rejects.toThrow('amount is required')
      await expect(service.initiate({ customer_id: 'c', wallet_id: 'w', amount: 100 })).rejects.toThrow('currency is required')
      await expect(service.initiate({ customer_id: 'c', wallet_id: 'w', amount: 100, currency: 'NGN' })).rejects.toThrow('method is required')
    })

    test('initiate calls makeRequest with all required fields', async () => {
      const service = new CollectionService(client)
      const data = {
        customer_id: 'c',
        wallet_id: 'w',
        amount: 100,
        currency: 'NGN',
        method: 'card'
      }
      await service.initiate(data)
      expect(client.makeRequest).toHaveBeenCalledWith('POST', '/api/external/collection', data)
    })

    test('attachCustomer validates required fields', async () => {
      const service = new CollectionService(client)
      await expect(service.attachCustomer({})).rejects.toThrow('customer_id is required')
    })

    test('acceptInteracMoneyRequest validates reference_number', async () => {
      const service = new CollectionService(client)
      await expect(service.acceptInteracMoneyRequest({})).rejects.toThrow('reference_number is required')
    })

    test('acceptInteracMoneyRequest calls makeRequest', async () => {
      const service = new CollectionService(client)
      const data = { reference_number: 'ref-123' }
      await service.acceptInteracMoneyRequest(data)
      expect(client.makeRequest).toHaveBeenCalledWith('POST', '/api/external/collection/accept-interac-money-request', data)
    })
  })

  describe('PayoutService', () => {
    test('initiate validates required fields', async () => {
      const service = new PayoutService(client)
      await expect(service.initiate({})).rejects.toThrow('wallet_id is required')
    })

    test('initiate validates customer_id is required', async () => {
      const service = new PayoutService(client)
      await expect(service.initiate({ wallet_id: 'w' })).rejects.toThrow('customer_id is required')
    })

    test('initiate validates either from_amount or to_amount is required', async () => {
      const service = new PayoutService(client)
      const data = {
        wallet_id: 'w',
        customer_id: 'c',
        method: 'bank_transfer',
        from_currency_id: 'USD',
        to_currency_id: 'NGN'
      }
      await expect(service.initiate(data)).rejects.toThrow('Either from_amount or to_amount is required')
    })

    test('bank_transfer NGN requires bank_id and account_number', async () => {
      const service = new PayoutService(client)
      const data = {
        wallet_id: 'w',
        customer_id: 'c',
        method: 'bank_transfer',
        from_amount: 1,
        from_currency_id: 'USD',
        to_currency_id: 'NGN'
      }
      await expect(service.initiate(data)).rejects.toThrow('bank_id is required for NGN bank_transfer method')
    })

    test('bank_transfer GBP requires sort_code, account_number, account_name', async () => {
      const service = new PayoutService(client)
      const data = {
        wallet_id: 'w',
        customer_id: 'c',
        method: 'bank_transfer',
        from_amount: 1,
        from_currency_id: 'GBP',
        to_currency_id: 'GBP'
      }
      await expect(service.initiate(data)).rejects.toThrow('sort_code is required for GBP bank_transfer method')
    })

    test('bank_transfer EUR requires iban, bic_code, account_name', async () => {
      const service = new PayoutService(client)
      const data = {
        wallet_id: 'w',
        customer_id: 'c',
        method: 'bank_transfer',
        from_amount: 1,
        from_currency_id: 'EUR',
        to_currency_id: 'EUR'
      }
      await expect(service.initiate(data)).rejects.toThrow('iban is required for EUR bank_transfer method')
    })

    test('interac requires extra fields', async () => {
      const service = new PayoutService(client)
      const data = {
        wallet_id: 'w',
        customer_id: 'c',
        method: 'interac',
        from_amount: 1,
        from_currency_id: 'USD',
        to_currency_id: 'CAD'
      }
      await expect(service.initiate(data)).rejects.toThrow('email is required for interac method')
    })

    test('ach requires extra fields', async () => {
      const service = new PayoutService(client)
      const data = {
        wallet_id: 'w',
        customer_id: 'c',
        method: 'ach',
        from_amount: 1,
        from_currency_id: 'USD',
        to_currency_id: 'USD'
      }
      await expect(service.initiate(data)).rejects.toThrow('type is required for ach method')
    })

    test('wire requires extra fields including swift_code', async () => {
      const service = new PayoutService(client)
      const data = {
        wallet_id: 'w',
        customer_id: 'c',
        method: 'wire',
        from_amount: 1,
        from_currency_id: 'USD',
        to_currency_id: 'USD',
        type: 'individual',
        account_number: '123',
        account_name: 'Test',
        account_type: 'checking',
        bank_name: 'Test Bank',
        routing_number: '123456'
      }
      await expect(service.initiate(data)).rejects.toThrow('swift_code is required for wire method')
    })

    test('crypto requires wallet fields', async () => {
      const service = new PayoutService(client)
      const data = {
        wallet_id: 'w',
        customer_id: 'c',
        method: 'crypto',
        from_amount: 1,
        from_currency_id: 'USD',
        to_currency_id: 'USDT'
      }
      await expect(service.initiate(data)).rejects.toThrow('wallet_address is required for crypto method')
    })

    test('initiate calls makeRequest with valid data', async () => {
      const service = new PayoutService(client)
      const data = {
        wallet_id: 'w',
        customer_id: 'c',
        method: 'bank_transfer',
        from_amount: 1,
        from_currency_id: 'NGN',
        to_currency_id: 'NGN',
        bank_id: 'b',
        account_number: '123456789'
      }
      await service.initiate(data)
      expect(client.makeRequest).toHaveBeenCalledWith('POST', '/api/external/payout', data)
    })

    test('initiate accepts to_amount instead of from_amount', async () => {
      const service = new PayoutService(client)
      const data = {
        wallet_id: 'w',
        customer_id: 'c',
        method: 'bank_transfer',
        to_amount: 1000,
        from_currency_id: 'NGN',
        to_currency_id: 'NGN',
        bank_id: 'b',
        account_number: '123456789'
      }
      await service.initiate(data)
      expect(client.makeRequest).toHaveBeenCalledWith('POST', '/api/external/payout', data)
    })
  })

  describe('WalletService', () => {
    test('get validates id', async () => {
      const service = new WalletService(client)
      await expect(service.get()).rejects.toThrow('Wallet ID is required')
    })
  })

  describe('VirtualBankAccountService', () => {
    test('create validates wallet_id', async () => {
      const service = new VirtualBankAccountService(client)
      await expect(service.create({})).rejects.toThrow('wallet_id is required')
    })

    test('get validates id', async () => {
      const service = new VirtualBankAccountService(client)
      await expect(service.get()).rejects.toThrow('Virtual bank account ID is required')
    })

    test('list calls makeRequest with no params', async () => {
      const service = new VirtualBankAccountService(client)
      await service.list()
      expect(client.makeRequest).toHaveBeenCalledWith('GET', '/api/external/virtual-bank-account')
    })

    test('list calls makeRequest with wallet_id', async () => {
      const service = new VirtualBankAccountService(client)
      await service.list('wallet-123')
      expect(client.makeRequest).toHaveBeenCalledWith('GET', '/api/external/virtual-bank-account?wallet_id=wallet-123')
    })

    test('list calls makeRequest with customer_id', async () => {
      const service = new VirtualBankAccountService(client)
      await service.list(null, 'customer-123')
      expect(client.makeRequest).toHaveBeenCalledWith('GET', '/api/external/virtual-bank-account?customer_id=customer-123')
    })

    test('list calls makeRequest with both wallet_id and customer_id', async () => {
      const service = new VirtualBankAccountService(client)
      await service.list('wallet-123', 'customer-123')
      expect(client.makeRequest).toHaveBeenCalledWith('GET', '/api/external/virtual-bank-account?wallet_id=wallet-123&customer_id=customer-123')
    })

    test('close validates vba id', async () => {
      const service = new VirtualBankAccountService(client)
      await expect(service.close()).rejects.toThrow('Virtual bank account ID is required')
    })

    test('close calls makeRequest without reason', async () => {
      const service = new VirtualBankAccountService(client)
      await service.close('vba-123')
      expect(client.makeRequest).toHaveBeenCalledWith('POST', '/api/external/virtual-bank-account/vba-123/close', {})
    })

    test('close calls makeRequest with reason', async () => {
      const service = new VirtualBankAccountService(client)
      await service.close('vba-123', 'No longer needed')
      expect(client.makeRequest).toHaveBeenCalledWith('POST', '/api/external/virtual-bank-account/vba-123/close', { reason: 'No longer needed' })
    })

    test('getIdentificationType validates params', async () => {
      const service = new VirtualBankAccountService(client)
      await expect(service.getIdentificationType()).rejects.toThrow('Either customer_id or both country and type are required')
      await expect(service.getIdentificationType(null, 'NG')).rejects.toThrow('Either customer_id or both country and type are required')
    })

    test('getIdentificationType calls makeRequest with customer_id', async () => {
      const service = new VirtualBankAccountService(client)
      await service.getIdentificationType('customer-123')
      expect(client.makeRequest).toHaveBeenCalledWith('GET', '/api/external/virtual-bank-account/identification-type?customer_id=customer-123')
    })

    test('getIdentificationType calls makeRequest with country and type', async () => {
      const service = new VirtualBankAccountService(client)
      await service.getIdentificationType(null, 'NG', 'individual')
      expect(client.makeRequest).toHaveBeenCalledWith('GET', '/api/external/virtual-bank-account/identification-type?country=NG&type=individual')
    })
  })

  describe('TransactionService', () => {
    test('get validates id', async () => {
      const service = new TransactionService(client)
      await expect(service.get()).rejects.toThrow('Transaction ID is required')
    })
  })

  describe('BankService', () => {
    test('lookupAccount validates fields', async () => {
      const service = new BankService(client)
      await expect(service.lookupAccount({})).rejects.toThrow('account_number is required')
    })
  })

  describe('CurrencyService', () => {
    test('list calls makeRequest', async () => {
      const service = new CurrencyService(client)
      await service.list()
      expect(client.makeRequest).toHaveBeenCalledWith('GET', '/api/external/currency')
    })
  })

  describe('FeesService', () => {
    test('getBreakdown validates fields', async () => {
      const service = new FeesService(client)
      await expect(service.getBreakdown({})).rejects.toThrow('from_currency_id is required')
    })

    test('getBreakdown validates either from_amount or to_amount is required', async () => {
      const service = new FeesService(client)
      await expect(service.getBreakdown({
        from_currency_id: 'USD',
        to_currency_id: 'NGN'
      })).rejects.toThrow('Either from_amount or to_amount is required')
    })

    test('getBreakdown calls makeRequest with from_amount', async () => {
      const service = new FeesService(client)
      const data = {
        from_currency_id: 'USD',
        to_currency_id: 'NGN',
        from_amount: 100
      }
      await service.getBreakdown(data)
      expect(client.makeRequest).toHaveBeenCalledWith('POST', '/api/external/fees/breakdown', data)
    })

    test('getBreakdown calls makeRequest with to_amount', async () => {
      const service = new FeesService(client)
      const data = {
        from_currency_id: 'USD',
        to_currency_id: 'NGN',
        to_amount: 50000
      }
      await service.getBreakdown(data)
      expect(client.makeRequest).toHaveBeenCalledWith('POST', '/api/external/fees/breakdown', data)
    })
  })

  describe('FileService', () => {
    test('getPresignedUrl validates fields', async () => {
      const service = new FileService(client)
      await expect(service.getPresignedUrl({})).rejects.toThrow('customer_id is required')
    })
  })

  describe('WebhookService', () => {
    test('register validates fields', async () => {
      const service = new WebhookService(client)
      await expect(service.register({})).rejects.toThrow('collection_url is required')
    })

    test('replay validates fields', async () => {
      const service = new WebhookService(client)
      await expect(service.replay({})).rejects.toThrow('transaction_id is required')
    })

    test('simulateInteracWebhook calls makeRequest', async () => {
      const service = new WebhookService(client)
      const data = { interac_email: 'sender@example.com' }
      await service.simulateInteracWebhook(data)
      expect(client.makeRequest).toHaveBeenCalledWith('POST', '/api/external/mock/simulate-webhook/interac', data)
    })

    test('verifySignature validates required parameters', () => {
      const service = new WebhookService(client)

      expect(() => service.verifySignature('', 'sig', '123', 'secret')).toThrow('Payload is required for signature verification')
      expect(() => service.verifySignature('payload', '', '123', 'secret')).toThrow('Signature is required for signature verification')
      expect(() => service.verifySignature('payload', 'sig', '', 'secret')).toThrow('Timestamp is required for signature verification')
      expect(() => service.verifySignature('payload', 'sig', '123', '')).toThrow('Webhook secret is required for signature verification')
    })

    test('verifySignature returns true for valid signature', () => {
      const service = new WebhookService(client)
      const payload = '{"transaction_id":"txn_123","status":"completed"}'
      const timestamp = '1234567890'
      const secret = 'webhook_secret_key'

      const crypto = require('crypto')
      const signedPayload = `${timestamp}.${payload}`
      const validSignature = crypto.createHmac('sha256', secret).update(signedPayload, 'utf8').digest('hex')

      expect(service.verifySignature(payload, validSignature, timestamp, secret)).toBe(true)
    })

    test('verifySignature returns false for invalid signature', () => {
      const service = new WebhookService(client)
      const payload = '{"transaction_id":"txn_123","status":"completed"}'
      const timestamp = '1234567890'
      const secret = 'webhook_secret_key'
      const invalidSignature = 'invalid_signature_hex_value_here_1234567890abcdef1234567890abcdef'

      expect(service.verifySignature(payload, invalidSignature, timestamp, secret)).toBe(false)
    })

    test('verifySignature works with object payload', () => {
      const service = new WebhookService(client)
      const payload = { transaction_id: 'txn_123', status: 'completed' }
      const timestamp = '1234567890'
      const secret = 'webhook_secret_key'

      const crypto = require('crypto')
      const signedPayload = `${timestamp}.${JSON.stringify(payload)}`
      const validSignature = crypto.createHmac('sha256', secret).update(signedPayload, 'utf8').digest('hex')

      expect(service.verifySignature(payload, validSignature, timestamp, secret)).toBe(true)
    })

    test('constructEvent validates signature and returns event', () => {
      const service = new WebhookService(client)
      const payload = '{"transaction_id":"txn_123","status":"completed"}'
      const timestamp = '1234567890'
      const secret = 'webhook_secret_key'

      const crypto = require('crypto')
      const signedPayload = `${timestamp}.${payload}`
      const validSignature = crypto.createHmac('sha256', secret).update(signedPayload, 'utf8').digest('hex')

      const event = service.constructEvent(payload, validSignature, timestamp, secret)

      expect(event.transaction_id).toBe('txn_123')
      expect(event.status).toBe('completed')
      expect(event.verified).toBe(true)
      expect(event.timestamp).toBeDefined()
    })

    test('constructEvent throws error for invalid signature', () => {
      const service = new WebhookService(client)
      const payload = '{"transaction_id":"txn_123","status":"completed"}'
      const timestamp = '1234567890'
      const secret = 'webhook_secret_key'
      const invalidSignature = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'

      expect(() => service.constructEvent(payload, invalidSignature, timestamp, secret)).toThrow('Invalid webhook signature')
    })

    test('constructEvent throws error for invalid JSON', () => {
      const service = new WebhookService(client)
      const payload = 'invalid json'
      const timestamp = '1234567890'
      const secret = 'webhook_secret_key'

      const crypto = require('crypto')
      const signedPayload = `${timestamp}.${payload}`
      const validSignature = crypto.createHmac('sha256', secret).update(signedPayload, 'utf8').digest('hex')

      expect(() => service.constructEvent(payload, validSignature, timestamp, secret)).toThrow('Invalid webhook payload: unable to parse JSON')
    })

    test('constructEvent works with object payload', () => {
      const service = new WebhookService(client)
      const payload = { transaction_id: 'txn_123', status: 'completed' }
      const timestamp = '1234567890'
      const secret = 'webhook_secret_key'

      const crypto = require('crypto')
      const signedPayload = `${timestamp}.${JSON.stringify(payload)}`
      const validSignature = crypto.createHmac('sha256', secret).update(signedPayload, 'utf8').digest('hex')

      const event = service.constructEvent(payload, validSignature, timestamp, secret)

      expect(event.transaction_id).toBe('txn_123')
      expect(event.status).toBe('completed')
      expect(event.verified).toBe(true)
    })
  })
})

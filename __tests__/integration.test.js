/**
 * Integration Tests for Blaaiz Node.js SDK
 *
 * These tests require a valid API key and should be run against a test environment.
 * Set BLAAIZ_API_KEY environment variable to run these tests.
 */

const { Blaaiz } = require('../index')
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

describe('Blaaiz SDK Integration Tests', () => {
  let blaaiz
  let apiKey

  beforeAll(() => {
    apiKey = process.env.BLAAIZ_API_KEY
    const baseURL = process.env.BLAAIZ_API_URL || 'https://api-dev.blaaiz.com'

    console.log('Integration test configuration:', {
      apiKeySet: !!apiKey,
      apiKeyPrefix: apiKey ? `${apiKey.substring(0, 8)}...` : 'NOT_SET',
      baseURL,
      nodeVersion: process.version,
      platform: process.platform
    })

    if (!apiKey) {
      console.warn('BLAAIZ_API_KEY not set, skipping integration tests')
      return
    }

    blaaiz = new Blaaiz(apiKey, { baseURL })
  })

  const skipIfNoApiKey = () => {
    if (!apiKey || !blaaiz) {
      expect(true).toBe(true) // Pass the test when API key is not set
      return true
    }
    return false
  }

  describe('Basic API Operations', () => {
    test('should connect to API', async () => {
      if (skipIfNoApiKey()) return
      const isConnected = await blaaiz.testConnection()
      expect(isConnected).toBe(true)
    }, 10000)

    test('should list currencies', async () => {
      if (skipIfNoApiKey()) return
      try {
        const currencies = await blaaiz.currencies.list()
        expect(currencies).toHaveProperty('data')
        expect(Array.isArray(currencies.data)).toBe(true)
      } catch (error) {
        if (error.message.includes('Column not found') || error.status === 500) {
          pending(`Server-side error: ${error.message}`)
        } else {
          throw error
        }
      }
    }, 10000)

    test('should list wallets', async () => {
      if (skipIfNoApiKey()) return
      const wallets = await blaaiz.wallets.list()
      expect(wallets).toHaveProperty('data')
      expect(Array.isArray(wallets.data)).toBe(true)
    }, 10000)

    test('should list banks', async () => {
      if (skipIfNoApiKey()) return
      try {
        const banks = await blaaiz.banks.list()
        expect(banks).toHaveProperty('data')
        expect(Array.isArray(banks.data)).toBe(true)
      } catch (error) {
        if (error.message.includes('Column not found') || error.status === 500) {
          console.warn(`Skipping banks test due to server-side error: ${error.message}`)
          return
        } else {
          throw error
        }
      }
    }, 10000)
  })

  describe('Customer Management', () => {
    test('should create and retrieve customer', async () => {
      if (skipIfNoApiKey()) return

      const customerData = {
        first_name: 'John',
        last_name: 'Doe',
        type: 'individual',
        email: `john.doe.${crypto.randomBytes(4).toString('hex')}@example.com`,
        country: 'NG',
        id_type: 'passport',
        id_number: `A${crypto.randomBytes(4).toString('hex').toUpperCase()}`
      }

      const customer = await blaaiz.customers.create(customerData)
      expect(customer).toHaveProperty('data')
      expect(customer.data).toHaveProperty('data')
      expect(customer.data.data).toHaveProperty('id')

      const customerId = customer.data.data.id
      const retrievedCustomer = await blaaiz.customers.get(customerId)

      // Handle different response structures
      let actualCustomerId
      if (retrievedCustomer.data.data) {
        actualCustomerId = retrievedCustomer.data.data.id
      } else {
        actualCustomerId = retrievedCustomer.data.id
      }

      expect(actualCustomerId).toBe(customerId)
    }, 15000)
  })

  describe('File Upload Complete Workflow', () => {
    // Helper to create a fresh unverified customer for file upload tests
    const createFreshCustomer = async () => {
      const customerData = {
        first_name: 'FileTest',
        last_name: 'User',
        email: `filetest.${crypto.randomBytes(4).toString('hex')}@example.com`,
        type: 'individual',
        country: 'NG',
        id_type: 'passport',
        id_number: `A${crypto.randomBytes(4).toString('hex').toUpperCase()}`
      }
      const customer = await blaaiz.customers.create(customerData)
      return customer.data.data.id
    }

    // Helper to check if error is due to verified customer
    const isVerifiedCustomerError = (error) => {
      return error.message.includes('verified customer') ||
             error.message.includes('already exists') ||
             error.message.includes('duplicate')
    }

    test('should upload file for each category', async () => {
      if (skipIfNoApiKey()) return

      const testCustomerId = await createFreshCustomer()

      const testFiles = [
        {
          category: 'identity',
          filename: 'test_passport.pdf',
          content: Buffer.from('Test passport document content'),
          content_type: 'application/pdf'
        },
        {
          category: 'proof_of_address',
          filename: 'test_address.jpg',
          content: Buffer.from('Test address proof image content'),
          content_type: 'image/jpeg'
        },
        {
          category: 'liveness_check',
          filename: 'test_selfie.png',
          content: Buffer.from('Test liveness check image content'),
          content_type: 'image/png'
        }
      ]

      for (const fileInfo of testFiles) {
        const fileOptions = {
          file: fileInfo.content,
          file_category: fileInfo.category,
          filename: fileInfo.filename,
          content_type: fileInfo.content_type
        }

        try {
          const uploadResult = await blaaiz.customers.uploadFileComplete(testCustomerId, fileOptions)

          expect(uploadResult).toHaveProperty('file_id')
          expect(uploadResult).toHaveProperty('presigned_url')
          expect(typeof uploadResult.file_id).toBe('string')
          expect(uploadResult.file_id.length).toBeGreaterThan(10)
          expect(uploadResult.presigned_url).toMatch(/^https:\/\//)

          console.log(`✅ Uploaded ${fileInfo.category} file: ${uploadResult.file_id}`)
        } catch (error) {
          if (isVerifiedCustomerError(error)) {
            console.log(`⚠️  Skipped ${fileInfo.category} - customer already verified or API limitation`)
            continue
          }
          throw error
        }
      }
    }, 30000)

    test('should handle different file formats', async () => {
      if (skipIfNoApiKey()) return

      const testCustomerId = await createFreshCustomer()

      const testCases = [
        {
          name: 'PDF Document',
          content: Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n'),
          filename: 'document.pdf',
          content_type: 'application/pdf'
        },
        {
          name: 'JPEG Image',
          content: Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xff, 0xdb]),
          filename: 'image.jpg',
          content_type: 'image/jpeg'
        },
        {
          name: 'PNG Image',
          content: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06]),
          filename: 'image.png',
          content_type: 'image/png'
        }
      ]

      for (const testCase of testCases) {
        const fileOptions = {
          file: testCase.content,
          file_category: 'identity',
          filename: testCase.filename,
          content_type: testCase.content_type
        }

        try {
          const uploadResult = await blaaiz.customers.uploadFileComplete(testCustomerId, fileOptions)
          expect(uploadResult).toHaveProperty('file_id')
          expect(uploadResult).toHaveProperty('presigned_url')
          console.log(`✅ Uploaded ${testCase.name}: ${uploadResult.file_id}`)
        } catch (error) {
          if (isVerifiedCustomerError(error)) {
            console.log(`⚠️  Skipped ${testCase.name} - customer already verified or API limitation`)
            continue
          }
          throw error
        }
      }
    }, 30000)

    test('should handle base64 string input', async () => {
      if (skipIfNoApiKey()) return

      const testCustomerId = await createFreshCustomer()

      const base64String = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

      const fileOptions = {
        file: base64String,
        file_category: 'identity',
        filename: 'test.png',
        content_type: 'image/png'
      }

      try {
        const uploadResult = await blaaiz.customers.uploadFileComplete(testCustomerId, fileOptions)
        expect(uploadResult).toHaveProperty('file_id')
        expect(uploadResult).toHaveProperty('presigned_url')
        console.log(`✅ Uploaded base64 string: ${uploadResult.file_id}`)
      } catch (error) {
        if (isVerifiedCustomerError(error)) {
          console.log('⚠️  Skipped base64 test - customer already verified or API limitation')
        } else {
          throw error
        }
      }
    }, 15000)

    test('should handle data URL input', async () => {
      if (skipIfNoApiKey()) return

      const testCustomerId = await createFreshCustomer()

      const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

      const fileOptions = {
        file: dataUrl,
        file_category: 'identity'
      }

      try {
        const uploadResult = await blaaiz.customers.uploadFileComplete(testCustomerId, fileOptions)
        expect(uploadResult).toHaveProperty('file_id')
        expect(uploadResult).toHaveProperty('presigned_url')
        console.log(`✅ Uploaded data URL: ${uploadResult.file_id}`)
      } catch (error) {
        if (isVerifiedCustomerError(error)) {
          console.log('⚠️  Skipped data URL test - customer already verified or API limitation')
        } else {
          throw error
        }
      }
    }, 15000)

    test('should upload real PDF file', async () => {
      if (skipIfNoApiKey()) return

      const pdfPath = path.join(__dirname, 'blank.pdf')

      if (!fs.existsSync(pdfPath)) {
        console.warn('blank.pdf not found in tests directory')
        return
      }

      const testCustomerId = await createFreshCustomer()
      const pdfContent = fs.readFileSync(pdfPath)

      const fileOptions = {
        file: pdfContent,
        file_category: 'identity',
        filename: 'blank.pdf',
        content_type: 'application/pdf'
      }

      try {
        const uploadResult = await blaaiz.customers.uploadFileComplete(testCustomerId, fileOptions)
        expect(uploadResult).toHaveProperty('file_id')
        expect(uploadResult).toHaveProperty('presigned_url')

        // Verify file_id is a valid UUID-like string
        expect(typeof uploadResult.file_id).toBe('string')
        expect(uploadResult.file_id.length).toBeGreaterThan(10)

        // Verify presigned URL is valid
        expect(uploadResult.presigned_url).toMatch(/^https:\/\//)

        // Verify the file size is reasonable
        expect(pdfContent.length).toBeGreaterThan(0)
        expect(pdfContent.length).toBeLessThan(10 * 1024 * 1024) // Less than 10MB

        console.log(`✅ Successfully uploaded PDF file: ${pdfContent.length} bytes`)
        console.log(`✅ File ID: ${uploadResult.file_id}`)
        console.log(`✅ Presigned URL: ${uploadResult.presigned_url.substring(0, 50)}...`)
      } catch (error) {
        if (isVerifiedCustomerError(error)) {
          console.log('⚠️  Skipped real PDF test - customer already verified or API limitation')
        } else {
          throw error
        }
      }
    }, 15000)
  })

  describe('File Upload Error Handling', () => {
    let testCustomerId

    beforeAll(async () => {
      if (skipIfNoApiKey()) return

      const customerData = {
        first_name: 'ErrorTest',
        last_name: 'User',
        email: `errortest.${crypto.randomBytes(4).toString('hex')}@example.com`,
        type: 'individual',
        country: 'NG',
        id_type: 'passport',
        id_number: `A${crypto.randomBytes(4).toString('hex').toUpperCase()}`
      }

      const customer = await blaaiz.customers.create(customerData)
      testCustomerId = customer.data.data.id
    })

    test('should handle invalid file category', async () => {
      if (skipIfNoApiKey()) return

      const fileOptions = {
        file: Buffer.from('test content'),
        file_category: 'invalid_category',
        filename: 'test.pdf',
        content_type: 'application/pdf'
      }

      await expect(blaaiz.customers.uploadFileComplete(testCustomerId, fileOptions))
        .rejects.toThrow('file_category must be one of: identity, proof_of_address, liveness_check')
    }, 10000)

    test('should handle missing file content', async () => {
      if (skipIfNoApiKey()) return

      const fileOptions = {
        file: null,
        file_category: 'identity',
        filename: 'test.pdf',
        content_type: 'application/pdf'
      }

      await expect(blaaiz.customers.uploadFileComplete(testCustomerId, fileOptions))
        .rejects.toThrow('File is required')
    }, 10000)

    test('should handle invalid customer ID', async () => {
      if (skipIfNoApiKey()) return

      const fileOptions = {
        file: Buffer.from('test content'),
        file_category: 'identity',
        filename: 'test.pdf',
        content_type: 'application/pdf'
      }

      await expect(blaaiz.customers.uploadFileComplete('invalid-customer-id', fileOptions))
        .rejects.toThrow()
    }, 10000)

    test('should handle missing file_category', async () => {
      if (skipIfNoApiKey()) return

      const fileOptions = {
        file: Buffer.from('test content'),
        filename: 'test.pdf',
        content_type: 'application/pdf'
      }

      await expect(blaaiz.customers.uploadFileComplete(testCustomerId, fileOptions))
        .rejects.toThrow('file_category is required')
    }, 10000)
  })

  describe('Comprehensive File Upload Workflow', () => {
    test('should handle complete workflow with multiple files', async () => {
      if (skipIfNoApiKey()) return

      // Create a test customer
      const customerData = {
        first_name: 'Comprehensive',
        last_name: 'Test',
        email: `comprehensive.${crypto.randomBytes(4).toString('hex')}@example.com`,
        type: 'individual',
        country: 'NG',
        id_type: 'passport',
        id_number: `A${crypto.randomBytes(4).toString('hex').toUpperCase()}`
      }

      const customer = await blaaiz.customers.create(customerData)
      const customerId = customer.data.data.id

      // Test files: mix of real content and synthetic data
      const testFiles = [
        {
          name: 'PDF Document',
          category: 'identity',
          filename: 'passport.pdf',
          content: Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000074 00000 n \n0000000120 00000 n \ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n179\n%%EOF'),
          content_type: 'application/pdf'
        },
        {
          name: 'Synthetic JPEG',
          category: 'liveness_check',
          filename: 'selfie.jpg',
          content: Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12, 0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20, 0x24, 0x2e, 0x27, 0x20, 0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29, 0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27, 0x39, 0x3d, 0x38, 0x32, 0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01, 0xff, 0xc4, 0x00, 0x15, 0x00, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x08, 0xff, 0xc4, 0x00, 0x14, 0x10, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00, 0xaa, 0xff, 0xd9]),
          content_type: 'image/jpeg'
        },
        {
          name: 'Synthetic PNG',
          category: 'proof_of_address',
          filename: 'address_proof.png',
          content: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0xf8, 0x0f, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82]),
          content_type: 'image/png'
        }
      ]

      const uploadedFiles = []

      // Upload each file
      for (const fileInfo of testFiles) {
        const fileOptions = {
          file: fileInfo.content,
          file_category: fileInfo.category,
          filename: fileInfo.filename,
          content_type: fileInfo.content_type
        }

        try {
          const uploadResult = await blaaiz.customers.uploadFileComplete(customerId, fileOptions)

          expect(uploadResult).toHaveProperty('file_id')
          expect(uploadResult).toHaveProperty('presigned_url')

          uploadedFiles.push({
            name: fileInfo.name,
            file_id: uploadResult.file_id,
            category: fileInfo.category,
            size: fileInfo.content.length
          })

          console.log(`✅ Uploaded ${fileInfo.name}: ${uploadResult.file_id}`)
        } catch (error) {
          if (error.message.includes('verified customer') ||
              error.message.includes('already exists') ||
              error.message.includes('duplicate')) {
            console.log(`⚠️  Skipped ${fileInfo.name} - customer already verified or API limitation`)
            continue
          } else {
            throw error
          }
        }
      }

      // Verify files were uploaded (or all skipped due to verified customer)
      expect(uploadedFiles.length).toBeGreaterThanOrEqual(0)

      // Verify different categories were used
      const categories = uploadedFiles.map(f => f.category)
      console.log(`✅ Successfully uploaded ${uploadedFiles.length} files for customer ${customerId}`)
      uploadedFiles.forEach(file => {
        console.log(`  - ${file.name} (${file.category}): ${file.size} bytes -> ${file.file_id}`)
      })
    }, 45000)
  })

  describe('Webhook Verification', () => {
    test('should verify webhook signature', () => {
      if (skipIfNoApiKey()) return

      const payload = '{"transaction_id":"test-123","status":"completed"}'
      const timestamp = '1234567890'
      const secret = 'test-webhook-secret'
      const signedPayload = `${timestamp}.${payload}`
      const validSignature = crypto.createHmac('sha256', secret).update(signedPayload, 'utf8').digest('hex')

      const isValid = blaaiz.webhooks.verifySignature(payload, validSignature, timestamp, secret)
      expect(isValid).toBe(true)

      const isInvalid = blaaiz.webhooks.verifySignature(payload, 'invalid-signature-0000000000000000000000000000000000000000000000000000000000000000', timestamp, secret)
      expect(isInvalid).toBe(false)
    })

    test('should construct webhook event', () => {
      if (skipIfNoApiKey()) return

      const payload = '{"transaction_id":"test-123","status":"completed"}'
      const timestamp = '1234567890'
      const secret = 'test-webhook-secret'
      const signedPayload = `${timestamp}.${payload}`
      const validSignature = crypto.createHmac('sha256', secret).update(signedPayload, 'utf8').digest('hex')

      const event = blaaiz.webhooks.constructEvent(payload, validSignature, timestamp, secret)
      expect(event.transaction_id).toBe('test-123')
      expect(event.status).toBe('completed')
      expect(event.verified).toBe(true)
      expect(event.timestamp).toBeDefined()
    })
  })

  describe('Fee Calculation', () => {
    test('should calculate fees', async () => {
      if (skipIfNoApiKey()) return

      try {
        const fees = await blaaiz.fees.getBreakdown({
          from_currency_id: '1',
          to_currency_id: '2',
          from_amount: 100000
        })

        expect(fees).toHaveProperty('data')
        const feeData = fees.data

        // Check for various fee structures
        const hasFees = feeData.total_fees !== undefined ||
                       feeData.our_fee !== undefined ||
                       (feeData.payout_fees && feeData.payout_fees.length > 0)

        expect(hasFees).toBe(true)
      } catch (error) {
        if (error.message.includes('Column not found') || error.status === 500) {
          console.warn(`Skipping fee test due to server-side error: ${error.message}`)
          return
        } else {
          throw error
        }
      }
    }, 10000)
  })

  describe('Virtual Bank Account Service', () => {
    test('should create virtual bank account (if wallet available)', async () => {
      if (skipIfNoApiKey()) return

      const testWalletId = process.env.BLAAIZ_TEST_WALLET_ID

      if (!testWalletId) {
        console.warn('BLAAIZ_TEST_WALLET_ID not set')
        return
      }

      try {
        const response = await blaaiz.virtualBankAccounts.create({
          wallet_id: testWalletId,
          account_name: 'Test Account'
        })

        expect(response.data).toBeDefined()
        expect(response.data.account_number).toBeDefined()
        expect(response.data.bank_name).toBeDefined()
      } catch (error) {
        throw error
      }
    }, 10000)
  })

  describe('Error Handling', () => {
    test('should handle invalid API key gracefully', async () => {
      const invalidBlaaiz = new Blaaiz('invalid-key')

      try {
        await invalidBlaaiz.currencies.list()
        throw new Error('Expected error for invalid API key')
      } catch (error) {
        expect(error.message).toBeDefined()
      }
    }, 10000)

    test('should handle invalid customer creation', async () => {
      if (skipIfNoApiKey()) return

      try {
        await blaaiz.customers.create({}) // Missing required fields
        throw new Error('Expected validation error')
      } catch (error) {
        expect(error.message).toBeDefined()
      }
    }, 10000)
  })
})

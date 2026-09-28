const SignaService = require('../src/services/SignaService')

describe('SignaService', () => {
  let client
  let service

  beforeEach(() => {
    client = { makeRequest: jest.fn().mockResolvedValue('ok') }
    service = new SignaService(client)
  })

  test('creates a session with the Signa endpoint', async () => {
    const data = {
      customer_reference: 'customer-123',
      idempotency_key: 'request-123',
      requirements: ['DOCUMENTS', 'SELFIE'],
      fulfilment_mode: 'HOSTED',
      applicant: { first_name: 'Ada', country: 'GBR' }
    }

    await service.createSession(data)

    expect(client.makeRequest).toHaveBeenCalledWith(
      'POST',
      '/api/external/compliance/kyc/sessions',
      data
    )
  })

  test('lists sessions with limit and offset filters', async () => {
    await service.listSessions({ limit: 25, offset: 50 })

    expect(client.makeRequest).toHaveBeenCalledWith(
      'GET',
      '/api/external/compliance/kyc/sessions?limit=25&offset=50'
    )
  })

  test('gets, submits, and cancels a session', async () => {
    await service.getSession('session/123')
    await service.submitSession('session/123')
    await service.cancelSession('session/123')

    expect(client.makeRequest.mock.calls).toEqual([
      ['GET', '/api/external/compliance/kyc/sessions/session%2F123'],
      ['POST', '/api/external/compliance/kyc/sessions/session%2F123/submit'],
      ['POST', '/api/external/compliance/kyc/sessions/session%2F123/cancel']
    ])
  })

  test('creates a document upload URL', async () => {
    const data = { file_name: 'passport.jpg', id_doc_type: 'PASSPORT' }

    await service.createDocumentUploadUrl('session-123', data)

    expect(client.makeRequest).toHaveBeenCalledWith(
      'POST',
      '/api/external/compliance/kyc/sessions/session-123/documents/upload-url',
      data
    )
  })

  test('uploads an inline session document', async () => {
    const data = {
      filename: 'passport.jpg',
      content_type: 'image/jpeg',
      id_doc_type: 'PASSPORT',
      country: 'GBR',
      content_base64: 'aGVsbG8='
    }

    await service.uploadSessionDocument('session-123', data)

    expect(client.makeRequest).toHaveBeenCalledWith(
      'POST',
      '/api/external/compliance/kyc/sessions/session-123/documents',
      data
    )
  })

  test('uploads a staged session document', async () => {
    const data = {
      filename: 'passport.jpg',
      content_type: 'image/jpeg',
      id_doc_type: 'PASSPORT',
      country: 'GBR',
      file_name: 'a1b2c3_passport.jpg'
    }

    await service.uploadDocument('session-123', data)

    expect(client.makeRequest).toHaveBeenCalledWith(
      'POST',
      '/api/external/compliance/kyc/sessions/session-123/documents',
      data
    )
  })

  test('issues the hosted verification link exposed by the API', async () => {
    await service.issueVerificationLink('session-123')

    expect(client.makeRequest).toHaveBeenCalledWith(
      'POST',
      '/api/external/compliance/kyc/sessions/session-123/verification-link'
    )
  })

  test('reads applicant data, lists documents, and downloads a document, encoding both ids', async () => {
    await service.getSessionApplicantData('session/123')
    await service.listSessionDocuments('session/123')
    await service.getSessionDocument('session/123', 'doc/1')

    expect(client.makeRequest.mock.calls).toEqual([
      ['GET', '/api/external/compliance/kyc/sessions/session%2F123/applicant-data'],
      ['GET', '/api/external/compliance/kyc/sessions/session%2F123/documents'],
      ['GET', '/api/external/compliance/kyc/sessions/session%2F123/documents/doc%2F1']
    ])
  })

  test('passes the PII read response through unchanged', async () => {
    client.makeRequest.mockResolvedValueOnce({ data: { message: 'ok', data: null } })

    const result = await service.getSessionApplicantData('session-123')

    expect(result).toEqual({ data: { message: 'ok', data: null } })
  })

  test('validates session and document ids on the PII read methods and makes no HTTP call on failure', async () => {
    await expect(service.getSessionApplicantData()).rejects.toThrow('Session ID is required')
    await expect(service.listSessionDocuments()).rejects.toThrow('Session ID is required')
    await expect(service.getSessionDocument()).rejects.toThrow('Session ID is required')
    await expect(service.getSessionDocument('session-123')).rejects.toThrow('Document ID is required')

    expect(client.makeRequest).not.toHaveBeenCalled()
  })

  test('validates the create and document shapes', async () => {
    await expect(service.createSession({})).rejects.toThrow('customer_reference is required')
    await expect(service.createSession({
      customer_reference: 'customer-123',
      idempotency_key: 'request-123',
      requirements: ['UNKNOWN']
    })).rejects.toThrow('requirements must contain only')
    await expect(service.uploadSessionDocument('session-123', {
      filename: 'passport.jpg',
      content_type: 'image/jpeg',
      id_doc_type: 'PASSPORT',
      country: 'GBR'
    })).rejects.toThrow('Provide exactly one of file_name or content_base64')
    await expect(service.uploadSessionDocument('session-123', {
      filename: 'passport.jpg',
      content_type: 'image/jpeg',
      id_doc_type: 'PASSPORT',
      country: 'GBR',
      file_name: 'staged.jpg',
      content_base64: 'aGVsbG8='
    })).rejects.toThrow('Provide exactly one of file_name or content_base64')
  })
})

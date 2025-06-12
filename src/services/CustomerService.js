class CustomerService {
  constructor (client) {
    this.client = client
  }

  async create (customerData) {
    const requiredFields = ['first_name', 'last_name', 'type', 'email', 'country', 'id_type', 'id_number']
    for (const field of requiredFields) {
      if (!customerData[field]) {
        throw new Error(`${field} is required`)
      }
    }

    if (customerData.type === 'business' && !customerData.business_name) {
      throw new Error('business_name is required when type is business')
    }

    return this.client.makeRequest('POST', '/api/external/customer', customerData)
  }

  async list () {
    return this.client.makeRequest('GET', '/api/external/customer')
  }

  async get (customerId) {
    if (!customerId) {
      throw new Error('Customer ID is required')
    }
    return this.client.makeRequest('GET', `/api/external/customer/${customerId}`)
  }

  async update (customerId, updateData) {
    if (!customerId) {
      throw new Error('Customer ID is required')
    }
    return this.client.makeRequest('PUT', `/api/external/customer/${customerId}`, updateData)
  }

  async addKYC (customerId, kycData) {
    if (!customerId) {
      throw new Error('Customer ID is required')
    }
    return this.client.makeRequest('POST', `/api/external/customer/${customerId}/kyc-data`, kycData)
  }

  async uploadFiles (customerId, fileData) {
    if (!customerId) {
      throw new Error('Customer ID is required')
    }
    return this.client.makeRequest('PUT', `/api/external/customer/${customerId}/files`, fileData)
  }
}

module.exports = CustomerService

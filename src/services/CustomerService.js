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

  async uploadFileComplete (customerId, fileOptions) {
    if (!customerId) {
      throw new Error('Customer ID is required')
    }

    if (!fileOptions) {
      throw new Error('File options are required')
    }

    const { file, file_category } = fileOptions // eslint-disable-line camelcase
    let { filename, contentType } = fileOptions

    if (!file) {
      throw new Error('File is required')
    }

    if (!file_category) { // eslint-disable-line camelcase
      throw new Error('file_category is required')
    }

    if (!['identity', 'proof_of_address', 'liveness_check'].includes(file_category)) { // eslint-disable-line camelcase
      throw new Error('file_category must be one of: identity, proof_of_address, liveness_check')
    }

    try {
      const presignedResponse = await this.client.makeRequest('POST', '/api/external/file/get-presigned-url', {
        customer_id: customerId, // eslint-disable-line camelcase
        file_category // eslint-disable-line camelcase
      })

      const { url: presignedUrl, file_id } = presignedResponse.data.data // eslint-disable-line camelcase

      let fileBuffer
      if (Buffer.isBuffer(file)) {
        fileBuffer = file
      } else if (typeof file === 'string') {
        if (file.startsWith('data:')) {
          // Handle data URL format: data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=
          const base64Data = file.split(',')[1]
          fileBuffer = Buffer.from(base64Data, 'base64')

          // Extract content type from data URL if not provided
          if (!contentType) {
            const mimeMatch = file.match(/data:([^;]+)/)
            if (mimeMatch) {
              contentType = mimeMatch[1]
            }
          }
        } else if (file.startsWith('http://') || file.startsWith('https://')) {
          // Handle URL - download the file
          const downloadResult = await this._downloadFile(file)
          fileBuffer = downloadResult.buffer

          // Use detected content type if not provided
          if (!contentType && downloadResult.contentType) {
            contentType = downloadResult.contentType
          }

          // Use filename from URL if not provided
          if (!filename && downloadResult.filename) {
            filename = downloadResult.filename
          }
        } else {
          // Handle plain base64 string
          fileBuffer = Buffer.from(file, 'base64')
        }
      } else {
        // Handle Uint8Array or other array-like structures
        fileBuffer = Buffer.from(file)
      }

      await this._uploadToS3(presignedUrl, fileBuffer, contentType, filename)

      const fileAssociation = await this.client.makeRequest('PUT', `/api/external/customer/${customerId}/files`, {
        id_file: file_id // eslint-disable-line camelcase
      })

      return {
        ...fileAssociation,
        file_id, // eslint-disable-line camelcase
        presigned_url: presignedUrl
      }
    } catch (error) {
      throw new Error(`File upload failed: ${error.message}`)
    }
  }

  async _uploadToS3 (presignedUrl, fileBuffer, contentType, filename) {
    const https = require('https')
    const { URL } = require('url')

    return new Promise((resolve, reject) => {
      const url = new URL(presignedUrl)

      const headers = {
        'Content-Length': fileBuffer.length
      }

      if (contentType) {
        headers['Content-Type'] = contentType
      }

      if (filename) {
        headers['Content-Disposition'] = `attachment; filename="${filename}"`
      }

      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: 'PUT',
        headers
      }

      const req = https.request(options, (res) => {
        let responseData = ''

        res.on('data', (chunk) => {
          responseData += chunk
        })

        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({
              status: res.statusCode,
              data: responseData
            })
          } else {
            reject(new Error(`S3 upload failed with status ${res.statusCode}: ${responseData}`))
          }
        })
      })

      req.on('error', (error) => {
        reject(new Error(`S3 upload request failed: ${error.message}`))
      })

      req.write(fileBuffer)
      req.end()
    })
  }

  async _downloadFile (url) {
    const https = require('https')
    const http = require('http')
    const { URL } = require('url')
    const path = require('path')

    return new Promise((resolve, reject) => {
      const urlObj = new URL(url)
      const client = urlObj.protocol === 'https:' ? https : http

      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: 'GET',
        headers: {
          'User-Agent': 'Blaaiz-NodeJS-SDK/1.0.0'
        }
      }

      const req = client.request(options, (res) => {
        // Handle redirects
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return this._downloadFile(res.headers.location)
            .then(resolve)
            .catch(reject)
        }

        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`Failed to download file: HTTP ${res.statusCode}`))
          return
        }

        const chunks = []
        let totalLength = 0

        res.on('data', (chunk) => {
          chunks.push(chunk)
          totalLength += chunk.length
        })

        res.on('end', () => {
          const buffer = Buffer.concat(chunks, totalLength)

          // Extract content type from response headers
          const contentType = res.headers['content-type']

          // Extract filename from URL path or Content-Disposition header
          let filename = null

          // Try Content-Disposition header first
          const contentDisposition = res.headers['content-disposition']
          if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
            if (filenameMatch) {
              filename = filenameMatch[1].replace(/['"]/g, '')
            }
          }

          // Fallback to URL path
          if (!filename) {
            const urlPath = urlObj.pathname
            filename = path.basename(urlPath)

            // If no extension, try to add one based on content type
            if (!path.extname(filename) && contentType) {
              const ext = this._getExtensionFromContentType(contentType)
              if (ext) {
                filename += ext
              }
            }
          }

          resolve({
            buffer,
            contentType,
            filename
          })
        })
      })

      req.on('error', (error) => {
        reject(new Error(`File download failed: ${error.message}`))
      })

      req.setTimeout(30000, () => {
        req.destroy()
        reject(new Error('File download timeout'))
      })

      req.end()
    })
  }

  _getExtensionFromContentType (contentType) {
    const mimeToExt = {
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'image/bmp': '.bmp',
      'image/tiff': '.tiff',
      'application/pdf': '.pdf',
      'text/plain': '.txt',
      'application/msword': '.doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx'
    }

    return mimeToExt[contentType.split(';')[0]] || null
  }
}

module.exports = CustomerService

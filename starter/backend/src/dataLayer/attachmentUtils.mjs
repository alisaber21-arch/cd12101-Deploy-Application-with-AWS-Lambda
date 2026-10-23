import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { createLogger } from '../utils/logger.mjs'

const logger = createLogger('AttachmentUtils')

/**
 * I/O layer encapsulating all S3 interactions for TODO attachments.
 */
export class AttachmentUtils {
  constructor(
    s3Client = new S3Client(),
    bucketName = process.env.ATTACHMENT_S3_BUCKET,
    urlExpiration = parseInt(process.env.SIGNED_URL_EXPIRATION, 10) || 300
  ) {
    this.s3Client = s3Client
    this.bucketName = bucketName
    this.urlExpiration = urlExpiration
  }

  async getUploadUrl(todoId) {
    logger.info('Generating presigned upload URL', { todoId })

    return getSignedUrl(
      this.s3Client,
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: todoId
      }),
      { expiresIn: this.urlExpiration }
    )
  }

  getAttachmentUrl(todoId) {
    return `https://${this.bucketName}.s3.amazonaws.com/${todoId}`
  }
}

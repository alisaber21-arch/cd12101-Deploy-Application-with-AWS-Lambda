import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import {
  DynamoDBDocumentClient,
  GetCommand,
  UpdateCommand
} from '@aws-sdk/lib-dynamodb'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import createError from 'http-errors'
import { getUserId } from '../utils.mjs'
import { createLogger } from '../../utils/logger.mjs'

const logger = createLogger('generateUploadUrl')

const client = new DynamoDBClient()
const docClient = DynamoDBDocumentClient.from(client)
const s3Client = new S3Client()

const todosTable = process.env.TODOS_TABLE
const attachmentBucket = process.env.ATTACHMENT_S3_BUCKET
const urlExpiration = parseInt(process.env.SIGNED_URL_EXPIRATION, 10) || 300

export async function handler(event) {
  const todoId = event.pathParameters.todoId
  const userId = getUserId(event)

  const existingItem = await docClient.send(
    new GetCommand({
      TableName: todosTable,
      Key: { todoId }
    })
  )

  if (!existingItem.Item || existingItem.Item.userId !== userId) {
    logger.error('Todo not found or does not belong to user', { todoId, userId })
    throw createError(404, 'Todo not found')
  }

  const uploadUrl = await getSignedUrl(
    s3Client,
    new PutObjectCommand({
      Bucket: attachmentBucket,
      Key: todoId
    }),
    { expiresIn: urlExpiration }
  )

  const attachmentUrl = `https://${attachmentBucket}.s3.amazonaws.com/${todoId}`

  logger.info('Generated upload URL for todo', { todoId, userId })

  await docClient.send(
    new UpdateCommand({
      TableName: todosTable,
      Key: { todoId },
      UpdateExpression: 'set attachmentUrl = :attachmentUrl',
      ExpressionAttributeValues: {
        ':attachmentUrl': attachmentUrl
      }
    })
  )

  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({
      uploadUrl
    })
  }
}

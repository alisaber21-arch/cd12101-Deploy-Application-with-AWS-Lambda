import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb'
import { getUserId } from '../utils.mjs'
import { createLogger } from '../../utils/logger.mjs'

const logger = createLogger('getTodos')

const client = new DynamoDBClient()
const docClient = DynamoDBDocumentClient.from(client)

const todosTable = process.env.TODOS_TABLE
const userIdIndex = process.env.TODOS_USER_ID_INDEX

export async function handler(event) {
  const userId = getUserId(event)

  logger.info('Getting todos for user', { userId })

  const result = await docClient.send(
    new QueryCommand({
      TableName: todosTable,
      IndexName: userIdIndex,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      }
    })
  )

  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({
      items: result.Items
    })
  }
}

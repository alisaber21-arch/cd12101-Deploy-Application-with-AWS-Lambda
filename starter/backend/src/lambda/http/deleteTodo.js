import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import {
  DynamoDBDocumentClient,
  GetCommand,
  DeleteCommand
} from '@aws-sdk/lib-dynamodb'
import createError from 'http-errors'
import { getUserId } from '../utils.mjs'
import { createLogger } from '../../utils/logger.mjs'

const logger = createLogger('deleteTodo')

const client = new DynamoDBClient()
const docClient = DynamoDBDocumentClient.from(client)

const todosTable = process.env.TODOS_TABLE

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

  logger.info('Deleting todo item', { todoId, userId })

  await docClient.send(
    new DeleteCommand({
      TableName: todosTable,
      Key: { todoId }
    })
  )

  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*'
    },
    body: ''
  }
}


import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import {
  DynamoDBDocumentClient,
  GetCommand,
  UpdateCommand
} from '@aws-sdk/lib-dynamodb'
import createError from 'http-errors'
import { getUserId } from '../utils.mjs'
import { createLogger } from '../../utils/logger.mjs'

const logger = createLogger('updateTodo')

const client = new DynamoDBClient()
const docClient = DynamoDBDocumentClient.from(client)

const todosTable = process.env.TODOS_TABLE

export async function handler(event) {
  const todoId = event.pathParameters.todoId
  const updatedTodo = JSON.parse(event.body)
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

  logger.info('Updating todo item', { todoId, userId })

  await docClient.send(
    new UpdateCommand({
      TableName: todosTable,
      Key: { todoId },
      UpdateExpression: 'set #name = :name, dueDate = :dueDate, done = :done',
      ExpressionAttributeNames: {
        '#name': 'name'
      },
      ExpressionAttributeValues: {
        ':name': updatedTodo.name,
        ':dueDate': updatedTodo.dueDate,
        ':done': updatedTodo.done
      }
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

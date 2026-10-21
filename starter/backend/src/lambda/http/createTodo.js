import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb'
import { v4 as uuidv4 } from 'uuid'
import { getUserId } from '../utils.mjs'
import { createLogger } from '../../utils/logger.mjs'

const logger = createLogger('createTodo')

const client = new DynamoDBClient()
const docClient = DynamoDBDocumentClient.from(client)

const todosTable = process.env.TODOS_TABLE

export async function handler(event) {
  const newTodo = JSON.parse(event.body)
  const userId = getUserId(event)

  const todoId = uuidv4()
  const createdAt = new Date().toISOString()

  const newItem = {
    todoId,
    userId,
    createdAt,
    name: newTodo.name,
    dueDate: newTodo.dueDate,
    done: false
  }

  logger.info('Creating new todo item', { todoId, userId })

  await docClient.send(
    new PutCommand({
      TableName: todosTable,
      Item: newItem
    })
  )

  return {
    statusCode: 201,
    headers: {
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({
      item: newItem
    })
  }
}


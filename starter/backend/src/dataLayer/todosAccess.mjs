import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand
} from '@aws-sdk/lib-dynamodb'
import { createLogger } from '../utils/logger.mjs'

const logger = createLogger('TodosAccess')

/**
 * Data-access layer encapsulating all DynamoDB I/O for TODO items.
 */
export class TodosAccess {
  constructor(
    docClient = DynamoDBDocumentClient.from(new DynamoDBClient()),
    todosTable = process.env.TODOS_TABLE,
    userIdIndex = process.env.TODOS_USER_ID_INDEX
  ) {
    this.docClient = docClient
    this.todosTable = todosTable
    this.userIdIndex = userIdIndex
  }

  async createTodoItem(todoItem) {
    logger.info('Creating todo item in DynamoDB', { todoId: todoItem.todoId })

    await this.docClient.send(
      new PutCommand({
        TableName: this.todosTable,
        Item: todoItem
      })
    )

    return todoItem
  }

  async getTodosForUser(userId) {
    logger.info('Querying todos for user', { userId })

    const result = await this.docClient.send(
      new QueryCommand({
        TableName: this.todosTable,
        IndexName: this.userIdIndex,
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': userId
        }
      })
    )

    return result.Items
  }

  async getTodoItem(todoId) {
    const result = await this.docClient.send(
      new GetCommand({
        TableName: this.todosTable,
        Key: { todoId }
      })
    )

    return result.Item
  }

  async updateTodoItem(todoId, todoUpdate) {
    logger.info('Updating todo item in DynamoDB', { todoId })

    await this.docClient.send(
      new UpdateCommand({
        TableName: this.todosTable,
        Key: { todoId },
        UpdateExpression: 'set #name = :name, dueDate = :dueDate, done = :done',
        ExpressionAttributeNames: {
          '#name': 'name'
        },
        ExpressionAttributeValues: {
          ':name': todoUpdate.name,
          ':dueDate': todoUpdate.dueDate,
          ':done': todoUpdate.done
        }
      })
    )
  }

  async deleteTodoItem(todoId) {
    logger.info('Deleting todo item from DynamoDB', { todoId })

    await this.docClient.send(
      new DeleteCommand({
        TableName: this.todosTable,
        Key: { todoId }
      })
    )
  }

  async updateAttachmentUrl(todoId, attachmentUrl) {
    logger.info('Updating todo attachment URL', { todoId })

    await this.docClient.send(
      new UpdateCommand({
        TableName: this.todosTable,
        Key: { todoId },
        UpdateExpression: 'set attachmentUrl = :attachmentUrl',
        ExpressionAttributeValues: {
          ':attachmentUrl': attachmentUrl
        }
      })
    )
  }
}

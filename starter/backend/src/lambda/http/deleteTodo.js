import middy from '@middy/core'
import httpErrorHandler from '@middy/http-error-handler'
import cors from '@middy/http-cors'
import { getUserId } from '../utils.mjs'
import { deleteTodo } from '../../businessLogic/todos.mjs'

async function deleteTodoHandler(event) {
  const todoId = event.pathParameters.todoId
  const userId = getUserId(event)

  await deleteTodo(userId, todoId)

  return {
    statusCode: 200,
    body: ''
  }
}

export const handler = middy(deleteTodoHandler)
  .use(cors())
  .use(httpErrorHandler())


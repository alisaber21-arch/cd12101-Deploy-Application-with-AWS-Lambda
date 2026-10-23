import middy from '@middy/core'
import httpErrorHandler from '@middy/http-error-handler'
import cors from '@middy/http-cors'
import createError from 'http-errors'
import { getUserId } from '../utils.mjs'
import { updateTodo } from '../../businessLogic/todos.mjs'

async function updateTodoHandler(event) {
  const todoId = event.pathParameters.todoId
  const userId = getUserId(event)

  let updatedTodo
  try {
    updatedTodo = JSON.parse(event.body)
  } catch (e) {
    throw createError(400, 'Invalid JSON in request body')
  }

  await updateTodo(userId, todoId, updatedTodo)

  return {
    statusCode: 200,
    body: ''
  }
}

export const handler = middy(updateTodoHandler)
  .use(cors())
  .use(httpErrorHandler())

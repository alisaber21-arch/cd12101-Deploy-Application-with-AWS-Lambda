import middy from '@middy/core'
import httpErrorHandler from '@middy/http-error-handler'
import cors from '@middy/http-cors'
import createError from 'http-errors'
import { getUserId } from '../utils.mjs'
import { createTodo } from '../../businessLogic/todos.mjs'

async function createTodoHandler(event) {
  const userId = getUserId(event)

  let newTodo
  try {
    newTodo = JSON.parse(event.body)
  } catch (e) {
    throw createError(400, 'Invalid JSON in request body')
  }

  const item = await createTodo(userId, newTodo)

  return {
    statusCode: 201,
    body: JSON.stringify({ item })
  }
}

export const handler = middy(createTodoHandler)
  .use(cors())
  .use(httpErrorHandler())


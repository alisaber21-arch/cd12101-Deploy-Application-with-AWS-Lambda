import middy from '@middy/core'
import httpErrorHandler from '@middy/http-error-handler'
import cors from '@middy/http-cors'
import { getUserId } from '../utils.mjs'
import { getTodosForUser } from '../../businessLogic/todos.mjs'

async function getTodosHandler(event) {
  const userId = getUserId(event)
  const items = await getTodosForUser(userId)

  return {
    statusCode: 200,
    body: JSON.stringify({ items })
  }
}

export const handler = middy(getTodosHandler)
  .use(cors())
  .use(httpErrorHandler())

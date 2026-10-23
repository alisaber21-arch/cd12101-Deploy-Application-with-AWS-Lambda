import middy from '@middy/core'
import httpErrorHandler from '@middy/http-error-handler'
import cors from '@middy/http-cors'
import { getUserId } from '../utils.mjs'
import { createAttachmentPresignedUrl } from '../../businessLogic/todos.mjs'

async function generateUploadUrlHandler(event) {
  const todoId = event.pathParameters.todoId
  const userId = getUserId(event)

  const uploadUrl = await createAttachmentPresignedUrl(userId, todoId)

  return {
    statusCode: 200,
    body: JSON.stringify({ uploadUrl })
  }
}

export const handler = middy(generateUploadUrlHandler)
  .use(cors())
  .use(httpErrorHandler())

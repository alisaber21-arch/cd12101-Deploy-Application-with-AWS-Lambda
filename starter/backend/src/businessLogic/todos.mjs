import createError from 'http-errors'
import { v4 as uuidv4 } from 'uuid'
import { TodosAccess } from '../dataLayer/todosAccess.mjs'
import { AttachmentUtils } from '../dataLayer/attachmentUtils.mjs'
import { createLogger } from '../utils/logger.mjs'

const logger = createLogger('businessLogic/todos')

const todosAccess = new TodosAccess()
const attachmentUtils = new AttachmentUtils()

/**
 * Business-logic layer: TODO rules, ownership enforcement and input validation.
 * No direct AWS SDK calls happen here - all I/O goes through the data layer.
 */

export async function getTodosForUser(userId) {
  return todosAccess.getTodosForUser(userId)
}

export async function createTodo(userId, createTodoRequest) {
  validateTodoFields(createTodoRequest)

  const todoId = uuidv4()
  const createdAt = new Date().toISOString()

  const newItem = {
    todoId,
    userId,
    createdAt,
    name: createTodoRequest.name,
    dueDate: createTodoRequest.dueDate,
    done: false
  }

  logger.info('Creating new todo', { todoId, userId })

  return todosAccess.createTodoItem(newItem)
}

export async function updateTodo(userId, todoId, updateTodoRequest) {
  validateTodoFields(updateTodoRequest, { requireDone: true })
  await getOwnedTodoOrThrow(userId, todoId)

  logger.info('Updating todo', { todoId, userId })

  await todosAccess.updateTodoItem(todoId, {
    name: updateTodoRequest.name,
    dueDate: updateTodoRequest.dueDate,
    done: updateTodoRequest.done
  })
}

export async function deleteTodo(userId, todoId) {
  await getOwnedTodoOrThrow(userId, todoId)

  logger.info('Deleting todo', { todoId, userId })

  await todosAccess.deleteTodoItem(todoId)
}

export async function createAttachmentPresignedUrl(userId, todoId) {
  await getOwnedTodoOrThrow(userId, todoId)

  const uploadUrl = await attachmentUtils.getUploadUrl(todoId)
  const attachmentUrl = attachmentUtils.getAttachmentUrl(todoId)

  logger.info('Generated upload URL for todo', { todoId, userId })

  await todosAccess.updateAttachmentUrl(todoId, attachmentUrl)

  return uploadUrl
}

async function getOwnedTodoOrThrow(userId, todoId) {
  const item = await todosAccess.getTodoItem(todoId)

  if (!item || item.userId !== userId) {
    logger.error('Todo not found or does not belong to user', { todoId, userId })
    throw createError(404, 'Todo not found')
  }

  return item
}

function validateTodoFields(request, { requireDone = false } = {}) {
  if (!request || typeof request !== 'object') {
    throw createError(400, 'Request body is required')
  }

  if (typeof request.name !== 'string' || request.name.trim().length === 0) {
    throw createError(
      400,
      'Field "name" is required and must be a non-empty string'
    )
  }

  if (typeof request.dueDate !== 'string' || isNaN(Date.parse(request.dueDate))) {
    throw createError(
      400,
      'Field "dueDate" is required and must be a valid date string'
    )
  }

  if (requireDone && typeof request.done !== 'boolean') {
    throw createError(400, 'Field "done" is required and must be a boolean')
  }
}

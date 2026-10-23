import jsonwebtoken from 'jsonwebtoken'
import jwksClient from 'jwks-rsa'
import { createLogger } from '../../utils/logger.mjs'

const logger = createLogger('auth')

const jwksUrl = 'https://dev-mbiuf40w8uhpnh4y.us.auth0.com/.well-known/jwks.json'

const client = jwksClient({
  jwksUri: jwksUrl
})

export async function handler(event) {
  try {
    const jwtToken = await verifyToken(event.authorizationToken)

    return {
      principalId: jwtToken.sub,
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'execute-api:Invoke',
            Effect: 'Allow',
            Resource: '*'
          }
        ]
      }
    }
  } catch (e) {
    logger.error('User not authorized', { error: e.message })

    return {
      principalId: 'user',
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'execute-api:Invoke',
            Effect: 'Deny',
            Resource: '*'
          }
        ]
      }
    }
  }
}

async function verifyToken(authHeader) {
  const token = getToken(authHeader)
  const jwt = jsonwebtoken.decode(token, { complete: true })

  if (!jwt || !jwt.header || !jwt.header.kid) {
    throw new Error('Invalid token: missing key id (kid)')
  }

  const signingKey = await getSigningKey(jwt.header.kid)

  return jsonwebtoken.verify(token, signingKey, { algorithms: ['RS256'] })
}

function getSigningKey(kid) {
  return new Promise((resolve, reject) => {
    client.getSigningKey(kid, (err, key) => {
      if (err) {
        reject(err)
        return
      }

      resolve(key.getPublicKey())
    })
  })
}

function getToken(authHeader) {
  if (!authHeader) throw new Error('No authentication header')

  if (!authHeader.toLowerCase().startsWith('bearer '))
    throw new Error('Invalid authentication header')

  const split = authHeader.split(' ')
  const token = split[1]

  return token
}

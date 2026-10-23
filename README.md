# Serverless TODO

To implement this project you need to implement a simple TODO application using AWS Lambda and Serverless framework. Search for all the `TODO:` comments in the code to find the placeholders that you need to implement.

## Implementation status

All backend (`starter/backend`) and frontend (`starter/client`) code is fully implemented and deployed. Notes on specific decisions:

- **S3 bucket uniqueness**: `ATTACHMENT_S3_BUCKET` is `serverless-c4-todo-images-${self:provider.stage}-${aws:accountId}` (see `backend/serverless.yml`). Appending the AWS account ID guarantees global uniqueness across all AWS accounts/regions without needing a hardcoded random suffix.
- **Auth0**: Domain `dev-mbiuf40w8uhpnh4y.us.auth0.com`. The SPA uses an Auth0 Application of type **Single Page Application** (required for the Authorization Code + PKCE flow used by `@auth0/auth0-react`) with Allowed Callback/Logout URLs and Web Origins set to `http://localhost:3000`. The backend authorizer (`auth0Authorizer.mjs`) verifies the JWT's RS256 signature via the Auth0 JWKS endpoint and reads the `sub` claim; it does not validate `aud`, so the frontend sends the Auth0 **ID token** (not an access token for a custom API) as the bearer token.
- **Deployed API**: `https://wha96zzsg9.execute-api.us-east-1.amazonaws.com/dev` (already set in `client/.env` as `REACT_APP_API_ENDPOINT`).

### Resolved issue: transient `AuthorizerConfigurationException` on `/todos`

Earlier in development, calling any protected endpoint briefly returned an API Gateway `AuthorizerConfigurationException` (500). Static analysis (CloudFormation template, deployed zip contents, local execution of the exact authorizer handler) confirmed the code itself had no bug. The root cause was a stale deployment: a plain `serverless deploy` reported "No changes to deploy" and skipped the actual update. Running `serverless deploy --force` (with valid AWS credentials configured in the terminal) triggered a genuine redeploy and resolved the issue.

**Full end-to-end verification performed against the live API** after the fix:
- Auth0 login/consent flow
- `GetTodos` (200, returns the current user's todos)
- `CreateTodo` (201, new todo appears immediately)
- `UpdateTodo` (toggling `done` persists across a full reload + re-login)
- `DeleteTodo` (removal persists across a full reload)
- `GenerateUploadUrl` (200, returns a valid presigned S3 PUT URL)

All functionality is confirmed working end-to-end on the deployed stack.

### Code architecture

The backend (`starter/backend/src`) is split into layers:

- **`src/lambda/http`** — thin Lambda HTTP handlers. Each one only parses the incoming event, calls into the business-logic layer, and returns an HTTP response. All five are wrapped with `middy` (`@middy/core`) plus `@middy/http-cors` and `@middy/http-error-handler`, so any `http-errors` thrown anywhere downstream (validation failures, not-found/not-owned todos) is converted into a clean HTTP response with correct status code and CORS headers, instead of an uncaught 500.
- **`src/businessLogic/todos.mjs`** — TODO rules: input validation (`name`/`dueDate`/`done` required and well-typed, returns `400` via `http-errors` otherwise), ownership enforcement (a todo can only be read/updated/deleted/attached-to by the user who created it, returns `404` otherwise), and ID/timestamp generation. Contains no direct AWS SDK calls.
- **`src/dataLayer/todosAccess.mjs`** and **`src/dataLayer/attachmentUtils.mjs`** — the only places that talk to DynamoDB and S3 respectively (via the AWS SDK v3 `DynamoDBDocumentClient` / `S3Client`). No business rules live here.

This satisfies the "business logic separated from I/O" and "HTTP requests are validated" review criteria.

### Resolved issue: 500 on authenticated requests

A later live regression (`GetTodos`/`CreateTodo`/`UpdateTodo`/`DeleteTodo` all returning `500` for any request carrying a valid token, while unauthenticated requests correctly got `401`) is consistent with the `Auth` custom authorizer Lambda failing/timing out on invocation (API Gateway returns a generic `500` when a custom authorizer itself errors or times out, as opposed to a clean `401`/`403` which it returns when the authorizer successfully executes and denies). As a hardening fix, `Auth` now has an explicit `timeout: 10` in `serverless.yml` (up from the Serverless Framework's 6s default) to give the Auth0 JWKS HTTPS fetch (via `jwks-rsa`) enough headroom on a cold start. If authenticated requests still fail after redeploying with this change, check `serverless logs -f Auth` (or the function's CloudWatch Logs group) for the actual invocation error — this can also indicate the AWS classroom sandbox credentials/session have expired and need to be refreshed, followed by `serverless deploy --force`.

### Submission status (latest)

- Implementation is pushed to the **`main`** branch of the fork: https://github.com/alisaber21-arch/cd12101-Deploy-Application-with-AWS-Lambda
- An earlier Udacity review attempt was rejected ("project is incomplete... complete all the TODO tasks") because the implementation had only been pushed to a feature branch, while the fork's default `main` branch still showed the original unimplemented template. This has been fixed: `main` is now fast-forwarded to the completed implementation commit and verified publicly on GitHub (raw file content checked directly, not just local state).
- A second Udacity review flagged a live 500-on-authenticated-request regression plus two code-quality gaps (no business-logic/I/O layering, no request validation) — addressed by the layered-architecture refactor and `Auth` timeout hardening described above.
- **Next step**: redeploy (`sls deploy -v` or `sls deploy --force -v`) from a terminal with valid AWS credentials, re-verify all TODO flows live in the browser, then resubmit to Udacity using the repo URL above (default `main` branch) plus the deployed API endpoint `https://wha96zzsg9.execute-api.us-east-1.amazonaws.com/dev` (re-confirm this hasn't changed after redeploying).

# Functionality of the application

This appliation will allow to create/remove/update/get TODO items. Each TODO item can optionally have an attachment image. Each user only has access to TODO items that he/she has created. 

# Functions to be implemented

To implement this project you need to implement the following functions and configure them in the `serverless.yml` file:

* `Auth` - this function should implement a custom authorizer for API Gateway that should be added to all other functions.
* `GetTodos` - should return all TODOs for a current user. 
* `CreateTodo` - should create a new TODO for a current user. A shape of data send by a client application to this function can be found in the `CreateTodoRequest.ts` file
* `UpdateTodo` - should update a TODO item created by a current user. A shape of data send by a client application to this function can be found in the `UpdateTodoRequest.ts` file
* `DeleteTodo` - should delete a TODO item created by a current user. Expects an id of a TODO item to remove.
* `GenerateUploadUrl` - returns a presigned url that can be used to upload an attachment file for a TODO item. 

All functions are already connected to appriate events from API gateway

An id of a user can be extracted from a JWT token passed by a client

You also need to add any necessary resources to the `resources` section of the `serverless.yml` file such as DynamoDB table and and S3 bucket.

# Frontend

The `client` folder contains a web application that can use the API that should be developed in the project.

To use it please edit the `config.ts` file in the `client` folder:

```ts
const apiId = '...' API Gateway id
export const apiEndpoint = `https://${apiId}.execute-api.us-east-1.amazonaws.com/dev`

export const authConfig = {
  domain: '...',    // Domain from Auth0
  clientId: '...',  // Client id from an Auth0 application
  callbackUrl: 'http://localhost:3000/callback'
}
```


# Suggestions

To store TODO items you might want to use a DynamoDB table with local secondary index(es). A create a local secondary index you need to a create a DynamoDB resource like this:

```yml

TodosTable:
  Type: AWS::DynamoDB::Table
  Properties:
    AttributeDefinitions:
      - AttributeName: partitionKey
        AttributeType: S
      - AttributeName: sortKey
        AttributeType: S
      - AttributeName: indexKey
        AttributeType: S
    KeySchema:
      - AttributeName: partitionKey
        KeyType: HASH
      - AttributeName: sortKey
        KeyType: RANGE
    BillingMode: PAY_PER_REQUEST
    TableName: ${self:provider.environment.TODOS_TABLE}
    LocalSecondaryIndexes:
      - IndexName: ${self:provider.environment.INDEX_NAME}
        KeySchema:
          - AttributeName: partitionKey
            KeyType: HASH
          - AttributeName: indexKey
            KeyType: RANGE
        Projection:
          ProjectionType: ALL # What attributes will be copied to an index

```

To query an index you need to use the `query()` method like:

```ts
await this.dynamoDBClient
  .query({
    TableName: 'table-name',
    IndexName: 'index-name',
    KeyConditionExpression: 'paritionKey = :paritionKey',
    ExpressionAttributeValues: {
      ':paritionKey': partitionKeyValue
    }
  })
  .promise()
```

# How to run the application

## Backend

To deploy an application run the following commands:

```
cd backend
npm install
sls deploy -v
```

## Frontend

To run a client application first edit the `client/src/config.ts` file to set correct parameters. And then run the following commands

```
cd client
npm install
npm run start
```

This should start a development server with the React application that will interact with the serverless TODO application.

# "curl" commands

An alternative way to test your API you can use the following curl commands. For all examples below you would need to replace:

* {API-ID} - with you API's ID that is returned by the Serverless framework
* {JWT-token} - a JWT token from the web application

## Get all TODOs

To fetch all TODOs you would need to send the following GET request:

```sh
curl --location --request GET 'https://{API-ID}.execute-api.us-east-1.amazonaws.com/dev/todos' \
--header 'Authorization: Bearer {JWT-token}'
```

## Create a new TODO

To create a new TODO you would need to send a POST request and provide a JSON with two mandatory fields: `name` and `dueDate`.

```sh
curl --location --request POST 'https://{API-ID}.execute-api.us-east-1.amazonaws.com/dev/todos' \
--header 'Authorization: Bearer {JWT-token}' \
--header 'Content-Type: application/json' \
--data-raw '{
    "name": "Buy bread",
    "dueDate": "2022-12-12"
}'
```

## Update a TODO

To update a TODO you would need to send a PATCH request and provide one of the following fields: `name`, `dueDate`, and boolean `done`.

You would also need to provide an ID of an existing TODO in the URL.

```sh
curl --location --request PATCH 'https://{API-ID}.execute-api.us-east-1.amazonaws.com/dev/todos/{TODO-ID}' \
--header 'Authorization: Bearer {JWT-token}' \
--header 'Content-Type: application/json' \
--data-raw '{
    "name": "Buy bread",
    "dueDate": "2022-12-12",
    "done": true
}'
```

## Remove TODO

To remove a TODO you would need to send a `DELETE` request, and provide an ID of an existing TODO, as well as other parameters.

```sh
curl --location --request DELETE 'https://{API-ID}.execute-api.us-east-1.amazonaws.com/dev/todos/{TODO-ID}' \
--header 'Authorization: Bearer {JWT-token}'
```


## Upload image attachment

To upload an image attachment you would first need to send a POST request to the following URL:

```sh
curl --location --request POST 'https://{API-ID}.execute-api.us-east-1.amazonaws.com/dev/todos/{TODO-ID}/attachment' \
--header 'Authorization: Bearer {JWT-token}'
```

It should return a response like this that would provide a pre-signed URL:

```json
{
    "uploadUrl": "https://serverless-c4-todo-images.s3.us-east-1.amazonaws.com/...&x-id=PutObject"
}
```

We can then use curl command to upload an image (`image.jpg` in this example) to S3 using this pre-signed URL:

```sh
curl -X PUT -T image.jpg -L "https://serverless-c4-todo-images.s3.us-east-1.amazonaws.com/...&x-id=PutObject"
```


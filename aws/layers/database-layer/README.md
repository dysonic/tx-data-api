# Database Layer

A Lambda layer for the Postgres DB connection.

It utilises [AWS Parameters and Secrets Lambda Extension](https://docs.aws.amazon.com/secretsmanager/latest/userguide/retrieving-secrets_lambda.html) to access a secret that contains the DB credentials.

## Enviroment Variables

`DB_SECRET_ID` - The ID of the AWS secret that contains the database connection information.

It expects the following key/value pairs:

| Key | Description |
| --- | --- |
| host | DB host |
| post | DB port |
| user | DB username |
| password | DB password |
| database | DB database |

## Deployment

1. `npm install`

## Usage

```
import database from '/opt/nodejs/node_modules/database/index.js'
const { getDbCredentials, connectDb } = database

const credentials = await getDbCredentials()
const client = await connectDb(credentials)
```

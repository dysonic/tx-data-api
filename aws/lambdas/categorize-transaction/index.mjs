import querystring from 'querystring'
import pg from 'pg'
import { nanoid } from 'nanoid'
import axios from 'axios'

const { Client } = pg


// AWS Parameters and Secrets Lambda Extension
const getDbCredentials = async () => {
  const headers = { 'X-Aws-Parameters-Secrets-Token': process.env['AWS_SESSION_TOKEN'] }
  const port = process.env['PARAMETERS_SECRETS_EXTENSION_HTTP_PORT'] || 2773
  const secretId = querystring.escape('dev/txData/postgres')
  try {
    const url = 'http://localhost:' + port + '/secretsmanager/get?secretId=' + secretId
    // console.log('url:', url)
    const res = await axios.get(url, { headers })
    // console.log('res.data:', res.data)    
    return JSON.parse(res.data.SecretString)
  } catch (e) {
    console.error('ERROR: Could not get DB secret')
    console.error(e)
    throw e
  }
}

const connectDb = async (credentials) => {
  try {
    const client = new Client(credentials)
    await client.connect()
    return client
  } catch (e) {
    console.error('ERROR: Could not connect to PostgreSQL instance')
    console.error(e)
    throw e
  }
}

console.log('Loading function')

export const handler = async (event, context) => {
  try {
    const data = JSON.parse(event.body)
    const { transactions, newCategory, categoryId = nanoid(7) } = data
    await categorizeTransactionsToDB(transactions, categoryId, newCategory)
    const catgeory = { id: categoryId, label: newCategory }
    if (newCategory) {
      return {
        statusCode: 200,
        headers: {
            "content-type" : "application/json; charset=utf-8",
        },
        body: JSON.stringify({ catgeory }),
      } 
    }
    return {
      statusCode: 204,
    } 
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error }),
    }
  }
}

export const insertCategory = async (client, id, label) => {
  const text = 'INSERT INTO category (id, label) VALUES($1, $2)'
  const values = [id, label]
  await client.query(text, values)
}

export const categorizeTransaction = async (client, txId, categoryId) => {
  const text = 'UPDATE transaction SET category_id = $1 WHERE id = $2'
  const values = [categoryId, txId]
  await client.query(text, values)
}

export const categorizeTransactionsToDB = async (transactions, categoryId, newCategory) => {
  const credentials = await getDbCredentials()
  const client = await connectDb(credentials)
  try {
    await client.query('BEGIN')
    if (newCategory) {
      await insertCategory(client, categoryId, newCategory)
    }
    
    console.log('> categorize txs')
    for (let i = 0; i < transactions.length; i++) {
      
      const txId = transactions[i]
      await categorizeTransaction(client, txId, categoryId)
    }

    await client.query('COMMIT')
  } catch (e) {
    console.error(e)
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.end()
  }
}

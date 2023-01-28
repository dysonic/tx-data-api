import pg from 'pg'
import { nanoid } from 'nanoid'

const { Client } = pg

const txLimit = 200

// node-postgres uses the same environment variables as libpq and psql to connect to a PostgreSQL server.
// @see https://node-postgres.com/features/connecting#environment-variables

// PGUSER: PostgreSQL username to connect as
// PGHOST: The name of the server host to connect to
// PGPASSWORD: The password of the PostgreSQL server
// PGDATABASE: The name of the database you are connecting to
// PGPORT: The port number to connect to at the server host

const connectDb = async () => {
  try {
    const client = new Client()
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
  await client.query(text)
}

export const categorizeTransactionsToDB = async (transactions, categoryId, newCategory) => {
  const client = await connectDb()

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

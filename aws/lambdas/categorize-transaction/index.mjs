import database from '/opt/nodejs/node_modules/database/index.js'
import querystring from 'querystring'
import { nanoid } from 'nanoid'

const { getDbCredentials, connectDb } = database

console.log('Loading function')

export const handler = async (event, context) => {
  try {
    const data = JSON.parse(event.body)
    const { transactions, newCategory, categoryId = nanoid(7) } = data
    await categorizeTransactionsToDB(transactions, categoryId, newCategory)
    const category = { id: categoryId, label: newCategory }
    if (newCategory) {
      return {
        statusCode: 200,
        headers: {
            "content-type" : "application/json; charset=utf-8",
        },
        body: JSON.stringify({ category }),
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
  let client
  try {
    const credentials = await getDbCredentials()
    client = await connectDb(credentials)
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
    client && client.end()
  }
}

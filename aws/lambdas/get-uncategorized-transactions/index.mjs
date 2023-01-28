import pg from 'pg'

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
    const data = await getTransactionsAndMeta()
    return {
      statusCode: 200,
      headers: {
          "content-type" : "application/json; charset=utf-8",
      },
      body: JSON.stringify(data),
    } 
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error }),
    }
  }
}

const getMetaInfo = async (client) => {
  let numberOfTransactions = 0
  let numberOfUncategorizedTransactions = 0
  let totalSpending = 0.00
  let uncategorizedSpending = 0.00
  
  let text = 'SELECT COUNT(*) FROM transaction'
  let res = await client.query(text)
  // console.log('res:', res)
  numberOfTransactions = res.rows[0].count
  
  text = 'SELECT COUNT(*) FROM transaction WHERE category_id IS NULL'
  res = await client.query(text)
  // console.log('res:', res)
  numberOfUncategorizedTransactions = res.rows[0].count
  
  // text = 'SELECT SUM(ABS(amount)) FROM transaction'
  // res = await client.query(text)
  // totalSpending = res.rows[0].id
  
  // text = 'SELECT SUM(ABS(amount)) FROM transaction WHERE category_id IS NULL'
  // res = await client.query(text)
  // uncategorizedSpending = res.rows[0].id
  
  return {
    numberOfTransactions,
    numberOfUncategorizedTransactions,
    totalSpending,
    uncategorizedSpending,
  }
}

export const getUncategorizedTransactions = async (client) => {
  const text =
    `SELECT id, third_party_tx_id, date_posted, amount, description, notes, type FROM transaction WHERE category_id IS NULL ORDER BY date_posted DESC LIMIT ${txLimit}`
  const res = await client.query(text)
  // console.log(res)
  return res.rows
}

export const getTransactionsAndMeta = async () => {
  let client
  try {
    client = await connectDb()
    
    // See if we have an existing bank account
    const meta = await getMetaInfo(client)
    const transactions = await getUncategorizedTransactions(client)
    meta.isMore = meta.numberOfUncategorizedTransactions > txLimit
    return {
      meta,
      transactions,
    }
  } catch (e) {
    console.error(e)
    throw e
  } finally {
    client && client.end()
  }
}

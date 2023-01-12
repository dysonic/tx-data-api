import pg from 'pg'

const { Client } = pg

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
      body: data,
    } 
  } catch (error) {
    console.log(error)
    return {
      statusCode: 500,
      body: {
        error,
      },
    }
  }
}

const getUncategorizedTransactionCount = x;async (client) => {
  const text = 'SELECT COUNT(*) FROM transactions'
  const res = await client.query(text)
  if (res.rowCount) {
    return res.rows[0].id
  }
  return 0
}

export const getUncategorizedTransactions = async (client) => {
  const text =
    'SELECT id, third_party_tx_id, date_posted, amount, description, notes, type FROM transaction ORDER BY date_posted DESC LIMIT 50'
  const res = await client.query(text)
  // console.log(res)
  return res.rows
}

export const getTransactionsAndMeta = async () => {
  const client = await connectDb()
  
  try {
    // See if we have an existing bank account
    const numberOfUncategorizedTransactions = await getUncategorizedTransactionCount(client)
    const transactions = await getUncategorizedTransactions(client)
    const isMore = numberOfUncategorizedTransactions > transactions.length
    return {
      meta: {
        isMore,
        numberOfUncategorizedTransactions,
      }
      transactions,
    }
  } catch (e) {
    console.error(e)
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.end()
  }
}

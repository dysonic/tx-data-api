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

export const getUncategorizedTransactions = async (client: pg.Client) => {
  const text =
    'SELECT id, third_party_tx_id, date_posted, amount, description, notes, type FROM transaction ORDER BY date_posted DESC LIMIT 25'
  const res = await client.query(text)
  // console.log(res)
  return res.rows
}

export const findAll = async (options: {
  page: number
  category: null | string
}) => {
  const { page, category } = options
  console.log('findAll - page:', page, 'category:', category)
  const client = await connectDb()
  let transactions
  try {
    if (category === 'none') {
      const transactions = await getUncategorizedTransactions(client)
      console.log('txs:', transactions)
      return transactions
    }
  } catch (e) {
    console.error(e)
    throw e
  } finally {
    client.end()
  }
}

import database from '/opt/nodejs/node_modules/database/index.js'

const { getDbCredentials, connectDb } = database

console.log('Loading function')

export const handler = async (event, context) => {
  try {
    const data = JSON.parse(event.body)
    const { transactions, isExcluded } = data
    await toggleTransactionExclusionToDB(transactions, isExcluded)
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

export const toggleTransactionExclusion = async (client, txId, isExcluded) => {
  const text = 'UPDATE transaction SET is_excluded = $1 WHERE id = $2'
  const values = [isExcluded, txId]
  await client.query(text, values)
}

export const toggleTransactionExclusionToDB = async (transactions, isExcluded) => {
  console.log('transactions:', transactions, 'isExcluded:', isExcluded)
  let client
  try {
    const credentials = await getDbCredentials()
    console.log('credentials')
    client = await connectDb(credentials)
    console.log('connection ok')
    await client.query('BEGIN')

    console.log('> toggle txs')
    for (let i = 0; i < transactions.length; i++) {
      const txId = transactions[i]
      await toggleTransactionExclusion(client, txId, isExcluded)
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

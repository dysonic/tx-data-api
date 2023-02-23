import database from '/opt/nodejs/node_modules/database/index.js'
const { getDbCredentials, connectDb } = database


const txLimit = 200

console.log('Loading function')

export const handler = async (event, context) => {
  try {
    // console.log('event:', event)
    const include = event.queryStringParameters?.include
    const includeCategories = include === 'categories'
    const data = await getTransactionsAndMeta(includeCategories)
    return {
      statusCode: 200,
      headers: {
          "content-type" : "application/json; charset=utf-8",
      },
      body: JSON.stringify(data),
    } 
  } catch (error) {
    console.error(error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error }),
    }
  }
}

const getCategories = async (client) => {
  const text = 'SELECT id, label FROM category'
  const res = await client.query(text)
  return res.rows
}

const getMetaInfo = async (client) => {
  let txTotal = 0
  let txUncategorized = 0
  // let totalSpending = 0.00
  // let uncategorizedSpending = 0.00
  
  let text = 'SELECT COUNT(*) FROM transaction'
  let res = await client.query(text)
  // console.log('res:', res)
  txTotal = Number(res.rows[0].count)
  
  text = 'SELECT COUNT(*) FROM transaction WHERE category_id IS NULL'
  res = await client.query(text)
  // console.log('res:', res)
  txUncategorized = Number(res.rows[0].count)
  
  // text = 'SELECT SUM(ABS(amount)) FROM transaction'
  // res = await client.query(text)
  // totalSpending = res.rows[0].id
  
  // text = 'SELECT SUM(ABS(amount)) FROM transaction WHERE category_id IS NULL'
  // res = await client.query(text)
  // uncategorizedSpending = res.rows[0].id
  
  return {
    txTotal,
    txUncategorized,
    // totalSpending,
    // uncategorizedSpending,
  }
}

export const mapDbTxToTransaction = (dbTx) => {
  const {
    id,
    third_party_tx_id: thirdPartyTxId,
    date_posted: dbDatePosted,
    amount: dbAmount,
    description,
    notes,
    type,
    bank_account_id: bankAccountId,
  } = dbTx
  const datePosted = new Date(dbDatePosted)
  const amount = Math.abs(Number(dbAmount.replace('$', '')))
  return {
    id,
    thirdPartyTxId,
    datePosted,
    amount,
    description,
    notes,
    type,
    bankAccountId,
  }
}

export const getUncategorizedTransactions = async (client) => {
  const text =
    `SELECT id, third_party_tx_id, date_posted, amount, description, notes, type FROM transaction WHERE category_id IS NULL ORDER BY date_posted DESC LIMIT ${txLimit}`
  const res = await client.query(text)
  // console.log(res)
  return res.rows
    .map(mapDbTxToTransaction)
}

export const getTransactionsAndMeta = async (includeCategories) => {
  let client
  try {
    const credentials = await getDbCredentials()
    client = await connectDb(credentials)
  
    const meta = await getMetaInfo(client)
    const transactions = await getUncategorizedTransactions(client)
    meta.isMore = meta.numberOfUncategorizedTransactions > txLimit
    const json = {
      meta,
      transactions,
    }
    
    if (includeCategories) {
      json.categories = await getCategories(client)
    }
    
    return json
  } catch (e) {
    console.error(e)
    throw e
  } finally {
    client && client.end()
  }
}

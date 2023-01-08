import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import ofx from 'ofx'
import pg from 'pg'
import { nanoid } from 'nanoid'

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

const parseEvent = event => {
  const bucket = event.Records[0].s3.bucket.name
  const key = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '))
  return {
    bucket,
    key,
  }
}

console.log('Loading function')

const dateRegex = /^(\d{4})(\d{2})(\d{2})$/

const isoDate = dateStr => {
  const matches = dateRegex.exec(dateStr)
  if (matches) {
    const [, year, month, day] = matches
    return `${year}-${month}-${day}`
  }
  return dateStr
}

export const handler = async (event, context) => {
  // const s3Region = 'ap-southeast-2' // Sydney
  const s3Region = 'us-west-1' // US West (N. California)
  
  let data
  let error
  let response
  
  // Get raw data from OFX file
  const { bucket, key } = parseEvent(event)
  try {
    console.log(`Getting object '${key}' from S3 bucket '${bucket}' in '${s3Region}''.`)
    data = await getDataFromS3Bucket(s3Region, bucket, key)
  } catch (err) {
    console.log(err)
    error = new Error(`Error getting object '${key}' from S3 bucket '${bucket}' in '${s3Region}'.`)
  }
  
  // Parse XML and convert to JSON
  if (!error) {
    try {
      data = ofx.parse(data)
      data = extractData(data.OFX)    
      console.log('parsed data:', data)
    } catch (err) {
      console.log(err)
      error = new Error(`Error parsing OFX data.`)      
    }
  }

  if (!error) {
    try {
      const result = await loadTransactionsToDB(data)
    } catch (err) {
      console.log(err)
      error = new Error(`Error loading TX data.`)      
    }
  }

  // Response
  if (error) {
    response = {
      statusCode: 500,
      body: {
        error,
      }, 
    }
  } else {
    response = {
      statusCode: 200,
      body: data,
    }  
  }

  return response
}

export const getDataFromS3Bucket = async (region, bucket, key) => {
  const s3Client = new S3Client({ region })
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,    
  })
  let data = await s3Client.send(command)
  data = await data.Body.transformToString()
  return data
}

export const extractData = OFX => {
  const { STMTRS } = OFX.BANKMSGSRSV1.STMTTRNRS
  const { BANKID: bank, BRANCHID: branch, ACCTID, ACCTTYPE: type } = STMTRS.BANKACCTFROM
  let [account, suffix] = ACCTID.split('-')
  
  // Convert to three digit suffix 
  if (suffix.length === 2) {
    suffix = '0' +  suffix
  }
  
  const bankAccount = {
    bank,
    branch,
    account,
    suffix,
    type,
  }
  
  let { DTSTART: start, DTEND: end } = STMTRS.BANKTRANLIST
  start = isoDate(start)
  end = isoDate(end)
  const transactions = STMTRS.BANKTRANLIST.STMTTRN
    .map(({ TRNTYPE: type, DTPOSTED: datePosted, TRNAMT: amount, FITID: thirdPartyTxId, NAME: description, MEMO: notes }) => {
      datePosted = isoDate(datePosted)
      // console.log(type, amount, Number(amount))
      return {
        type,
        datePosted,
        amount,
        thirdPartyTxId,
        description,
        notes,
      }
    })
    // Negative is Cash out, Positive is Cash in
    .filter(({ type, amount }) => !(type === 'DEP' || Number(amount) > 0))
    
  console.log("txs #", transactions.length)
  
  return {
    bankAccount,
    start,
    end,
    transactions,
  }
}

export const validateBankAccount = (bankAccount) => {
  const { bank, branch, account, suffix, type } = bankAccount
  if (!/^\d{2}$/.test(bank)) {
    throw new Error('The bank account `bank` is invalid. It should be two digits, zero padded.')
  }
  if (!/^\d{4}$/.test(branch)) {
    throw new Error('The bank account `branch` is invalid. It should be four digits, zero padded.')
  }
  if (!/^\d{7}$/.test(account)) {
    throw new Error('The bank account `account` is invalid. It should be seven digits, zero padded.')
  }
  if (!/^\d{3}$/.test(suffix)) {
    throw new Error('The bank account `suffix` is invalid. It should be three digits, zero padded.')
  }
  if (type && !/^[A-Z]+$/.test(type)) {
    throw new Error('The bank account `type` is invalid. It should be one uppercase word.')
  }
}

export const getBankAccountId = async (client, { bank, branch, account, suffix }) => {
  const text = 'SELECT id FROM bank_account WHERE bank = $1 AND branch = $2 AND account = $3 AND suffix = $4'
  const values = [bank, branch, account, suffix]
  const res = await client.query(text, values)
  // console.log(res)
  if (res.rowCount) {
    return res.rows[0].id
  }
  return null
}

export const insertBankAccount = async (client, bankAccount) => {
  const { id, bank, branch, account, suffix, type } = bankAccount
  // bank_account (6): id, bank, branch, account, suffix, type
  const text = 'INSERT INTO bank_account (id, bank, branch, account, suffix, type) VALUES($1, $2, $3, $4, $5, $6)'
  const values = [id, bank, branch, account, suffix, type]
  await client.query(text, values)
}

export const getTransactionId = async (client, thirdPartyTxId, bankAccountId) => {
  const text = 'SELECT id FROM transaction WHERE third_party_tx_id = $1 AND bank_account_id = $2'
  const values = [thirdPartyTxId, bankAccountId]
  const res = await client.query(text, values)
  // console.log(res)
  if (res.rowCount) {
    return res.rows[0].id
  }
  return null
}

export const insertTransaction = async (client, tx, bankAccountId) => {
  const { id, thirdPartyTxId, datePosted, amount, description, notes, type } = tx
  // transaction (8): id, third_party_tx_id, date_posted, amount, description, notes, type, bank_account_id
  const text = 'INSERT INTO transaction (id, third_party_tx_id, date_posted, amount, description, notes, type, bank_account_id) VALUES($1, $2, $3, $4, $5, $6, $7, $8)'
  const values = [id, thirdPartyTxId, datePosted, amount, description, notes, type, bankAccountId]
  await client.query(text, values)
}

export const loadTransactionsToDB = async ({ bankAccount, transactions }) => {
  const client = await connectDb()
  
  try {
    // See if we have an existing bank account
    let bankAccountId = await getBankAccountId(client, bankAccount)
    
    await client.query('BEGIN')
    if (!bankAccountId) {
      
      // If not then add the bank account
      bankAccountId = nanoid(7)
      bankAccount.id = bankAccountId
      await insertBankAccount(client, bankAccount)
    }
    
    console.log('> insert txs')
    for (let i = 0; i < transactions.length; i++) {
      
      const tx = transactions[i]
      
      // Check if tx has already been added. If so, skip.
      const txId = await getTransactionId(client, tx.thirdPartyTxId, bankAccountId)
      if (txId) {
        continue
      }
      
      tx.id = nanoid(7)
      await insertTransaction(client, tx, bankAccountId)
    }

    await client.query('COMMIT')
    // const res = await client.query('SELECT * FROM transactions')
    // console.log(res)
    // await client.end()
  } catch (e) {
    console.error(e)
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.end()
  }
}

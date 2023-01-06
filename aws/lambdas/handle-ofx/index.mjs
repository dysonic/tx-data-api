import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import ofx from 'ofx'
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
    throw e;
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
  const s3Region = 'ap-southeast-2'; // Sydney
  
  let data
  let error
  let response
  
  // // Get data from OFX file
  // try {
  //   data = await getDataFromS3(event, s3Region);
  // } catch (err) {
  //   console.log(err)
  //   error = new Error(`Error getting object ${key} from bucket ${bucket} in ${s3Region}.`)
  // }
  
  // // Parse
  // if (!error) {
  //   try {
  //     data = ofx.parse(data)
  //     data = extractData(data.OFX)    
  //     console.log('parsed data:', data)
  //   } catch (err) {
  //     console.log(err)
  //     error = new Error(`Error parsing OFX data.`)      
  //   }
  // }

  // Load to DB
  data = {
    transactions: [
      {
        type: 'DEBIT',
        datePosted: '2022-11-29',
        amount: '-13.99',
        id: '202211290',
        name: 'Cityfitness Group',
        memo: 'Direct Debit  Cityfitnessg 1E1005I10061'
      }
    ]
  };
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

export const getDataFromS3 = async (event, region) => {
  console.log('> getDataFromS3')
  const s3Client = new S3Client({ region })
  const bucket = event.Records[0].s3.bucket.name
  const key = decodeURIComponent(
    event.Records[0].s3.object.key.replace(/\+/g, ' ')
  )
  const bucketParams = {
    Bucket: bucket,
    Key: key,
  }
  console.log('bucketParams:', bucketParams)

  const command = new GetObjectCommand(bucketParams)
  let data = await s3Client.send(command)
  data = await data.Body.transformToString()
  return data
}

export const extractData = OFX => {
  console.log('> extractData')
  const { STMTRS } = OFX.BANKMSGSRSV1.STMTTRNRS
  const { BANKID: bank, BRANCHID: branch, ACCTID: account, ACCTTYPE: type } = STMTRS.BANKACCTFROM
  const bankAccount = {
    bank,
    branch,
    account,
    type,
  }
  let { DTSTART: start, DTEND: end } = STMTRS.BANKTRANLIST
  start = isoDate(start)
  end = isoDate(end)
  const transactions = STMTRS.BANKTRANLIST.STMTTRN
    .map(({ TRNTYPE: type, DTPOSTED: datePosted, TRNAMT: amount, FITID: id, NAME: name, MEMO: memo }) => {
      datePosted = isoDate(datePosted)
      return {
        type,
        datePosted,
        amount,
        id,
        name,
        memo,
      }
    })
    .filter(({ type }) => type !== 'DEP');
    
  console.log("txs #", transactions.length)
  
  return {
    bankAccount,
    start,
    end,
    transactions,
  }
}

// export const loadTransactionsToDB = async ({ transactions }, region) => {
//   console.log('> loadTransactionsToDB')

//   const params = {
//     resourceArn: 'arn:aws:rds:us-west-1:561624862292:db:tx-data',
//     secretArn: 'arn:aws:secretsmanager:us-west-1:561624862292:secret:dev/txData/postgres-kUYPqt',
//     database: 'tx-data',
//     sql: 'insert into transactions values (:type, :datePosted, :amount, :id, :name, :memo)',
//     parameterSets: transactions
//       .map(({ type, datePosted, amount, id, name, memo }) => {
//         return [
//           { name: 'type', value: { stringValue: type } },
//           { name: 'datePosted', value: { stringValue: datePosted }, typeHint: 'DATE' }, 
//           { name: 'amount', value: { stringValue: amount } },
//           { name: 'id', value: { stringValue: id } }, 
//           { name: 'name', value: { stringValue: name } },
//           { name: 'memo', value: { stringValue: memo } }, 
//         ];
//       })
//   }
//   const command = new BatchExecuteStatementCommand(params);
//   const rdsResult = await rdsClient.send(command);
// }

export const loadTransactionsToDB = async ({ transactions }) => {
  console.log('> loadTransactionsToDB')
  const client = await connectDb()
  
  try {
    await client.query('BEGIN')
    // table order: type, datePosted, amount, id, name, memo
    console.log('> insert txs')
    const text = 'INSERT INTO transactions VALUES($1, $2, $3, $4, $5, $6)'
    transactions.forEach(async ({ type, datePosted, amount, id, name, memo }) => {
      const values = [type, datePosted, amount, id, name, memo];
      const res = await client.query(text, values)
      console.log(res)
    })
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

import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { RDSDataClient, BatchExecuteStatementCommand } from '@aws-sdk/client-rds-data'
import ofx from 'ofx'

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
  const rdsRegion = 'us-west-1b'; // US West (N. California)
  
  let data
  let error
  let response
  
  // Get data from OFX file
  try {
    data = await getDataFromS3(event, s3Region);
  } catch (err) {
    console.log(err)
    error = new Error(`Error getting object ${key} from bucket ${bucket} in ${s3Region}.`)
  }
  
  // Parse
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

  // Load to DB
  if (!error) {
    try {
      const result = await loadTransactionsToDB(data, rdsRegion)
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

export const loadTransactionsToDB = async ({ transactions }, region) => {
  console.log('> loadTransactionsToDB')
  const rdsClient = new RDSDataClient({ region })
  const params = {
    resourceArn: 'arn:aws:rds:us-west-1:561624862292:db:tx-data',
    secretArn: 'arn:aws:secretsmanager:us-west-1:561624862292:secret:dev/txData/postgres-kUYPqt',
    database: 'tx-data',
    sql: 'insert into transactions values (:type, :datePosted, :amount, :id, :name, :memo)',
    parameterSets: transactions
      .map(({ type, datePosted, amount, id, name, memo }) => {
        return [
          { name: 'type', value: { stringValue: type } },
          { name: 'datePosted', value: { stringValue: datePosted }, typeHint: 'DATE' }, 
          { name: 'amount', value: { stringValue: amount } },
          { name: 'id', value: { stringValue: id } }, 
          { name: 'name', value: { stringValue: name } },
          { name: 'memo', value: { stringValue: memo } }, 
        ];
      })
  }
  const command = new BatchExecuteStatementCommand(params);
  const rdsResult = await rdsClient.send(command);
}

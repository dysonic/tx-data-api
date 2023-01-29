'use strict'

const querystring = require('querystring')
const pg = require('pg')
const axios = require('axios')

const { Client } = pg

// AWS Parameters and Secrets Lambda Extension
const getDbCredentials = async () => {
  const headers = { 'X-Aws-Parameters-Secrets-Token': process.env['AWS_SESSION_TOKEN'] }
  const port = process.env['PARAMETERS_SECRETS_EXTENSION_HTTP_PORT'] || 2773
  
  try {
    const secretId = process.env['DB_SECRET_ID']
    if (!secretId) {
        throw new Error('Environment variable `DB_SECRET_ID` must be defined. Please provide the AWS Secrets Manager secret ID.')
    }
    const safeSecretId = querystring.escape(secretId)
    const url = 'http://localhost:' + port + '/secretsmanager/get?secretId=' + secretId
    // console.log('url:', url)
    const res = await axios.get(url, { headers })
    // console.log('res.data:', res.data)    
    return JSON.parse(res.data.SecretString)
  } catch (e) {
    console.error('ERROR: Could not get DB secret')
    console.error(e)
    throw e
  }
}

const connectDb = async (credentials) => {
  try {
    const client = new Client(credentials)
    await client.connect()
    return client
  } catch (e) {
    console.error('ERROR: Could not connect to PostgreSQL instance')
    console.error(e)
    throw e
  }
}

module.exports.getDbCredentials = getDbCredentials
module.exports.connectDb = connectDb

// module.exports = {
//   getDbCredentials,
//   connectDb
// }

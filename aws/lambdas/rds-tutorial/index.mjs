// This is a rewrite of `app.py` from the AWS RDS tutorial
// @see https://docs.aws.amazon.com/lambda/latest/dg/services-rds-tutorial.html
import pg from 'pg'
const { Client } = pg

const {
  PGUSER: user, // PostgreSQL username to connect as
  PGHOST: host, // The name of the server host to connect to
  PGPASSWORD: password, // The password of the PostgreSQL server
  PGDATABASE: database, // The name of the database you are connecting to
  PGPORT: port, // The port number to connect to at the server host
} = process.env

const connectDb = async () => {
  try {
    const client = new Client({
      user,
      host,
      database,
      password,
      port
    })
    console.log('> connect')
    await client.connect()
    console.log('> query')
    const res = await client.query('SELECT * FROM transaction')
    console.log(res)
    await client.end()
  } catch (e) {
    console.error('ERROR: Could not connect to PostgreSQL instance')
    console.error(e)
  }
}

export const handler = async (event, context) => {
  await connectDb()
}
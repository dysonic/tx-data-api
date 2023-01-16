import multipart from 'parse-multipart-data'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

export const uploadFile = async (file, region, bucket) => {
  const { buffer, filename: key } = file
  const body = buffer.toString()

  const params = {
    Bucket: bucket, // The name of the bucket. For example, 'sample_bucket_101'.
    Key: key, // The name of the object. For example, 'sample_upload.txt'.
    Body: body, // The content of the object. For example, 'Hello world!".
  }
  const s3Client = new S3Client({
    region,
  })

  const results = await s3Client.send(new PutObjectCommand(params))
  console.log(
    'Successfully created ' +
      params.Key +
      ' and uploaded it to ' +
      params.Bucket +
      '/' +
      params.Key
  )
  return results // For unit tests.
}

console.log('Loading function')

export const handler = async (event, context) => {
  // const s3Region = 'ap-southeast-2' // Sydney
  const s3Region = 'us-west-1' // US West (N. California)
  
  const { S3_BUCKET: s3Bucket } = process.env
  
  const response = {
    statusCode: 200,
    headers: {
      'content-type' : 'application/json; charset=utf-8',
    },
  }
  try {
    const body = Buffer.from(event.body, 'base64').toString('ascii')
    
    console.log('Content type:', event.headers['content-type'])
    console.log('Decoded payload:', body)
    
    const matches = /boundary=(.+)$/.exec(event.headers['content-type'])
    if (!matches) {
      throw new Error('Missing `boundary` in content-type header.');
    }

    const filesUploaded = []
    const boundary = matches[1]
    console.log('boundary:', boundary)
    const parts = multipart.parse(body, boundary)
    console.log('parts #', parts.length)
    for (let i = 0; i < parts.length; i++) {
      const { filename, data: buffer } = parts[i]
      // will be: { filename: 'A.txt', type: 'text/plain', data: <Buffer 41 41 41 41 42 42 42 42> }
      const file = {
        filename,
        buffer,
      }
      await uploadFile(file, s3Region, s3Bucket)
      filesUploaded.push(filename)
    }
    response.body = JSON.stringify({ filesUploaded })

  } catch (error) {
    response.statusCode = 500;
    response.body = JSON.stringify({ error })
  }
  return response
}













import multipart from 'parse-multipart-data'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

const { S3_BUCKET: s3Bucket, S3_REGION: s3Region } = process.env

export const uploadFile = async (region, bucket, file) => {
  const { buffer, filename: key } = file
  const body = buffer.toString()

  const params = {
    Bucket: bucket, // The name of the bucket. For example, 'sample_bucket_101'.
    Key: key, // The name of the object. For example, 'sample_upload.txt'.
    Body: body, // The content of the object. For example, 'Hello world!".
  }
  console.log(`Uploading ${key} to ${bucket} in ${region}`);
  const s3Client = new S3Client({
    region,
  })

  return await s3Client.send(new PutObjectCommand(params))
}

console.log('Loading function')

export const handler = async (event, context) => {
  const response = {
    statusCode: 200,
    headers: {
      'content-type' : 'application/json; charset=utf-8',
    },
  }
  try {
    const { body, headers } = event
    const buffer = Buffer.from(body, 'base64')
    const boundary = multipart.getBoundary(headers['content-type']);
    
    // console.log('boundary:', boundary)
    // console.log('Content type:', headers['content-type'])
    // console.log('Decoded payload:', body)

    const filesUploaded = []

    const parts = multipart.parse(buffer, boundary)
    // gconsole.log('parts #', parts.length)
    if (parts.length === 0) {
      throw new Error('Could not extract parts from form data.')
    }
    
    for (let i = 0; i < parts.length; i++) {
      const { filename, data: buffer } = parts[i]
      // will be: { filename: 'A.txt', type: 'text/plain', data: <Buffer 41 41 41 41 42 42 42 42> }
      const file = {
        filename,
        buffer,
      }
      await uploadFile(s3Region, s3Bucket, file)
      filesUploaded.push(filename)
    }
    response.body = JSON.stringify({ filesUploaded })

  } catch (error) {
    response.statusCode = 500;
    response.body = JSON.stringify({ error })
  }
  return response
}













import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { Express } from 'express'

export const uploadFile = async (file: Express.Multer.File) => {
  if (!file) {
    throw new Error('No file')
  }
  const { AWS_DEFAULT_REGION: region, S3_BUCKET } = process.env

  // Set the parameters
  const { buffer, originalname } = file
  const body = buffer.toString()

  const params = {
    Bucket: S3_BUCKET, // The name of the bucket. For example, 'sample_bucket_101'.
    Key: originalname, // The name of the object. For example, 'sample_upload.txt'.
    Body: body, // The content of the object. For example, 'Hello world!".
  }
  const s3Client = new S3Client({
    region,
  })
  try {
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
  } catch (err) {
    console.log('Error', err)
  }
}

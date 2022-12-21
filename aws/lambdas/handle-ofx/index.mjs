import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import ofx from 'ofx'

console.log('Loading function')

export const handler = async (event, context) => {
  // Set the AWS Region.
  // const region = "us-east-1";
  const region = 'ap-southeast-2' // Sydney
  const client = new S3Client({ region })

  // Get the object from the event and show its content type
  const bucket = event.Records[0].s3.bucket.name
  const key = decodeURIComponent(
    event.Records[0].s3.object.key.replace(/\+/g, ' ')
  )
  const bucketParams = {
    Bucket: bucket,
    Key: key,
  }
  console.log('bucketParams:', bucketParams)

  let response
  try {
    const command = new GetObjectCommand(bucketParams)
    let data = await client.send(command)
    data = await data.Body.transformToString()
    data = ofx.parse(data)
    console.log('data.OFX.BANKMSGSRSV:', data.OFX.BANKMSGSRSV1)
    response = {
      statusCode: 200,
      body: data,
    }
  } catch (err) {
    console.log(err)
    const message = `Error getting object ${key} from bucket ${bucket}. Make sure they exist and your bucket is in the same region as this function.`
    response = {
      statusCode: 500,
      body: {
        error: {
          message,
        },
      },
    }
  }

  // const response = {
  //     statusCode: 200,
  //     body: JSON.stringify('Hello from Lambda!'),
  // };
  return response
}

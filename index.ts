import express, { Request, Response, Router } from 'express'
import dotenv from 'dotenv'
import multer from 'multer'
import { uploadFile } from './src/services/upload'

dotenv.config()

const app = express()
const port = process.env.PORT

const storage = multer.memoryStorage()
const upload = multer({ storage })

app.get('/', (req: Request, res: Response) => {
  res.send('Express + TypeScript Server')
})

const apiRouter = express.Router()
apiRouter.post(
  '/upload',
  upload.single('file'),
  (req: Request, res: Response) => {
    const file = req.file
    if (!file) {
      res.status(400).send({ error: 'Missing `file` in request' })
      return
    }

    uploadFile(file)
      .then(() => {
        res.sendStatus(200)
      })
      .catch((error) => {
        if (error) {
          res.status(500).send({ error })
        } else {
          res.status(500).send({})
        }
      })
  }
)

app.use('/api', apiRouter)

app.listen(port, () => {
  console.log(`[server]: Server is running at https://localhost:${port}`)
})

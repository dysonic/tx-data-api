import express, { Request, Response, Router } from 'express'
import dotenv from 'dotenv'
import multer from 'multer'
import { uploadFile } from './src/services/upload'
import { findAll } from './src/services/transaction'

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

apiRouter.get('/transactions', (req: Request, res: Response) => {
  const page = req.query.page as string | null
  const category = req.query.category as string | null

  // Validate
  if (!page) {
    res.status(400).send({ error: 'Query parameter `page` is required.' })
    return
  }
  if (!/^\d+$/.test(page)) {
    res.status(400).send({
      error:
        'Query parameter `page` is invalid. It should be numeric, starting from 1.',
    })
    return
  }
  if (category && /!^\w+$/.test(category)) {
    res.status(400).send({ error: 'Query parameter `category` is invalid.' })
    return
  }

  findAll({ page: new Number(page).valueOf(), category })
    .then((transactions) => {
      res.sendStatus(200).send({ transactions })
    })
    .catch((error) => {
      if (error) {
        res.status(500).send({ error })
      } else {
        res.status(500).send({})
      }
    })

  // res.sendStatus(200)
})

app.use('/api', apiRouter)

app.listen(port, () => {
  console.log(`[server]: Server is running at https://localhost:${port}`)
})

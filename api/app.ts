/**
 * This is a API server
 */

import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import lockerRoutes from './routes/lockers.js'
import deliveryRoutes from './routes/delivery.js'
import pricingRoutes from './routes/pricing.js'
import billRoutes from './routes/bills.js'
import opsRoutes from './routes/ops.js'
import { seedMockDeliveries } from './store/dataStore.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()

seedMockDeliveries()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

/**
 * API Routes
 */
app.use('/api/lockers', lockerRoutes)
app.use('/api/delivery', deliveryRoutes)
app.use('/api/pricing', pricingRoutes)
app.use('/api/bills', billRoutes)
app.use('/api/ops', opsRoutes)

/**
 * health
 */
app.use(
  '/api/health',
  (req: Request, res: Response, next: NextFunction): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
    })
  },
)

/**
 * error handler middleware
 */
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  res.status(500).json({
    success: false,
    error: 'Server internal error',
  })
})

/**
 * 404 handler
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  })
})

export default app

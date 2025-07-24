// Simple health endpoint test to isolate the issue
// Test if the problem is with the shared schema imports

import express from 'express'

const testRouter = express.Router()

// Ultra-simple health check without any imports
testRouter.get('/health-simple', (req: express.Request, res: express.Response) => {
  console.log('✅ Simple health check called')
  res.json({ 
    status: 'ok',
    message: 'Simple health endpoint working',
    timestamp: new Date().toISOString()
  })
})

// Test with config import
testRouter.get('/health-config', async (req: express.Request, res: express.Response) => {
  try {
    console.log('✅ Health check with config called')
    const { config } = await import('./config.js')
    res.json({ 
      status: 'ok',
      message: 'Health with config working',
      nodeEnv: config.nodeEnv,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('❌ Error in health-config:', error)
    res.status(500).json({ error: error?.message || 'Unknown error' })
  }
})

// Test with schema import
testRouter.get('/health-schema', async (req: express.Request, res: express.Response) => {
  try {
    console.log('✅ Health check with schema called')
    const schema = await import('@shared/schema')
    res.json({ 
      status: 'ok',
      message: 'Health with schema working',
      hasUser: false, // Schema import test
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('❌ Error in health-schema:', error)
    res.status(500).json({ error: error?.message || 'Unknown error' })
  }
})

export default testRouter

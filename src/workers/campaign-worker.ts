import { Worker, Job } from 'bullmq'
import { campaignEngine } from '@/lib/campaigns/campaign-engine'

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD
}

// Campaign processing worker
const campaignWorker = new Worker('campaigns', async (job: Job) => {
  const { name, data } = job

  switch (name) {
    case 'process-campaign':
      await campaignEngine.processBatch(data.campaignId, data.batchIndex)
      break
    case 'execute-step':
      await campaignEngine.executeStep(data.campaignLeadId, data.stepIndex)
      break
  }
}, { connection, concurrency: 5 })

// Call worker
const callWorker = new Worker('calls', async (job: Job) => {
  const { name, data } = job
  // Handle call-specific jobs (voicemail, etc.)
  console.log(`Processing call job: ${name}`, data)
}, { connection, concurrency: 3 })

// Email worker
const emailWorker = new Worker('emails', async (job: Job) => {
  console.log(`Processing email job:`, job.data)
  // Send email using SendGrid/SMTP
}, { connection, concurrency: 10 })

// SMS worker
const smsWorker = new Worker('sms', async (job: Job) => {
  console.log(`Processing SMS job:`, job.data)
  // Send SMS using Twilio
}, { connection, concurrency: 10 })

campaignWorker.on('completed', (job) => {
  console.log(`Campaign job ${job.id} completed`)
})

campaignWorker.on('failed', (job, err) => {
  console.error(`Campaign job ${job?.id} failed:`, err)
})

console.log('Workers started successfully')

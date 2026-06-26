import { Worker, Job } from 'bullmq'
import { campaignEngine } from '@/lib/campaigns/campaign-engine'
import twilio from 'twilio'
import nodemailer from 'nodemailer'

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
  const { to, subject, body } = job.data

  if (!process.env.SMTP_HOST) {
     console.warn('SMTP configuration missing. Skipping email send.')
     return
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  try {
    const info = await transporter.sendMail({
      from: `"VoiceForge AI" <${process.env.SMTP_USER}>`,
      to: to,
      subject: subject || "Update from VoiceForge",
      text: body,
      html: `<div>${body}</div>`,
    });
    console.log("Email sent: %s", info.messageId);
  } catch (error) {
    console.error('Failed to send email:', error)
  }
}, { connection, concurrency: 10 })

// SMS worker
const smsWorker = new Worker('sms', async (job: Job) => {
  console.log(`Processing SMS job:`, job.data)
  // Send SMS using Twilio
  const { to, body } = job.data

  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    console.warn('Twilio configuration missing. Skipping SMS send.')
    return
  }

  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)

  try {
    const message = await client.messages.create({
      body: body,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: to
    })
    console.log("SMS sent: %s", message.sid)
  } catch (error) {
    console.error('Failed to send SMS:', error)
  }
}, { connection, concurrency: 10 })

campaignWorker.on('completed', (job) => {
  console.log(`Campaign job ${job.id} completed`)
})

campaignWorker.on('failed', (job, err) => {
  console.error(`Campaign job ${job?.id} failed:`, err)
})

console.log('Workers started successfully')

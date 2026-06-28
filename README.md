# VoiceForge AI - Autonomous Sales Agent Platform

VoiceForge AI is a comprehensive, enterprise-grade Next.js application that orchestrates real-time conversational AI voice agents for outbound and inbound lead generation.

It acts as an infinitely scalable SDR team, bridging the gap between raw CRM lead ingestion and scheduled human-closer appointments via sophisticated smart-routing, omnichannel campaign execution, and dynamic objection handling.

## Core Capabilities

1. **Intelligent Conversational Pipeline**
   - Integrates with Twilio for underlying SIP/PSTN telephony logic.
   - Utilizes OpenAI (`gpt-4o`) as the cognitive engine to dynamically parse transcripts and inject personalized CRM payload variables into active calls.
   - Features a continuous learning `ReflectionEngine` that analyzes post-call transcripts to automatically adapt and improve objection-handling parameters for future calls.

2. **Smart Omnichannel Campaigns**
   - Built on `BullMQ` and `Redis`, the platform reliably schedules multi-day, multi-channel sequences.
   - Automatically executes fallback SMS (`twilio`) or formatted tracking emails (`nodemailer`) if leads drop off or calls hit voicemail systems.

3. **Dynamic CRM Ingestion**
   - Agnostic webhook listeners ingest lead parameters in real time.
   - A dedicated `LeadRouter` evaluates custom tracking variables (e.g. `need`) and maps leads to specialized A/B testing campaign queues instantly.

4. **Multi-Tenant SaaS Architecture**
   - Protected by `next-auth`, the dashboard supports discrete organizational API configurations.
   - Stripe integration tracks API minute usage and bumps service tiers automatically via payment webhooks.

## Architecture

* **Frontend**: Next.js 14 (App Router), React, Tailwind CSS, Lucide Icons.
* **Backend**: Next.js Server Actions, REST Webhooks.
* **Database**: PostgreSQL (managed via Prisma ORM).
* **Queuing**: Redis & BullMQ.
* **Telephony**: Twilio.
* **AI Orchestration**: OpenAI.

## Deployment & Setup

Review the `DEPLOY.md` file for comprehensive strategies regarding local development, sandbox mock testing, and production Docker containerization via GitHub Action CI/CD pipelines.

To execute the automated end-to-end sandbox simulator, run:
```bash
npm run test:pilot
```

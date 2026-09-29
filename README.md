# VoiceForge AI + Jules — Unified AI Voice Sales Platform

> **Merged project:** Combines VoiceForge AI (leadG) + Jules AI Real Estate Concierge (realestateleadcaller)
> All unique features from both projects are preserved. See `MERGE_GUIDE.md` for integration points.

A comprehensive, enterprise-grade Next.js application that orchestrates real-time conversational AI voice agents for outbound and inbound lead generation, with full CRM, multi-channel campaigns, direct mail, and geospatial prospecting.

## Core Capabilities

### AI Voice Engine (from VoiceForge AI)
1. **Intelligent Conversational Pipeline**
   - Twilio SIP/PSTN telephony with inbound/outbound calling
   - OpenAI GPT-4o cognitive engine with dynamic CRM payload injection
   - Continuous learning `ReflectionEngine` that adapts objection handling from post-call transcripts
   - ElevenLabs/Deepgram STT/TTS voice pipeline

2. **Smart Omnichannel Campaigns**
   - BullMQ + Redis for multi-day, multi-channel sequences
   - Automatic fallback SMS (Twilio) or email (SendGrid) on voicemail/drop-off
   - LeadRouter with A/B campaign queue mapping

3. **Multi-Tenant SaaS**
   - Organization-scoped data isolation
   - Stripe integration for API minute usage billing
   - Per-org API configuration

### CRM & Concierge (from Jules AI)
4. **State-Machine Workflows**
   - Reactive state machines (not linear drips) based on lead intent/urgency
   - "Default Aggressive" 10-Day Blitz + Double Tap strategies
   - Visual drag-and-drop workflow builder (Inngest-backed)

5. **Direct Mail Automation**
   - Lob direct mail dispatch via Inngest background jobs
   - Track and manage physical mail tasks per lead

6. **Knowledge Base Context Injection**
   - Agent-written facts (lockbox codes, office hours) injected into voice AI prompts
   - Dynamic per-call context enhancement

7. **Mid-Call Tool Execution**
   - Write to Google Calendar and database DURING active phone calls
   - Vapi Server URL webhooks for real-time tool execution

8. **Bi-Directional CRM Integration**
   - Follow Up Boss outbound push + inbound listener
   - Auto-halts workflows when leads marked "Trash" or "Closed"

9. **Sentiment & Intelligence**
   - OpenAI Structured Outputs for inbound intent parsing
   - Auto-bumps urgency scores, marks DNC, auto-pauses workflows
   - Predictive ML lead scoring across historical pool

10. **Geospatial Prospecting**
    - Nominatim geocoding on lead creation and CSV import
    - Circle Prospecting map (react-leaflet + haversine distance)
    - SSE real-time map updates (new leads appear without refresh)
    - Geographic CSV calling list export

11. **Native Browser Calling**
    - WebRTC warm transfers via `@twilio/voice-sdk`
    - Floating NativeDialer widget in dashboard

12. **MCP Server**
    - Model Context Protocol for external AI agents
    - Pages Router SSE transport (see MERGE_GUIDE for critical constraint)

## Architecture

* **Frontend:** Next.js (App Router), React, Tailwind CSS, Lucide Icons
* **Backend:** Next.js Server Actions, API Routes, Inngest background jobs
* **Database:** PostgreSQL (Prisma ORM) or SQLite (dev)
* **Queuing:** Redis + BullMQ (omnichannel), Inngest (state machine)
* **Telephony:** Twilio (Voice, SMS, WebRTC)
* **AI:** OpenAI (conversation, sentiment, scoring), ElevenLabs (TTS)
* **Direct Mail:** Lob
* **Payments:** Stripe

## Quick Start

```bash
npm install
docker-compose up -d db redis   # start dependencies
npx prisma db push
npm run dev
```

## Key Documentation

| File | Purpose |
|---|---|
| `MERGE_GUIDE.md` | **Integration points between merged projects** |
| `VISION.md` | Product vision and design principles |
| `ROADMAP.md` | Development phases and milestones |
| `CHANGELOG.md` | Version history |
| `DEPLOY.md` | Deployment strategies |

## Historical Projects

This repository merges two independently developed projects:
- **VoiceForge AI** (leadG) — Autonomous AI voice lead generation & sales engine
- **Jules AI Real Estate Concierge** (realestateleadcaller) — Agentic lead conversion workflow

All unique features, ideas, and planned capabilities from both are preserved in this unified codebase.

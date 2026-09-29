# Voice Agent Platform - Changelog

All notable changes to this project will be documented in this file.

## [v2.0.0] - 2026-09-22

### Merged — Jules AI Real Estate Concierge (realestateleadcaller)
This release merges the complete `realestateleadcaller` project (27 phases) into VoiceForge AI, creating a unified voice agent platform. All unique features are preserved. See `MERGE_GUIDE.md` for integration details.

### Added (from Jules AI Concierge)
- **Direct Mail Automation** — Lob provider with Inngest background dispatch
- **Knowledge Base Context Injection** — Agent-written facts injected into voice AI prompts
- **Mid-Call Tool Execution** — Google Calendar + DB writes during active calls via Vapi webhooks
- **Bi-Directional CRM Webhooks** — Follow Up Boss outbound push + inbound listener with auto-halt
- **SentimentAnalyzer** — OpenAI Structured Outputs for intent parsing, urgency bumping, DNC marking, auto-pause
- **Circle Prospecting Map** — react-leaflet + haversine distance + geographic CSV export
- **SSE Real-Time Map Updates** — Live geocoded leads appearing without refresh
- **Geocoding (Nominatim)** — Auto-geocode on lead creation and CSV import
- **Predictive ML Lead Scoring** — Batch evaluation across historical lead pool
- **Native WebRTC Dialer** — `@twilio/voice-sdk` floating browser-based warm transfer pickup
- **Visual Workflow Builder** — Drag-and-drop sequence builder (Inngest-backed)
- **State-Machine Workflow Engine** — Reactive lead journeys (not linear drips)
- **AI Script Engine** — Buyer, Seller, Circle Prospecting, Warm Transfer scripts with variable replacement
- **MCP Server** — Model Context Protocol for external AI agents (Pages Router SSE transport)
- **Notification Banner** — Global toast polling for webhook-triggered events
- **Manual Override** — Instant SendGrid/Twilio push outside sequences
- **Color-coded Activity Timeline** — SMS/Voice/Email visual differentiation
- **Dashboard KPIs** — Conversion Rate, DNC Rate, Connect Rate (>30s), Upcoming Appointments
- **Dynamic Agent Voice Provisioning** — Vapi voice selection dropdown
- **Multi-tenant RLS** — Prisma userId-scoped data isolation
- **CSV Import with Geocoding** — Address parsing on bulk import
- **"Jules" Persona Scripts** — 10-Day Blitz + Double Tap methods
- **12 New API Routes** — direct-mail, engine/tick, inngest, leads CRUD, notifications, settings, knowledge, vapi-assistants, sse, twilio/token, fub, sendgrid, vapi, vapi-tools, workflows

## [v1.0.1]
- Integrated real live database fetch actions for the Next.js Dashboard UI
- Implemented core CRM connector system and inbound webhooks
- Added `/api/twilio/transfer-complete` and `/api/twilio/voicemail` webhooks

## [v1.0.0]
- Initial Project Commit. Next.js 14, Tailwind, Prisma, BullMQ, Twilio Integrations.

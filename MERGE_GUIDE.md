# MERGE GUIDE — Voice Agent (leadG + realestateleadcaller)

> This documents every integration point between the two merged voice projects.
> **No feature, idea, or capability is dropped.** Everything below must be wired up.

---

## Architecture Decision

- **Base:** `leadG` (VoiceForge AI) — BullMQ queues, Stripe billing, ReflectionEngine, PostgreSQL
- **Ported in:** `realestateleadcaller` (Jules AI Concierge) — 27 phases of features

---

## Integration Points (what needs wiring)

### 1. Database Schema
The `prisma/schema.prisma` needs models from BOTH projects:

**From leadG:** Organization, User, AiAgent, Lead, Campaign, CampaignStep, CampaignLead, CampaignAssignment, CallLog, EmailTemplate, SmsTemplate, VoicemailTemplate, Integration, PhoneNumber, ScheduledEvent

**From leadcaller (ADD):** Agent, Notification, LeadActivity, FollowUpWorkflow, FollowUpStep, Conversation, MessageLog, EmailLog, DirectMailTask, Appointment, AIConversationSummary, LeadScore, IntegrationSettings, KnowledgeBaseSnippet

### 2. Twilio Webhooks (merge both sets)
- leadG: `/api/twilio/gather`, `/api/twilio/incoming`, `/api/twilio/status`, `/api/twilio/transfer-complete`, `/api/twilio/voice`, `/api/twilio/voicemail`
- leadcaller: `/api/twilio/token` (WebRTC browser calling)
- **Action:** Keep all leadG routes + add `/api/twilio/token`

### 3. CRM Webhooks
- leadG: `/api/webhooks/crm` (generic CRM connector)
- leadcaller: `/api/webhooks/fub` (Follow Up Boss bi-directional), `/api/webhooks/sendgrid`, `/api/webhooks/twilio`, `/api/webhooks/vapi`, `/api/webhooks/vapi-tools`
- **Action:** Keep all — these are complementary

### 4. Campaign Engine
- leadG: BullMQ-based `src/lib/campaigns/campaign-engine.ts` + `src/workers/campaign-worker.ts`
- leadcaller: Inngest-based state machine `src/app/api/engine/tick/` + `src/inngest/functions.ts`
- **Action:** Keep both. BullMQ for multi-day omnichannel sequences. Inngest for state-machine workflow transitions. Document when to use each.

### 5. AI Systems
- leadG: `src/lib/ai/conversation-engine.ts` (OpenAI), `src/lib/ai/reflection-engine.ts`, `src/lib/ai/voice-pipeline.ts` (STT/TTS)
- leadcaller: `src/lib/adapters/sentiment.ts` (SentimentAnalyzer with Structured Outputs), `src/lib/scripts.ts` (AI Script Engine)
- **Action:** Wire sentiment analyzer into conversation engine. Use scripts for call prompts.

### 6. Knowledge Base
- leadcaller: `src/app/api/settings/knowledge/` + `src/app/settings/knowledge/`
- **Action:** Wire KnowledgeBaseSnippet lookups into Vapi voice prompts before calls (from HANDOFF.md: "lockbox codes, office hours")

### 7. Maps & Geospatial
- leadcaller: `src/app/map/` (Circle Prospecting with react-leaflet + haversine), `src/lib/adapters/geocoding.ts` (Nominatim), `src/lib/sse/emitter.ts` + `src/app/api/sse/`
- **Action:** Geocode leads on creation. SSE stream new leads to map in real-time.

### 8. Native Browser Calling
- leadcaller: `src/components/NativeDialer.tsx` (WebRTC via `@twilio/voice-sdk`)
- **Action:** Mount in global layout for warm transfer pickup in browser.

### 9. Direct Mail
- leadcaller: `src/app/api/direct-mail/` + `src/app/direct-mail/` + Lob adapter
- **Action:** Wire LobDirectMailProvider through Inngest background jobs.

### 10. Visual Workflow Builder
- leadcaller: `src/app/workflows/` + `src/app/workflows/builder/`
- **Action:** Drag-and-drop builder creating FollowUpWorkflow/FollowUpStep records.

### 11. MCP Server
- leadcaller: `src/pages/api/mcp.ts` — **CRITICAL: must stay in Pages Router**
- **Action:** Expose CRM tools via MCP for external AI agents. Do NOT move to App Router.

### 12. Notifications
- leadcaller: `src/components/NotificationsBanner.tsx` + `src/app/api/notifications/`
- **Action:** Mount in global layout. Webhooks write Notification rows → toast alerts.

### 13. Lead Import & Management
- leadcaller: `src/app/leads/import/` (CSV with geocoding), `src/app/leads/new/`, `src/app/leads/[id]/`
- **Action:** Merge with leadG's lead management. Import should geocode.

### 14. Settings Pages
- leadcaller: `src/app/settings/` (integrations, knowledge, scripts)
- leadG: `src/app/settings/` + `src/app/settings/billing/`
- **Action:** Merge settings layout — combine both page sets.

---

## Unique Features Checklist (verify each is preserved)

### From leadG
- [ ] ConversationEngine (OpenAI-powered)
- [ ] ReflectionEngine (continuous learning from transcripts)
- [ ] VoicePipeline (STT/TTS with ElevenLabs/Deepgram)
- [ ] BullMQ multi-day omnichannel campaigns
- [ ] LeadRouter (A/B campaign mapping)
- [ ] Stripe billing + usage tracking
- [ ] Multi-tenant SaaS (Organization model)
- [ ] Live Audio Monitor (WebRTC barge-in)
- [ ] CRM connectors (HubSpot, Salesforce, GoHighLevel, Webhook)
- [ ] Transfer-complete + voicemail webhooks
- [ ] Pilot simulation script
- [ ] Docker standalone deployment

### From realestateleadcaller
- [ ] Direct Mail (Lob + Inngest)
- [ ] Knowledge Base context injection
- [ ] Mid-Call Tool Execution (Calendar writes during calls)
- [ ] Bi-Directional CRM Webhooks (Follow Up Boss)
- [ ] SentimentAnalyzer (auto-pause, DNC, urgency bumping)
- [ ] Circle Prospecting Map (Leaflet + haversine)
- [ ] SSE real-time map updates
- [ ] Geocoding (Nominatim)
- [ ] Predictive ML Lead Scoring
- [ ] Native WebRTC Dialer
- [ ] Visual Drag-and-Drop Workflow Builder
- [ ] State-machine workflow engine (Inngest)
- [ ] AI Script Engine (Buyer, Seller, Circle Prospecting, Warm Transfer)
- [ ] MCP Server (Pages Router)
- [ ] Notification Banner (global toast)
- [ ] Manual Override box
- [ ] Color-coded Activity Timeline
- [ ] Dashboard KPIs (Conversion, DNC, Connect rates)
- [ ] Dynamic Agent Voice Provisioning
- [ ] Multi-tenant RLS
- [ ] CSV import with geocoding
- [ ] "Jules" persona + 10-Day Blitz / Double Tap scripts

---

## Future Ideas (from IDEAS.md of both projects)
- DeepFake Avatar Video Sync (HeyGen/D-ID over WebRTC)
- Aggressive Memory Vectoring (RAG objection handling across orgs)
- Accent Morphing (ElevenLabs by area code)

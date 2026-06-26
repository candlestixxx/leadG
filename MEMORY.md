# VoiceForge AI - System Memory

- Next.js static asset rendering (`npm run build`) eagerly attempts to connect to Prisma/PostgreSQL and BullMQ/Redis. In isolated CI/CD or sandboxed environments, these instances must be dynamically mocked if `window` is undefined to prevent `ECONNREFUSED` crashes.
- Twilio XML definitions (TwiML) string lengths and properties must strictly comply with string cast inputs (e.g. `speechTimeout: "3"`).
- Ensure that the primary environment variable names in production deployments correspond exactly with `.env.production.local`.
- When dealing with outbound actions, CRM externalIDs are cached on the `Lead` model for quick bidirectional updates.

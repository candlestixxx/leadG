# VoiceForge AI - Deployment Guidelines

## Overview
VoiceForge AI utilizes a containerized architecture managed by Docker Compose. The Next.js application is built utilizing the `standalone` output for minimized image sizes.

## Pre-Requisites
- A functional PostgreSQL database endpoint.
- A functional Redis instance for BullMQ background workers.
- An SMTP server for Email orchestration (e.g. SendGrid).
- Valid API Keys for Twilio (Telephony & SMS), OpenAI, and ElevenLabs.

## Environment Strategies

### Development
- Setup scripts are available via `npm run dev` for hot-loading environments.
- Ensure `.env` is populated with active local database instances.

### Staging
- Staging deployments mimic production but connect to isolated database sets.
- Execute `bash scripts/deploy-staging.sh` to trigger the staging automation.
- The CI/CD pipeline (`.github/workflows/ci.yml`) automatically simulates a deployment to staging on merge to the `main` branch.

### Production
- Production environments should strictly rely on `docker-compose.yml`.
- Execute `docker-compose up -d --build` to spin up the web interface, the background campaign workers, and the active dependencies.

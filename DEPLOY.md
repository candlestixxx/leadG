# VoiceForge AI - Deployment Guidelines

- Production environments should rely on the `docker-compose.yml`.
- Pre-requisites include functional endpoints for Redis and PostgreSQL.
- Setup script is available via `npm run dev` for hot-loading environments.
- Build production variants using `npm run build` with the `standalone` Next.js output definition enabled in `next.config.js`.

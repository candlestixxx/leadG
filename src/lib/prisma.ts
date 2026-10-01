/**
 * Canonical Prisma client re-export.
 *
 * Why: the codebase historically imported the Prisma singleton from two
 * paths — `@/lib/db/prisma` (canonical, in `src/lib/db/prisma.ts`) and
 * `@/lib/prisma` (used by `src/inngest/functions.ts` and
 * `src/app/api/direct-mail/route.ts`). The second path never existed,
 * so those modules failed to resolve at build time. This file aliases
 * the canonical export so both import styles work without touching
 * every call site.
 */
export { prisma } from './db/prisma';
export { prisma as default } from './db/prisma';

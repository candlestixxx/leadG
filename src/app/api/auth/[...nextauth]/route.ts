import NextAuth from "next-auth"
import { authOptions } from "@/lib/auth"

// Route handler: the NextAuth config lives in `@/lib/auth` so API routes can
// import `authOptions` without hitting the "route files may only export HTTP
// verbs" constraint. See src/lib/auth.ts for the rationale.
const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }

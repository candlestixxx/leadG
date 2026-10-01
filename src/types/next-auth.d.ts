import type { DefaultSession } from 'next-auth'

/**
 * NextAuth type augmentation.
 *
 * Why: NextAuth's default `Session.user` only carries `name`, `email`, and
 * `image`. API routes read `session.user.id` for tenant isolation and
 * ownership checks, which TypeScript rejects. This declaration adds `id` to
 * both `Session.user` and the `User` interface so `getServerSession()`
 * returns a typed user with `id` available — no casts required at call sites.
 */
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
    } & DefaultSession['user']
  }

  interface User {
    id: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string
  }
}

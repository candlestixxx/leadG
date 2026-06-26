import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// In Next.js static generation, it tries to connect to the DB and fails if there is none
export const prisma = globalForPrisma.prisma ?? (typeof window === "undefined" && process.env.NODE_ENV === "production" ? {} as PrismaClient : new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query'] : [],
}))

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

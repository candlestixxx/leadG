import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Mock Prisma client — returns empty/null for all queries (no database needed)
// Replace with real PrismaClient when PostgreSQL is available
const noop = async () => ({})
const emptyArray: any[] = []

function mockModel() {
  return {
    count: async () => 0,
    findMany: async () => emptyArray,
    findUnique: async () => null,
    findFirst: async () => null,
    create: async (args: any) => ({ id: 'mock', ...args?.data }),
    upsert: async (args: any) => ({ id: 'mock', ...args?.create }),
    update: async (args: any) => ({ id: 'mock', ...args?.data }),
    delete: async () => ({ id: 'mock' }),
    aggregate: async () => ({ _count: 0 }),
    groupBy: async () => emptyArray,
  }
}

console.log('[prisma] Using mock client (no PostgreSQL available)')

export const prisma = {
  $connect: noop,
  $disconnect: noop,
  $transaction: async (fn: any) => fn(prisma),
  $on: () => {},
  $use: () => {},
  $extends: () => prisma,
  user: mockModel(),
  organization: mockModel(),
  aiAgent: mockModel(),
  lead: mockModel(),
  campaign: mockModel(),
  callLog: mockModel(),
  campaignLead: mockModel(),
  campaignStep: mockModel(),
  campaignAssignment: mockModel(),
  phoneNumber: mockModel(),
  integration: mockModel(),
  emailTemplate: mockModel(),
  smsTemplate: mockModel(),
  voicemailTemplate: mockModel(),
  scheduledEvent: mockModel(),
} as unknown as PrismaClient

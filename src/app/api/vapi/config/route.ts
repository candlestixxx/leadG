import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * GET /api/vapi/config — Vapi CLIENT-SIDE SDK configuration.
 *
 * Returns PUBLIC values only (the public key exists for browser exposure).
 * The Web SDK needs these for in-browser voice sessions with the assistant;
 * the private key never leaves the server. Served dynamically so key changes
 * don't require a rebuild (NEXT_PUBLIC_* would be inlined at build time).
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    publicKey: process.env.VAPI_PUBLIC_KEY || null,
    assistantId: process.env.VAPI_ASSISTANT_ID || null,
    configured: Boolean(process.env.VAPI_PUBLIC_KEY && process.env.VAPI_ASSISTANT_ID),
  });
}

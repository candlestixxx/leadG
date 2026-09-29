import { NextResponse } from 'next/server';
import { sseEmitter } from '@/lib/sse/emitter';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  // Note: A production app might want stricter SSE validation, but we permit all authenticated users
  if (!session || !session.user?.email) {
      return new NextResponse('Unauthorized', { status: 401 });
  }

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      const onBroadcast = ({ event, data }: { event: string, data: any }) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      sseEmitter.on('broadcast', onBroadcast);

      // Keep alive heartbeat
      const heartbeat = setInterval(() => {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
      }, 15000);

      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        sseEmitter.removeListener('broadcast', onBroadcast);
        controller.close();
      });
    }
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

import { NextRequest, NextResponse } from 'next/server'
import { WebSocketServer, WebSocket } from 'ws'
import { parse } from 'url'
import { prisma } from '@/lib/db/prisma'

export async function GET(req: NextRequest) {
    return new NextResponse('WebSocket endpoint. Connect using ws://', { status: 426 })
}

// Global variable to hold the WSS instance in development
// Note: In a true production Next.js environment on Vercel this will not work.
// You need a custom server.js to bind WebSockets properly.
let wss: WebSocketServer | undefined

export function initWebSocketServer(server: any) {
  if (wss) return

  wss = new WebSocketServer({ server, path: '/api/twilio/stream' })

  wss.on('connection', (ws: WebSocket, req: any) => {
    console.log('[WebRTC] Client connected')

    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message)

        if (data.event === 'start') {
          console.log('[WebRTC] Stream started:', data.start.streamSid)
        } else if (data.event === 'media') {
           // Received media payload from Twilio.
           // You would stream data.media.payload to your STT engine here,
           // or proxy it to a connected frontend manager dashboard for live listening.
        } else if (data.event === 'stop') {
          console.log('[WebRTC] Stream stopped')
        }
      } catch (e) {
        console.error('[WebRTC] Error parsing message', e)
      }
    })

    ws.on('close', () => {
      console.log('[WebRTC] Client disconnected')
    })
  })
}

import { WebSocketServer, WebSocket } from 'ws'
import { VoicePipeline } from '@/lib/ai/voice-pipeline'
import { ConversationEngine } from '@/lib/ai/conversation-engine'
import OpenAI from 'openai'
import { prisma } from '@/lib/db/prisma'

export function attachWebSocketServer(server: any) {
  const wss = new WebSocketServer({ server, path: '/api/twilio/stream' })

  wss.on('connection', (ws: WebSocket, req: any) => {
    console.log('[WebRTC] Client connected')
    let pipeline: VoicePipeline | null = null;
    let callSid: string | null = null;

    ws.on('message', async (message: string) => {
      try {
        const data = JSON.parse(message)

        if (data.event === 'start') {
          console.log('[WebRTC] Stream started:', data.start.streamSid)
          callSid = data.start.callSid;

          const params = data.start.customParameters || {};
          const agentId = params.agentId;
          const leadId = params.leadId;
          const campaignId = params.campaignId;

          if (agentId) {
             const agent = await prisma.aiAgent.findUnique({ where: { id: agentId } });
             if (agent) {
                const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

                let leadInfo;
                if (leadId) {
                  const lead = await prisma.lead.findUnique({ where: { id: leadId } })
                  if (lead) {
                    leadInfo = {
                      firstName: lead.firstName,
                      lastName: lead.lastName,
                      company: lead.company || undefined,
                      title: lead.title || undefined,
                      customFields: lead.customFields as Record<string, any>
                    }
                  }
                }

                const conversation = new ConversationEngine(openai, {
                    agentId: agent.id,
                    leadId: leadId || undefined,
                    campaignId: campaignId || undefined,
                    callSid: callSid!,
                    direction: 'outbound', // Or inbound depending on context
                    leadInfo
                });

                await conversation.initialize({
                    name: agent.name,
                    personality: agent.personality,
                    systemPrompt: agent.systemPrompt,
                    qualifyingQuestions: agent.qualifyingQuestions,
                    objectionHandling: agent.objectionHandling
                });

                pipeline = new VoicePipeline(conversation, {
                    provider: agent.voiceProvider.toLowerCase() as any,
                    voiceId: agent.voiceId,
                    speed: agent.voiceSpeed,
                    pitch: agent.voicePitch
                }, openai);
             }
          }

        } else if (data.event === 'media' && pipeline) {
           // Basic demonstration of audio processing
           // In a real application, you'd buffer the base64 mulaw audio and pass it to Deepgram
           const base64Audio = data.media.payload;
           const audioBuffer = Buffer.from(base64Audio, 'base64');

           // Example of processing (would normally be async/event-driven)
           // const result = await pipeline.processAudio(audioBuffer);
           // if (result.audioResponse.length > 0) {
           //   ws.send(JSON.stringify({
           //     event: 'media',
           //     streamSid: data.streamSid,
           //     media: { payload: result.audioResponse.toString('base64') }
           //   }));
           // }
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

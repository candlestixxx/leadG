import { ConversationEngine, ConversationContext, ConversationResult } from './conversation-engine'
import OpenAI from 'openai'

// ─── Voice Pipeline: STT → AI → TTS ────────────────────────

export interface VoiceConfig {
  provider: 'elevenlabs' | 'openai' | 'playht' | 'cartesia'
  voiceId: string
  speed: number
  pitch: number
  stability?: number
  similarityBoost?: number
}

export class VoicePipeline {
  private conversation: ConversationEngine
  private voiceConfig: VoiceConfig
  private openai: OpenAI

  constructor(
    conversation: ConversationEngine,
    voiceConfig: VoiceConfig,
    openai: OpenAI
  ) {
    this.conversation = conversation
    this.voiceConfig = voiceConfig
    this.openai = openai
  }

  // Convert user speech to text using Deepgram or Whisper
  async speechToText(audioBuffer: Buffer, mimeType: string = 'audio/wav'): Promise<string> {
    try {
      // Using OpenAI Whisper API
      const file = new File([new Uint8Array(audioBuffer)], 'audio.wav', { type: mimeType })

      const transcription = await this.openai.audio.transcriptions.create({
        file,
        model: 'whisper-1',
        language: 'en',
        response_format: 'text'
      })

      return transcription.trim()
    } catch (error) {
      console.error('STT Error:', error)
      return ''
    }
  }

  // Convert text to speech
  async textToSpeech(text: string): Promise<Buffer> {
    const provider = this.voiceConfig.provider

    switch (provider) {
      case 'elevenlabs':
        return this.elevenLabsTTS(text)
      case 'openai':
        return this.openaiTTS(text)
      case 'playht':
        return this.playHtTTS(text)
      case 'cartesia':
        return this.cartesiaTTS(text)
      default:
        return this.openaiTTS(text)
    }
  }

  private async elevenLabsTTS(text: string): Promise<Buffer> {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${this.voiceConfig.voiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY!,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_turbo_v2_5',
          voice_settings: {
            stability: this.voiceConfig.stability || 0.5,
            similarity_boost: this.voiceConfig.similarityBoost || 0.75,
            speed: this.voiceConfig.speed,
            style: 0.3
          }
        })
      }
    )

    if (!response.ok) throw new Error(`ElevenLabs error: ${response.statusText}`)
    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer)
  }

  private async openaiTTS(text: string): Promise<Buffer> {
    const voiceMap: Record<string, string> = {
      'male': 'onyx',
      'female': 'nova',
      'male_warm': 'echo',
      'female_warm': 'shimmer',
      'male_deep': 'fable',
      'female_bright': 'alloy'
    }

    const voice = voiceMap[this.voiceConfig.voiceId] || 'nova'

    const response = await this.openai.audio.speech.create({
      model: 'tts-1-hd',
      voice: voice as any,
      input: text,
      speed: this.voiceConfig.speed
    })

    const buffer = Buffer.from(await response.arrayBuffer())
    return buffer
  }

  private async playHtTTS(text: string): Promise<Buffer> {
    const response = await fetch('https://api.play.ht/api/v2/tts/stream', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PLAYHT_API_KEY}`,
        'X-User-Id': process.env.PLAYHT_USER_ID!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text,
        voice: this.voiceConfig.voiceId,
        quality: 'premium',
        output_format: 'mp3',
        speed: this.voiceConfig.speed
      })
    })

    if (!response.ok) throw new Error(`PlayHT error: ${response.statusText}`)
    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer)
  }

  private async cartesiaTTS(text: string): Promise<Buffer> {
    const response = await fetch('https://api.cartesia.ai/tts/bytes', {
      method: 'POST',
      headers: {
        'Cartesia-Version': '2024-06-10',
        'X-API-Key': process.env.CARTESIA_API_KEY!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model_id: 'sonic-english',
        transcript: text,
        voice: {
          mode: 'id',
          id: this.voiceConfig.voiceId
        },
        output_format: {
          container: 'wav',
          encoding: 'pcm_f32le',
          sample_rate: 24000
        }
      })
    })

    if (!response.ok) throw new Error(`Cartesia error: ${response.statusText}`)
    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer)
  }

  // Full pipeline: audio in → text → AI → speech out
  async processAudio(audioBuffer: Buffer): Promise<{
    userText: string
    aiResponse: string
    audioResponse: Buffer
    result: ConversationResult
  }> {
    // Step 1: Speech to Text
    const userText = await this.speechToText(audioBuffer)
    if (!userText) {
      return {
        userText: '',
        aiResponse: "I'm sorry, I didn't catch that. Could you repeat that?",
        audioResponse: Buffer.alloc(0),
        result: {
          response: "I'm sorry, I didn't catch that.",
          action: 'continue',
          sentiment: 0,
          buyingSignalStrength: 0,
          shouldTransfer: false,
          metadata: {}
        }
      }
    }

    // Step 2: Process through conversation engine
    const result = await this.conversation.processInput(userText)

    // Step 3: Text to Speech
    const audioResponse = await this.textToSpeech(result.response)

    return { userText, aiResponse: result.response, audioResponse, result }
  }

  // Process text input (for DTMF or text-based channels)
  async processText(text: string): Promise<ConversationResult> {
    return this.conversation.processInput(text)
  }
}

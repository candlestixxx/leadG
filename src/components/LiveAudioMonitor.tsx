'use client'

import { useState, useEffect, useRef } from 'react'
import { Mic, PhoneOff, Ear } from 'lucide-react'

export function LiveAudioMonitor({ callSid, agentId }: { callSid?: string, agentId?: string }) {
  const [isConnected, setIsConnected] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    // Only connect if we actively want to monitor
    if (!isListening) {
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
      setIsConnected(false)
      return
    }

    // Connect to the Live Audio WebSocket server
    const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const audioPort = process.env.NEXT_PUBLIC_LIVE_AUDIO_PORT || '8090';
    const wsUrl = wsProtocol + '://' + window.location.hostname + ':' + audioPort + '/?role=monitor&callSid=' + (callSid || '') + '&agentId=' + (agentId || '');
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      setIsConnected(true)
      console.log('Connected to Live Audio Stream')
      // Send a connect payload to specify which call we want to monitor
      if (callSid) {
         ws.send(JSON.stringify({ event: 'manager_connect', callSid, agentId }))
      }
    }

    ws.onmessage = (event) => {
       // In a full WebRTC integration, this buffer data would be pushed into an AudioContext for playback.
       // console.log("Received audio buffer")
    }

    ws.onclose = () => {
      setIsConnected(false)
      setIsListening(false)
    }

    return () => {
      ws.close()
    }
  }, [isListening, callSid, agentId])

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setIsListening(!isListening)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
          isListening
            ? 'bg-[var(--danger)]/20 text-[var(--danger)] hover:bg-[var(--danger)]/30'
            : 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] hover:bg-[var(--border)]'
        }`}
      >
        {isListening ? (
          <>
            <PhoneOff className="w-3.5 h-3.5" /> Stop Monitoring
          </>
        ) : (
          <>
            <Ear className="w-3.5 h-3.5" /> Listen Live
          </>
        )}
      </button>

      {isListening && isConnected && (
        <span className="flex items-center gap-1.5 text-xs text-[var(--success)] animate-pulse">
           <Mic className="w-3 h-3" /> Live
        </span>
      )}
    </div>
  )
}

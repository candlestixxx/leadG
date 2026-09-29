import { EventEmitter } from 'events';

class SSEEmitter extends EventEmitter {}
export const sseEmitter = new SSEEmitter();

export function broadcastEvent(event: string, data: any) {
  sseEmitter.emit('broadcast', { event, data });
}

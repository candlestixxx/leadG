const { attachWebSocketServer } = require('./src/lib/telephony/websocket-server.ts');
console.log(typeof attachWebSocketServer === 'function' ? 'WebSocket Server found' : 'WebSocket Server missing');

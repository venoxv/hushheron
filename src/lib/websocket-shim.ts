// Midnight's indexer provider imports a named WebSocket from isomorphic-ws.
// Its browser package exposes only a CommonJS default, so use the browser API.
export const WebSocket = globalThis.WebSocket;

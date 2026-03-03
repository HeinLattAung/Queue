import { io } from 'socket.io-client';

let socket = null;
const activeRooms = new Set();
const reconnectCallbacks = new Set();

function getSocket() {
  if (!socket) {
    const socketUrl = import.meta.env.VITE_SOCKET_URL || window.location.origin;
    socket = io(socketUrl, {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
      timeout: 20000,
      transports: ['websocket', 'polling'],
    });

    // On reconnect, re-join all active rooms and trigger state re-sync
    socket.on('connect', () => {
      console.log('[socket] Connected:', socket.id);

      // Re-join rooms that were active before disconnect
      for (const room of activeRooms) {
        socket.emit('join', room);
        console.log('[socket] Re-joined room:', room);
      }

      // Trigger all registered reconnect callbacks (REST state re-sync)
      for (const cb of reconnectCallbacks) {
        try { cb(); } catch (e) { console.error('[socket] Reconnect callback error:', e); }
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('[socket] Disconnected:', reason);
      if (reason === 'io server disconnect') {
        // Server explicitly disconnected — reconnect manually
        socket.connect();
      }
      // Otherwise socket.io auto-reconnect handles it
    });

    socket.on('reconnect_attempt', (attempt) => {
      if (attempt % 5 === 0) {
        console.log(`[socket] Reconnection attempt #${attempt}`);
      }
    });
  }

  if (!socket.connected) {
    socket.connect();
  }

  return socket;
}

export function joinRoom(room) {
  const s = getSocket();
  activeRooms.add(room);
  s.emit('join', room);
}

export function leaveRoom(room) {
  const s = getSocket();
  activeRooms.delete(room);
  s.emit('leave', room);
}

export function onEvent(event, cb) {
  const s = getSocket();
  s.on(event, cb);
}

export function offEvent(event, cb) {
  const s = getSocket();
  s.off(event, cb);
}

export function isConnected() {
  return socket?.connected ?? false;
}

/**
 * Register a callback to run when the socket reconnects.
 * Use this to re-fetch REST state that may have been missed during disconnect.
 * Returns an unsubscribe function.
 */
export function onReconnect(cb) {
  reconnectCallbacks.add(cb);
  return () => reconnectCallbacks.delete(cb);
}

export default getSocket;

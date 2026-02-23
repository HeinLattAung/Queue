import { io } from 'socket.io-client';

let socket = null;

function getSocket() {
  if (!socket) {
    socket = io(window.location.origin, {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
  }
  if (!socket.connected) {
    socket.connect();
  }
  return socket;
}

export function joinRoom(room) {
  const s = getSocket();
  s.emit('join', room);
}

export function leaveRoom(room) {
  const s = getSocket();
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

export default getSocket;

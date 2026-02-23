import { useEffect, useRef, useState } from 'react';
import { joinRoom, leaveRoom, onEvent, offEvent, isConnected } from '../services/socket';
import getSocket from '../services/socket';

export default function useSocket(room) {
  const [connected, setConnected] = useState(false);
  const roomRef = useRef(room);

  useEffect(() => {
    roomRef.current = room;
    if (!room) return;

    const socket = getSocket();

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    if (socket.connected) {
      setConnected(true);
    }

    joinRoom(room);

    return () => {
      leaveRoom(room);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, [room]);

  return { on: onEvent, off: offEvent, connected };
}

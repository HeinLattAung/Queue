import { useEffect, useState } from 'react';
import { joinRoom, leaveRoom, onEvent, offEvent } from '../services/socket';
import getSocket from '../services/socket';

export default function useSocket(room, accessToken) {
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!room) return;
    let active = true;
    const socket = getSocket();
    const onDisconnect = () => { if (active) setConnected(false); };
    socket.on('disconnect', onDisconnect);
    joinRoom(room, accessToken, (result) => {
      if (!active) return;
      setConnected(Boolean(result?.ok));
      setError(result?.ok ? null : result?.error || 'Live updates unavailable');
    });
    return () => {
      active = false;
      leaveRoom(room);
      socket.off('disconnect', onDisconnect);
    };
  }, [room, accessToken]);

  return { on: onEvent, off: offEvent, connected: Boolean(room) && connected, error };
}

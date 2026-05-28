'use client';

import { io, Socket } from 'socket.io-client';
import { useEffect, useRef } from 'react';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:4000';

let singleton: Socket | null = null;

export function getSocket(): Socket {
  if (singleton) return singleton;
  singleton = io(WS_URL, { transports: ['websocket'], autoConnect: true, reconnection: true });
  return singleton;
}

export function useLiveProfile(
  game: string | undefined,
  platform: string | undefined,
  providerId: string | undefined,
  handler: (event: string, payload: unknown) => void,
) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!game || !providerId) return;
    const s = getSocket();
    const room = { game, platform: platform ?? '_', providerId };
    const cb = (event: string) => (payload: unknown) => handlerRef.current(event, payload);

    const onStats = cb('stats:updated');
    const onRank  = cb('rank:changed');
    const onLevel = cb('level:up');
    const onMatch = cb('match:new');

    s.emit('subscribe:profile', room);
    s.on('stats:updated', onStats);
    s.on('rank:changed', onRank);
    s.on('level:up', onLevel);
    s.on('match:new', onMatch);

    return () => {
      s.emit('unsubscribe:profile', room);
      s.off('stats:updated', onStats);
      s.off('rank:changed', onRank);
      s.off('level:up', onLevel);
      s.off('match:new', onMatch);
    };
  }, [game, platform, providerId]);
}

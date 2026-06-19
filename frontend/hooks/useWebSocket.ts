import { useEffect, useRef, useCallback } from 'react';
import { Client, type IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useJvmStore } from '@/store/jvmStore';
import type { JvmSnapshot } from '@/types/jvm';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:8080/ws';

export function useWebSocket(sessionId: string | null) {
  const clientRef = useRef<Client | null>(null);
  const {
    addSnapshot,
    setExecutionComplete,
    setExecutionError,
    setIsExecuting,
  } = useJvmStore();

  const disconnect = useCallback(() => {
    if (clientRef.current?.active) {
      clientRef.current.deactivate();
      clientRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!sessionId) return;

    disconnect();

    const client = new Client({
      webSocketFactory: () => new SockJS(WS_URL),
      reconnectDelay: 5000,
      onConnect: () => {
        console.log(`[WS] Connected. Subscribing to session: ${sessionId}`);
        setIsExecuting(true);

        client.subscribe(`/topic/jvm/${sessionId}`, (message: IMessage) => {
          try {
            const snapshot: JvmSnapshot = JSON.parse(message.body);

            if (snapshot.eventType === 'EXECUTION_COMPLETE') {
              setExecutionComplete(true);
              return;
            }

            if (snapshot.eventType === 'ERROR') {
              setExecutionError(snapshot.currentBytecode ?? 'Unknown error');
              return;
            }

            addSnapshot(snapshot);
          } catch (err) {
            console.error('[WS] Failed to parse snapshot:', err);
          }
        });
      },
      onDisconnect: () => {
        console.log('[WS] Disconnected');
      },
      onStompError: (frame) => {
        console.error('[WS] STOMP error:', frame.headers.message);
        setExecutionError('WebSocket connection error');
      },
    });

    client.activate();
    clientRef.current = client;

    return () => {
      disconnect();
    };
  }, [sessionId, addSnapshot, setExecutionComplete, setExecutionError,
      setIsExecuting, disconnect]);

  return { disconnect };
}

import { useEffect, useRef } from "react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export function useSSE(address: string | null, onNewEmail: () => void) {
  const onNewEmailRef = useRef(onNewEmail);
  onNewEmailRef.current = onNewEmail;

  useEffect(() => {
    if (!address) return;

    let es: EventSource | null = null;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;
    let retryDelay = 1000;
    let destroyed = false;

    function connect() {
      if (destroyed) return;
      const url = `${BASE}/api/sse?address=${encodeURIComponent(address!)}`;
      es = new EventSource(url);

      es.onmessage = () => {
        retryDelay = 1000;
        onNewEmailRef.current();
      };

      es.onerror = () => {
        es?.close();
        es = null;
        if (!destroyed) {
          retryTimeout = setTimeout(() => {
            retryDelay = Math.min(retryDelay * 2, 30000);
            connect();
          }, retryDelay);
        }
      };
    }

    connect();

    return () => {
      destroyed = true;
      es?.close();
      if (retryTimeout) clearTimeout(retryTimeout);
    };
  }, [address]);
}

import { useCallback, useEffect, useState } from 'react';
import { probeOllama, type OllamaReachability } from '@/core/adapters';

interface State {
  loading: boolean;
  data: OllamaReachability | null;
}

export function useOllamaStatus(pollMs = 0) {
  const [state, setState] = useState<State>({ loading: true, data: null });

  const refresh = useCallback(async () => {
    setState((prev) => ({ loading: true, data: prev.data }));
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2000);
    try {
      const data = await probeOllama(controller.signal);
      setState({ loading: false, data });
    } catch {
      setState({
        loading: false,
        data: { status: 'unreachable', hint: 'unknown', message: 'probe failed' },
      });
    } finally {
      clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    refresh();
    if (pollMs > 0) {
      const id = window.setInterval(refresh, pollMs);
      return () => window.clearInterval(id);
    }
    return undefined;
  }, [pollMs, refresh]);

  return { ...state, refresh };
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { getErrorMessage } from '../services/api';

/**
 * Small data-loading hook.
 *   const { data, loading, error, reload, refresh, setData } = useFetch(() => api(), [deps]);
 * reload()  -> shows the loading state again.   refresh() -> silent refetch (used for real-time updates).
 */
export function useFetch(fetcher, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const requestId = useRef(0);

  const run = useCallback(async ({ silent = false } = {}) => {
    const id = ++requestId.current;
    if (!silent) setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await fetcherRef.current();
      if (id === requestId.current) setState({ data, loading: false, error: null });
    } catch (error) {
      if (id !== requestId.current) return;
      // A failed silent refresh keeps the old data on screen.
      setState((s) => (silent ? s : { data: null, loading: false, error: getErrorMessage(error) }));
    }
  }, []);

  useEffect(() => {
    run();
    return () => {
      requestId.current += 1; // ignore late responses after unmount / dependency change
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const setData = useCallback((updater) => {
    setState((s) => ({ ...s, data: typeof updater === 'function' ? updater(s.data) : updater }));
  }, []);

  return { ...state, reload: () => run(), refresh: () => run({ silent: true }), setData };
}

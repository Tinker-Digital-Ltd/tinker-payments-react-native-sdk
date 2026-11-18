import { useCallback, useEffect, useRef, useState } from 'react';
import type { CustomerInfo, CustomerOfferings, EntitlementStatus, TinkerClient } from 'tinker-payments-web-sdk';

export interface QueryResult<T> {
  data: T | null;
  error: Error | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

function useQuery<T>(load: () => Promise<T>, deps: unknown[]): QueryResult<T> {
  const [state, setState] = useState<{ data: T | null; error: Error | null; loading: boolean }>({ data: null, error: null, loading: true });
  const latest = useRef(0);

  const refresh = useCallback(async () => {
    const id = ++latest.current;
    setState((s) => ({ ...s, error: null, loading: true }));
    try {
      const data = await load();
      if (id === latest.current) setState({ data, error: null, loading: false });
    } catch (error) {
      if (id === latest.current) setState((s) => ({ ...s, error: error instanceof Error ? error : new Error(String(error)), loading: false }));
    }
  }, deps);

  useEffect(() => {
    void refresh();
    return () => {
      latest.current++;
    };
  }, [refresh]);

  return { ...state, refresh };
}

export function useCustomerInfo(client: TinkerClient): QueryResult<CustomerInfo> {
  return useQuery(() => client.getCustomerInfo(), [client]);
}

export function useEntitlement(client: TinkerClient, identifier: string): QueryResult<EntitlementStatus> {
  return useQuery(() => client.getEntitlement(identifier), [client, identifier]);
}

export function useOfferings(client: TinkerClient): QueryResult<CustomerOfferings> {
  return useQuery(() => client.getOfferings(), [client]);
}

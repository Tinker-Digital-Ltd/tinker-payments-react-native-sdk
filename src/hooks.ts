import { useCallback, useEffect, useRef, useState } from 'react';
import type { CustomerInfo, CustomerOfferings, EntitlementStatus, TinkerClient } from 'tinker-payments-web-sdk';

export interface QueryResult<T> {
  data: T | null;
  error: Error | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

interface State<T> {
  data: T | null;
  error: Error | null;
  loading: boolean;
  owner: unknown;
}

const idle = { data: null, error: null, loading: true };

function useQuery<T>(load: () => Promise<T>, deps: unknown[]): QueryResult<T> {
  const [state, setState] = useState<State<T>>({ ...idle, owner: null });
  const latest = useRef(0);

  const refresh = useCallback(async () => {
    const id = ++latest.current;
    setState((s) => ({ data: s.owner === refresh ? s.data : null, error: null, loading: true, owner: refresh }));
    try {
      const data = await load();
      if (id === latest.current) setState({ data, error: null, loading: false, owner: refresh });
    } catch (error) {
      if (id === latest.current) setState({ data: null, error: error instanceof Error ? error : new Error(String(error)), loading: false, owner: refresh });
    }
  }, deps);

  useEffect(() => {
    void refresh();
    return () => {
      latest.current++;
    };
  }, [refresh]);

  const { data, error, loading } = state.owner === refresh ? state : idle;
  return { data, error, loading, refresh };
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

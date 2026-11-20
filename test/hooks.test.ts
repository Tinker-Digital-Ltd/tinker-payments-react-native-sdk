import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { act, create } from 'react-test-renderer';
import { TinkerClient, errors, useCustomerInfo, useEntitlement, useOfferings, type QueryResult, type TinkerFetch } from '../src';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function makeClient(handler: (url: string) => { status: number; body: unknown }) {
  const urls: string[] = [];
  const fetch: TinkerFetch = async (url) => {
    urls.push(url);
    const { status, body } = handler(url);
    return { status, text: async () => JSON.stringify(body), headers: new Headers() };
  };
  return { client: new TinkerClient({ publicKey: 'pk_test_x', getCustomerToken: async () => 't', fetch }), urls };
}

async function render<T>(useHook: () => QueryResult<T>) {
  let current!: QueryResult<T>;
  function Probe() {
    current = useHook();
    return null;
  }
  await act(async () => {
    create(React.createElement(Probe));
  });
  return () => current;
}

const ok = (data: unknown) => ({ status: 200, body: { success: true, data } });

test('paywallUrl is available on the re-exported client', async () => {
  const { client } = makeClient(() => ok({}));
  const url = new URL(await client.paywallUrl({ returnUrl: 'myapp://done', offering: 'default' }));
  assert.equal(url.origin + url.pathname, 'https://tinkerpayments.com/paywall');
  assert.deepEqual(Object.fromEntries(url.searchParams), { pk: 'pk_test_x', token: 't', return_url: 'myapp://done', offering: 'default' });
});

test('useCustomerInfo loads data', async () => {
  const { client } = makeClient(() => ok({ external_customer_id: 'c1' }));
  const result = await render(() => useCustomerInfo(client));
  assert.equal(result().loading, false);
  assert.deepEqual(result().data, { external_customer_id: 'c1' });
  assert.equal(result().error, null);
});

test('useEntitlement requests the identifier', async () => {
  const { client, urls } = makeClient(() => ok({ identifier: 'pro', is_active: true }));
  const result = await render(() => useEntitlement(client, 'pro'));
  assert.equal(result().data?.is_active, true);
  assert.equal(urls[0], 'https://sandbox-api.tinkerpayments.com/v1/client/entitlements/pro');
});

test('useOfferings exposes errors', async () => {
  const { client } = makeClient(() => ({ status: 401, body: { success: false, error: { code: 'UNAUTHORIZED', message: 'no' } } }));
  const result = await render(() => useOfferings(client));
  assert.equal(result().loading, false);
  assert.equal(result().data, null);
  assert.ok(result().error instanceof errors.ApiError);
});

test('refresh reloads data', async () => {
  let n = 0;
  const { client } = makeClient(() => ok({ current_offering_identifier: `o${++n}`, offerings: [] }));
  const result = await render(() => useOfferings(client));
  assert.equal(result().data?.current_offering_identifier, 'o1');
  await act(async () => {
    await result().refresh();
  });
  assert.equal(result().data?.current_offering_identifier, 'o2');
});

test('identifier change clears previous data', async () => {
  const { client } = makeClient((url) => ok({ identifier: url.split('/').pop(), is_active: true }));
  let identifier = 'a';
  const seen: { current?: QueryResult<{ identifier: string }> } = {};
  function Probe() {
    seen.current = useEntitlement(client, identifier) as QueryResult<{ identifier: string }>;
    return null;
  }
  let renderer!: ReturnType<typeof create>;
  await act(async () => {
    renderer = create(React.createElement(Probe));
  });
  assert.equal(seen.current!.data?.identifier, 'a');
  identifier = 'b';
  act(() => {
    renderer.update(React.createElement(Probe));
  });
  assert.equal(seen.current!.data as unknown, null);
  assert.equal(seen.current!.loading, true);
  await act(async () => {});
  assert.equal(seen.current!.data?.identifier as string, 'b');
});

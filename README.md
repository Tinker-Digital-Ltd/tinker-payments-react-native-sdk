# tinker-payments-react-native-sdk

React Native SDK for Tinker Payments customer access. Re-exports [`tinker-payments-web-sdk`](../tinker-payments-web-sdk) and adds React hooks. No native modules. It never holds your app secret.

## Install

```sh
npm install tinker-payments-react-native-sdk
```

## Setup

Your backend mints the customer token with the server SDK (`POST /v1/merchant/customers/{id}/token`):

```ts
import { TinkerClient } from 'tinker-payments-react-native-sdk';

export const tinker = new TinkerClient({
  publicKey: 'pk_live_...',
  getCustomerToken: async () => (await fetch('https://your.backend/tinker-token')).text()
});
```

Keys starting with `pk_test_` use the sandbox API. On `TOKEN_INVALID` the SDK fetches a new token and retries once. See the web SDK for the full client API (`getCustomerInfo`, `getEntitlement`, `isEntitled`, `getOfferings`, `setAttributes`) and errors.

## Hooks

Each returns `{ data, error, loading, refresh }`.

```tsx
import { useCustomerInfo, useEntitlement, useOfferings } from 'tinker-payments-react-native-sdk';

function Paywall() {
  const { data: pro, loading } = useEntitlement(tinker, 'pro');
  const { data: offerings } = useOfferings(tinker);
  const { data: customer, refresh } = useCustomerInfo(tinker);
  if (loading) return null;
  return pro?.is_active ? <Pro /> : <Offerings offerings={offerings} />;
}
```

## Purchases

Purchases are started from your backend with the server SDK's payment initiate, using `productId`, `externalCustomerId` and `presentedOfferingId`.

## Local development

Until the web SDK is published, link it: `npm install --no-save ../tinker-payments-web-sdk`.

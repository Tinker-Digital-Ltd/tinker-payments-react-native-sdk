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

Keys starting with `pk_test_` use the sandbox API. On `TOKEN_INVALID` the SDK fetches a new token and retries once. See the web SDK for the full client API (`getCustomerInfo`, `getEntitlement`, `isEntitled`, `getOfferings`, `setAttributes`, `paywallUrl`) and errors.

`setAttributes` rejects keys starting with `$` with 403 `RESERVED_ATTRIBUTE`; those are set from the server only.

`getCustomerInfo` returns 404 `CUSTOMER_NOT_FOUND` for a customer with no purchases, promotions or attributes yet.

Create the client once, outside components or with `useMemo`, not on every render.

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

## Hosted paywall

```ts
import { Linking } from 'react-native';

await Linking.openURL(await tinker.paywallUrl({ returnUrl: 'myapp://after-purchase', offering: 'default' }));
```

The URL carries `pk`, the current customer token, `return_url` and the optional `offering` (omit it for the current offering), all URL-encoded. The hosted page only accepts a `https` return URL (or `http://localhost`), so use a universal link or an https page that opens your app. The customer comes back with `package`, `offering`, `product_id` and `billing_period` appended. Pass `paywallBaseUrl` to the client to override the site origin (default `https://tinkerpayments.com`, path `/paywall`).

## Purchases

Purchases are started from your backend with the server SDK's payment initiate, using `productId`, `externalCustomerId` and `presentedOfferingId`.

## Local development

Until the web SDK is published, link it: `npm install --no-save ../tinker-payments-web-sdk`.

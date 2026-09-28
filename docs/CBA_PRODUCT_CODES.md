# CBA product-code settings

Settings → CBA Product Codes edits both codes with:

- `PUT /v1/bank-admin/settings/cba/product-codes`
- JSON fields `individualProductCode` and `corporateProductCode`, retained as strings.
- Proposed values supplied by the operator: individual `208`, corporate `103`.
- No GET endpoint was supplied. These initial values are labelled as proposed; the page never claims to have loaded the current configuration.
- Save sends one request and blocks duplicate clicks. Success is displayed only for an accepted HTTP response; an explicit `success: false` body remains an error. Empty 204 responses are supported.

## Credentials

The supplied admin key is not stored in source, documentation or frontend configuration.

The local Vite proxy supports **server-only** environment variables:

- `BANK_ADMIN_API_KEY`: provide securely in the process environment.
- `BANK_ADMIN_USERNAME`: the backend admin username, e.g. `superadmin`.
- `VITE_API_PROXY_TARGET`: the backend origin.
- `VITE_API_BASE_URL`: use `/api/v1` so requests go through the proxy.

Restart the local development server after configuring the environment. For this PUT route the proxy replaces incoming X-Admin-Key and X-Admin-Username with server-configured values, and injects credentials only for loopback requests carrying a Bearer header. This is a local development facility, not a production authentication service.

Production must route through an authenticated backend proxy that verifies the logged-in administrator and authorizes this settings update before adding the privileged key and trusted username. Vite's development proxy is not included in a production build. Do not prefix the privileged key with `VITE_` or put it into the browser bundle.

No backend update was performed during implementation.

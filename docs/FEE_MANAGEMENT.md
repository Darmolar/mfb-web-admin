# Fee management

The **Settings → Fees** tab reads the fee summary, paged charges, batches, and
fee configuration from the bank-admin API. It sends a manual debit only after
the operator confirms the pending amount. A debit response with `status: FAILED`
is displayed as a failure even if the HTTP request and outer response succeed.

For local development, configure the Vite server environment rather than the
browser bundle:

```text
VITE_API_PROXY_TARGET=https://your-backend
BANK_ADMIN_API_KEY=your-admin-key
BANK_ADMIN_USERNAME=your-admin-name
```

The development proxy supplies those credentials only for the fee routes and
the CBA product-code settings route, and only to a local authenticated request.
Production must provide equivalent credential handling in its authenticated
server-side proxy. Never set `VITE_ADMIN_API_KEY` for production.

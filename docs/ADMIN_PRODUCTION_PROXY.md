# Admin production login and proxy

## Confirmed failure

On 29 September 2026, the deployed dashboard and KYC stats routes returned HTTP 401 with `Invalid admin key.`. The production browser omitted X-Admin-Key, while vercel.json forwarded requests directly to the backend. The frontend cleared local authentication and reloaded for every 401, so successful OTP login was immediately followed by a return to login.

## Deployment prerequisites

Set these in the Vercel project's **Production** environment before deploying this change:

- `BANK_ADMIN_API_KEY`: the valid backend admin key. Keep it server-only. `VITE_ADMIN_API_KEY` is accepted by the function for migration but must not be exposed in production client code.
- `BANK_ADMIN_SESSION_SECRET`: an independent cryptographically random secret of at least 32 characters. Generate one privately, for example with Node's `crypto.randomBytes(32).toString('hex')`. Do not reuse the backend key.
- Optional `BANK_API_BASE_URL`: backend base URL including `/api/v1`; defaults to the currently configured test backend. Prefer the bank's HTTPS endpoint when available.

Do not commit secret values. If an admin key was previously included in frontend code or repository history, coordinate its rotation with the backend administrator.

The production client always uses the same-origin `/api/v1` route. Vercel routes bank-admin requests through `api/admin-proxy.js`, following its [Node.js function convention](https://vercel.com/docs/functions/runtimes/node-js). Other API routes retain their existing rewrite.

The proxy creates a Secure/HttpOnly/SameSite=Strict cookie only after successful upstream MFA. Its signature uses BANK_ADMIN_SESSION_SECRET and binds the cookie to the issued bearer token. Subsequent requests need that matching bearer token and valid cookie before the proxy adds privileged headers. Arbitrary bearer strings do not grant access. Cookie lifetime is capped at one hour and at the token's expiry when present. Backend token/role authorization still applies.

Missing/invalid server configuration is reported explicitly, not as user session expiry. Invalid password/OTP attempts preserve the login form. Actual authenticated 401 responses clear the matching current session without a page reload. Late responses from old sessions cannot clear a new login. Role creation now uses the authenticated client rather than a direct request with an embedded admin key.

## Validation

- TypeScript build: passed.
- Regression tests: 18 passed, including proxy session enforcement and logout behavior.
- Production bundle: passed.
- Live authenticated verification: pending Vercel environment setup and deployment.

After deployment, refresh and sign in again to establish the new server cookie. Verify the dashboard's summary, KYC, compliance and transaction requests, an incorrect OTP, logout, and a new login. Existing browser sessions without the proxy cookie must sign in once again.

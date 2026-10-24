# Backend request: identity records, approvals, roles, admin edit (updated 2026-10-24)

## 1–2. Identity records and image approvals: delivered

The backend published the "Identity Verification Admin API" (`/v1/bank-admin/identity…`, `…/identity/image-requests…`).
The admin UI now uses it as documented: list (name / idType / idNumber filters), detail with `faceImageBase64`,
reverify (no body, overwrites immediately, audit-logged), image submit (`image`, `verified=true`, `notes`), and
image-request list / approve / reject with `{ notes }`.

Remaining asks on that API:

- **Reviewers cannot see the submitted photo.** The image-request list has no image and there is no endpoint to fetch
  it, so an approver is approving a photo they have not seen. Please add the pending image (e.g.
  `GET /identity/image-requests/{reqId}` returning `proposedImageBase64`, or include it in the list).
- **Block self-approval on the server.** The UI hides Review when `requestedBy` matches the signed-in admin, but only
  the server can enforce it. Approve/reject by the requester should return 403.
- **Log record views.** Opening a record shows personal data and the face photo; investigators' access should be
  in the audit trail too, not only reverify/image actions.
- **CAC and driver's licence.** Compliance asked for these types; the API only stores BVN and NIN. Confirm whether
  they will be added.
- **Reverify overwrites without review.** It replaces details and photo immediately. Confirm that is intended, or
  route it through the same approval flow.
- **The published doc contains the live `X-Admin-Key`.** Remove it from the doc and rotate the key.

## 3. Roles (endpoints exist; OpenAPI and Postman disagree)

The OpenAPI file says `PUT /roles/{id}/permissions` takes `{ permissionIds }`; Postman shows `{ permissions: [codes], adminId }`
and, in a second example, `{ permissionCodes: [codes] }`. `GET /roles/permissions` returns plain codes, so the UI sends
codes under both `permissions` and `permissionCodes`, plus `adminId`. Create/update role send `adminId` (the live
backend rejected create without it). Please confirm which field is authoritative and fix the OpenAPI file.

## 4. Edit admin user (role and department)

- Role: the UI uses `POST /roles/{roleId}/assign` with `{ adminUserId, performedBy }` (Postman) for roles created in
  Role Management.
- Department, and built-in roles that have no role id: the UI calls `PATCH /v1/bank-admin/users/{id}` with
  `{ name, role, department, adminId }`. **This endpoint is in neither Postman nor OpenAPI.** Please add it (SUPER_ADMIN
  only, audit-logged) or tell us the right one.

## 5. CardFusion: device secrets returned to the browser (security, urgent)

`GET /v1/bank-admin/cardfusion/devices` returns, for every device, its live `deviceToken` and the office registration
`officeToken.token`. Anyone with admin portal access (or a browser extension, proxy log or HAR file) can read these
and impersonate a branch device. The web admin never displays them, but they still arrive in the response.

Please drop `deviceToken` and `officeToken.token` from this response. The UI only needs `id`, `hardwareId`, `status`,
`registeredAt`, `revokedAt` and `officeToken.description`. Rotate the device tokens currently issued (they have been
sent to the browser since this endpoint went live). Also:

- None of the CardFusion admin endpoints are in OpenAPI or Postman; please document them.
- There is no way to deactivate a CardFusion staff user or reset their password from the admin. A staff member who
  leaves can still sign in on any device that is not revoked.

## 6. Admin sessions end after 15 minutes regardless of activity

The admin access token has a fixed 15-minute lifetime (`exp - iat = 900s`), MFA verify returns no refresh token, and
`POST /v1/bank-admin/auth/refresh` returns 404. Staff are signed out mid-task. Please either add an admin refresh
endpoint (refresh token returned at MFA verify) so the portal can renew while the user is active and still sign out
after 15 minutes idle, or lengthen the token and enforce the idle timeout on the server.

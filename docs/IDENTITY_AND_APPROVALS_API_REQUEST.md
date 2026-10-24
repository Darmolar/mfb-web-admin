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

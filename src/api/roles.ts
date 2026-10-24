// The OpenAPI file documents role requests but not their responses, so every
// response is read defensively here and an unreadable one fails loudly.

export type RoleRecord = {
  id: string
  name: string
  description: string
  /** Permission ids or codes the role currently holds. */
  permissionKeys: string[]
  /** Built-in roles (`system: true`) cannot be deleted. */
  system: boolean
}

export type PermissionRecord = {
  id: string
  code: string
  description: string
  group: string
}

type Obj = Record<string, unknown>

const isObj = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v)
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : '')

/** Accepts a bare array, a Spring page ({ content }) or a named list ({ roles }, { permissions }). */
export function readList(body: unknown, ...keys: string[]): unknown[] {
  if (Array.isArray(body)) return body
  if (isObj(body)) {
    for (const key of ['content', 'items', ...keys]) {
      if (Array.isArray(body[key])) return body[key] as unknown[]
    }
  }
  throw new Error('The server returned a list in an unexpected format.')
}

function permissionKey(v: unknown) {
  if (isObj(v)) return str(v.id) || str(v.code) || str(v.name)
  return str(v)
}

export function readRole(v: unknown): RoleRecord | null {
  if (!isObj(v)) return null
  const id = str(v.id) || str(v.roleId)
  const name = str(v.name) || str(v.roleName)
  if (!id || !name) return null
  const perms = Array.isArray(v.permissions) ? v.permissions : Array.isArray(v.permissionIds) ? v.permissionIds : []
  return { id, name, description: str(v.description), permissionKeys: perms.map(permissionKey).filter(Boolean), system: v.system === true }
}

export function readRoles(body: unknown): RoleRecord[] {
  return readList(body, 'roles').map(readRole).filter((r): r is RoleRecord => r !== null)
}

const VERBS = new Set(['VIEW', 'MANAGE', 'APPROVE', 'DECLINE', 'DISBURSE', 'REVIEW', 'CREATE', 'UPDATE', 'DELETE', 'EDIT', 'READ', 'EXPORT', 'ASSIGN'])

/** Groups by subject: APPROVE_LOAN, VIEW_LOANS and MANAGE_LOAN_PRODUCTS all land under "LOAN". */
export function permissionGroup(code: string) {
  const parts = code.split(/[_.:]/).filter(Boolean)
  const noun = (parts.length > 1 && VERBS.has(parts[0].toUpperCase()) ? parts[1] : parts[0]) ?? 'GENERAL'
  return /[^S]S$/i.test(noun) ? noun.slice(0, -1) : noun
}

// The backend returns plain codes (["VIEW_CUSTOMERS", ...]); objects are accepted too.
export function readPermissions(body: unknown): PermissionRecord[] {
  return readList(body, 'permissions')
    .map(v => {
      if (typeof v === 'string' && v.trim()) {
        const code = v.trim()
        return { id: code, code, description: '', group: permissionGroup(code) }
      }
      if (!isObj(v)) return null
      const id = str(v.id) || str(v.permissionId)
      const code = str(v.code) || str(v.name) || str(v.permission)
      if (!id || !code) return null
      const group = str(v.module) || str(v.category) || str(v.group) || permissionGroup(code)
      return { id, code, description: str(v.description), group }
    })
    .filter((p): p is PermissionRecord => p !== null)
}

/** A role may list its permissions by id or by code; map both onto permission codes. */
export function selectedPermissionCodes(role: RoleRecord, permissions: PermissionRecord[]): string[] {
  const keys = new Set(role.permissionKeys)
  return permissions.filter(p => keys.has(p.id) || keys.has(p.code)).map(p => p.code)
}

/** Login may report the role as SUPER_ADMIN, "Super Admin", SuperAdmin or ROLE_SUPER_ADMIN. */
export function isSuperAdminRole(role: string | undefined) {
  return (role ?? '').toUpperCase().replace(/^ROLE_/, '').replace(/[^A-Z]/g, '') === 'SUPERADMIN'
}

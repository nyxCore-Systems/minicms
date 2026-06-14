import { headers } from 'next/headers'
import { prisma, withRetry } from './prisma'

export async function getTenant() {
  if (!process.env.DATABASE_URL) return null

  // Read tenant slug from middleware header or env var
  const headersList = await headers()
  const slug = headersList.get('x-tenant-slug') || process.env.TENANT_SLUG || 'e-ventschau'

  return withRetry(() => prisma.tenant.findUnique({ where: { slug } }))
}

export async function getTenantOrThrow() {
  const tenant = await getTenant()
  if (!tenant) throw new Error('Tenant not found')
  return tenant
}

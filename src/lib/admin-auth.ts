import { cookies } from 'next/headers'
import { getToken } from 'next-auth/jwt'
import { NextResponse } from 'next/server'
import { getTenant } from './tenant'
import type { Tenant } from '@prisma/client'
import type { JWT } from 'next-auth/jwt'

export async function getSessionToken() {
  const cookieStore = await cookies()
  return getToken({
    req: {
      cookies: Object.fromEntries(cookieStore.getAll().map((c) => [c.name, c.value])),
    } as any,
    secret: process.env.NEXTAUTH_SECRET,
  })
}

export type AuthContext = { token: JWT; tenant: Tenant }

export async function authTenant(): Promise<{ error: NextResponse } | AuthContext> {
  const token = await getSessionToken()
  if (!token || !['ADMIN', 'SUPER_ADMIN'].includes(token.role as string)) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  const tenant = await getTenant()
  if (!tenant) return { error: NextResponse.json({ error: 'Tenant not found' }, { status: 404 }) }
  return { token, tenant }
}

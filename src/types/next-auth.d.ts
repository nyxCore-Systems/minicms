import 'next-auth'
import 'next-auth/jwt'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: string
      tenantId: string
      tenantSlug: string
      isSuperAdmin: boolean
      name?: string | null
      email?: string | null
      image?: string | null
    }
  }

  interface User {
    role: string
    tenantId: string
    tenantSlug: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: string
    tenantId?: string
    tenantSlug?: string
    isSuperAdmin?: boolean
  }
}

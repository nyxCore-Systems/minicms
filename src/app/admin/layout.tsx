import Link from 'next/link'
import { cookies } from 'next/headers'
import { getToken } from 'next-auth/jwt'
import AdminNav from '@/components/admin/AdminNav'
import AdminProviders from '@/components/admin/AdminProviders'

export const metadata = {
  title: {
    default: 'Admin Dashboard',
    template: '%s | e-Ventschau Admin',
  },
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const token = await getToken({
    req: {
      cookies: Object.fromEntries(
        cookieStore.getAll().map((c) => [c.name, c.value])
      ),
    } as any,
    secret: process.env.NEXTAUTH_SECRET,
  })

  // No session (login page) — render children without admin chrome
  // Middleware handles redirecting unauthenticated users for all other /admin/* routes
  if (!token) {
    return <AdminProviders>{children}</AdminProviders>
  }

  const user = {
    name: token.name as string,
    email: token.email as string,
    role: token.role as string,
  }

  return (
    <AdminProviders>
    <div className="min-h-screen flex">
      <aside className="hidden lg:flex w-64 flex-col glass-strong border-r border-brand-border fixed inset-y-0 left-0 z-40">
        <div className="p-6 border-b border-brand-border">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-sm bg-brand-primary flex items-center justify-center">
              <span className="text-white font-bold text-sm">DM</span>
            </div>
            <span className="text-lg font-display font-bold text-brand-primary">
              Admin
            </span>
          </Link>
        </div>
        <AdminNav role={user.role} />
        <div className="mt-auto p-4 border-t border-brand-border">
          <div className="text-xs text-brand-text-muted">
            <p className="font-medium text-brand-text">{user.name}</p>
            <p>{user.email}</p>
            <p className="capitalize mt-1">{user.role}</p>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col lg:ml-64">
        <header className="lg:hidden glass-strong border-b border-brand-border p-4 flex items-center justify-between">
          <Link href="/admin" className="font-display font-bold text-brand-primary">
            DM Admin
          </Link>
          <span className="text-xs text-brand-text-muted">{user.name}</span>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
    </AdminProviders>
  )
}

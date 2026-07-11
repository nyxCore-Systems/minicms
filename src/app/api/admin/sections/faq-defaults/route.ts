import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getToken } from 'next-auth/jwt'
import { getFeaturedEvent } from '@/lib/events'
import { resolveFestivalFaq } from '@/lib/faq'

async function getSessionToken() {
  const cookieStore = await cookies()
  return getToken({
    req: {
      cookies: Object.fromEntries(cookieStore.getAll().map((c) => [c.name, c.value])),
    } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    secret: process.env.NEXTAUTH_SECRET,
  })
}

// Read-only: returns the current default homepage FAQ (title/subtitle + Q&A
// items) so the admin can pre-fill and save an editable `faq` section from it.
export async function GET() {
  const token = await getSessionToken()
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const featured = await getFeaturedEvent()
  return NextResponse.json(resolveFestivalFaq(featured))
}

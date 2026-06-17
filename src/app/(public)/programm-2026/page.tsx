import { redirect, permanentRedirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default function Programm2026Redirect() {
  // 308 permanent redirect to the canonical festival event page.
  permanentRedirect('/events/e-ventschau-2026')
  // unreachable; satisfies the component return type
  redirect('/events/e-ventschau-2026')
}

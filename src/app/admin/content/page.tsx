import { getAllPages } from '@/lib/markdown'
import ContentListClient from '@/components/admin/ContentListClient'

export const dynamic = 'force-dynamic'

export default async function AdminContentPage() {
  const pages = await getAllPages()

  return <ContentListClient pages={JSON.parse(JSON.stringify(pages))} />
}

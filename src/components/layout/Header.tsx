import { getMenuItems, getSiteSettings } from '@/lib/menu'
import HeaderClient from './HeaderClient'

export default async function Header() {
  const [menuItems, settings] = await Promise.all([
    getMenuItems(),
    getSiteSettings(),
  ])

  return <HeaderClient navigation={menuItems} settings={settings} />
}

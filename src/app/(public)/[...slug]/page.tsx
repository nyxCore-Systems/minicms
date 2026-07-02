// Import ergänzen:
import { getLocalBusinessJsonLd } from '@/lib/seo'

// In der default-export Async-Function, nach dem bestehenden Path-Setup:
const currentPath = '/' + (Array.isArray(slug) ? slug.join('/') : slug)
const localBusinessLd =
  currentPath === '/kontakt' || currentPath === '/impressum'
    ? await getLocalBusinessJsonLd()
    : null

// Und im JSX, neben den anderen <JsonLd>-Elementen:
{localBusinessLd && <JsonLd data={localBusinessLd} />}

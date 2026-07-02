import { MetadataRoute } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://e-ventschau.de'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // /api: keep server routes out of the index.
        // /admin: dashboard incl. /admin/login — never indexable.
        // /_next: build artifacts and RSC payloads — no SEO value.
        disallow: ['/admin', '/api', '/_next'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}

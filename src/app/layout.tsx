import type { Metadata } from 'next'
import { Inter, Playfair_Display, Space_Grotesk } from 'next/font/google'
import JsonLd from '@/components/JsonLd'
import { organizationJsonLd } from '@/lib/seo'
import { getSiteSettings } from '@/lib/menu'
import { getTheme, themeToStyleString } from '@/lib/themes'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
})

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
})

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://e-ventschau.de'

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: settings.siteName,
      template: `%s | ${settings.siteName}`,
    },
    description: settings.siteName,
    authors: [{ name: settings.siteName }],
    openGraph: {
      type: 'website',
      locale: 'de_DE',
      url: siteUrl,
      siteName: settings.siteName,
      title: settings.siteName,
      ...(settings.logoUrl || settings.backgroundImage
        ? { images: [{ url: settings.backgroundImage || settings.logoUrl! }] }
        : {}),
    },
    twitter: {
      card: 'summary_large_image',
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const settings = await getSiteSettings()
  const theme = getTheme(settings.themeSlug || 'eventschau')
  const isDark = settings.defaultDarkMode || theme.defaultDarkMode

  const lightVars = themeToStyleString(theme, false)
  const darkVars = themeToStyleString(theme, true)
  const fontVars = `--font-heading: '${theme.fontHeading}', serif;\n  --font-body: '${theme.fontBody}', sans-serif;`
  const themeStyle = `:root {\n  ${lightVars}\n  ${fontVars}\n}\n.dark {\n  ${darkVars}\n  ${fontVars}\n}`

  return (
    <html
      lang={settings.locale || 'de'}
      className={`${inter.variable} ${playfair.variable} ${spaceGrotesk.variable} ${isDark ? 'dark' : ''}`}
      data-theme={theme.slug}
      suppressHydrationWarning
    >
      <head>
        <JsonLd data={organizationJsonLd} />
        <style dangerouslySetInnerHTML={{ __html: themeStyle }} />
        {settings.faviconUrl && <link rel="icon" href={settings.faviconUrl} />}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&${isDark ? 'true' : "window.matchMedia('(prefers-color-scheme:dark)').matches"})){document.documentElement.classList.add('dark')}}catch(e){}})()`,
          }}
        />
      </head>
      <body className="font-sans min-h-screen">
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}

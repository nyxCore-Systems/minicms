type SocialLink = { platform: string; url: string; label?: string }

const PLATFORM_LABELS: Record<string, string> = {
  instagram: 'Instagram', facebook: 'Facebook', youtube: 'YouTube', tiktok: 'TikTok',
  spotify: 'Spotify', bandcamp: 'Bandcamp', soundcloud: 'SoundCloud', website: 'Website',
}

export default function SocialLinks({
  links, variant = 'labeled',
}: { links: SocialLink[]; variant?: 'icon' | 'labeled' }) {
  if (!links?.length) return null
  return (
    <ul className="flex flex-wrap gap-3" aria-label="Social-Media-Links">
      {links.map((l) => {
        const label = l.label || PLATFORM_LABELS[l.platform] || l.platform
        return (
          <li key={`${l.platform}-${l.url}`}>
            <a
              href={l.url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              aria-label={variant === 'icon' ? label : undefined}
              className="glass-card inline-flex items-center gap-2 rounded-pill px-4 py-2 text-sm text-brand-text motion-safe:transition-all motion-safe:hover:shadow-card-hover"
            >
              {variant === 'labeled' ? label : <span aria-hidden="true">{label[0]}</span>}
            </a>
          </li>
        )
      })}
    </ul>
  )
}

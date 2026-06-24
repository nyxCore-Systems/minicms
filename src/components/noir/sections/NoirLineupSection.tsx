import Image from 'next/image'
import Link from 'next/link'
import { getNoirHomeData, type NoirLineupItem } from '@/lib/noir-home'
import { NOIR_LINEUP_DEFAULTS } from '@/lib/noir-home-defaults'

export default async function NoirLineupSection({
  title,
  subtitle,
}: {
  title?: string | null
  subtitle?: string | null
}) {
  const { features, regulars, apMetaBySlug, lineup } = await getNoirHomeData()
  if (lineup.length === 0) return null
  const label = title || NOIR_LINEUP_DEFAULTS.label
  const intro = subtitle || NOIR_LINEUP_DEFAULTS.intro

  return (
    <section className="nh-sec" id="lineup">
      <div className="nh-wrap">
        <div className="nh-sec-head">
          <div className="nh-lab">{label}</div>
          <h2>
            {lineup.length} Acts.
            <br />
            Zwei Nächte. Ein Hof.
          </h2>
          <p className="nh-sub">{intro}</p>
        </div>
        <div className="nh-lu">
          {features.map((a, i) => (
            <LineupCard
              key={a.slug}
              artist={a}
              meta={apMetaBySlug.get(a.slug)}
              index={i + 1}
              size="xl"
            />
          ))}
          {regulars.map((a, i) => (
            <LineupCard key={a.slug} artist={a} meta={apMetaBySlug.get(a.slug)} index={i + 3} size="md" />
          ))}
        </div>
      </div>
    </section>
  )
}

function LineupCard({
  artist,
  meta,
  index,
  size,
}: {
  artist: NoirLineupItem
  meta?: string
  index: number
  size: 'xl' | 'md'
}) {
  const genreLine = [artist.genres?.join(' / '), artist.origin].filter(Boolean).join(' · ')
  return (
    <Link
      href={`/kuenstler/${artist.slug}`}
      className={`nh-act ${size === 'xl' ? 'nh-act-xl' : 'nh-act-md'}`}
      aria-label={`${artist.name} – zum Künstlerprofil`}
    >
      <div className="nh-ph">
        {artist.heroImage && (
          <Image
            src={artist.heroImage}
            alt=""
            fill
            sizes={size === 'xl' ? '50vw' : '25vw'}
            style={{ objectFit: 'cover' }}
          />
        )}
        {artist.isFeatured && (
          <span className={`nh-tagline${size === 'xl' ? ' l' : ''}`}>Headliner</span>
        )}
        <span className="nh-idx">{String(index).padStart(2, '0')}</span>
        {!artist.heroImage && <span className="nh-ph-tag">Foto folgt</span>}
      </div>
      <div className="nh-act-b">
        {meta && <div className="meta">{meta}</div>}
        <h3>{artist.name}</h3>
        {size === 'xl' ? (
          <>
            {artist.excerpt && <p>{artist.excerpt}</p>}
            {genreLine && (
              <div className="nh-gens">
                {artist.genres?.map((g) => (
                  <span key={g} className="nh-gen">
                    {g}
                  </span>
                ))}
                {artist.origin && <span className="nh-gen">{artist.origin}</span>}
              </div>
            )}
          </>
        ) : (
          genreLine && <p>{genreLine}</p>
        )}
      </div>
    </Link>
  )
}

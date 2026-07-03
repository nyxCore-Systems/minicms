import Image from 'next/image'
import Link from 'next/link'
import { getLineupSlots } from '@/lib/lineup-data'
import type { LineupSlot } from '@/lib/lineup'
import { NOIR_LINEUP_DEFAULTS } from '@/lib/noir-home-defaults'

export default async function NoirLineupSection({
  title,
  subtitle,
  content,
}: {
  title?: string | null
  subtitle?: string | null
  content?: { categories?: string[]; order?: string[] } | null
}) {
  const slots = await getLineupSlots({ categories: content?.categories, order: content?.order })
  if (slots.length === 0) return null
  const label = title || NOIR_LINEUP_DEFAULTS.label
  const intro = subtitle || NOIR_LINEUP_DEFAULTS.intro

  return (
    <section className="nh-sec" id="lineup">
      <div className="nh-wrap">
        <div className="nh-sec-head">
          <div className="nh-lab">{label}</div>
          <h2>
            {slots.length} Programmpunkte.
            <br />
            Zwei Nächte. Ein Hof.
          </h2>
          <p className="nh-sub">{intro}</p>
        </div>
        <div className="nh-lu">
          {slots.map((s, i) => (
            <LineupCard key={s.appearanceId} slot={s} index={i + 1} />
          ))}
        </div>
      </div>
    </section>
  )
}

function LineupCard({ slot, index }: { slot: LineupSlot; index: number }) {
  const genreLine = [slot.genres?.join(' / '), slot.origin].filter(Boolean).join(' · ')
  const inner = (
    <>
      <div className="nh-ph">
        {slot.image && (
          <Image src={slot.image} alt="" fill sizes="25vw" style={{ objectFit: 'cover' }} />
        )}
        <span className="nh-tagline">{slot.categoryLabel}</span>
        <span className="nh-idx">{String(index).padStart(2, '0')}</span>
        {!slot.image && <span className="nh-ph-tag">Foto folgt</span>}
      </div>
      <div className="nh-act-b">
        {slot.meta && <div className="meta">{slot.meta}</div>}
        <h3>{slot.name}</h3>
        {genreLine && <p>{genreLine}</p>}
      </div>
    </>
  )
  // All cards render equal-size (md). Link only when a slot maps to an artist.
  return slot.slug ? (
    <Link href={`/kuenstler/${slot.slug}`} className="nh-act nh-act-md" aria-label={`${slot.name} – zum Profil`}>
      {inner}
    </Link>
  ) : (
    <div className="nh-act nh-act-md">{inner}</div>
  )
}

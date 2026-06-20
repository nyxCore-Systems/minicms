import Image from 'next/image'
import Link from 'next/link'
import { getNoirHomeData } from '@/lib/noir-home'
import { NOIR_HERO_DEFAULTS, type NoirHeroContent } from '@/lib/noir-home-defaults'

export default async function NoirHeroSection({ content }: { content?: NoirHeroContent | null }) {
  const { kicker, dateMeta, lineup, stageCount } = await getNoirHomeData()
  const buttons = content?.buttons?.length ? content.buttons : NOIR_HERO_DEFAULTS.buttons
  const tiles = content?.tiles?.length ? content.tiles : NOIR_HERO_DEFAULTS.tiles

  return (
    <section className="nh-hero">
      <div className="nh-hero-bg" aria-hidden="true" />
      <div className="nh-fog" aria-hidden="true" />
      <div className="nh-logo" aria-hidden="true">
        <Image
          src="/e-ventschau-logo.png"
          alt=""
          fill
          sizes="(max-width: 700px) 70vw, 600px"
          style={{ objectFit: 'contain' }}
          priority
        />
      </div>
      <div className="nh-wrap">
        <div className="nh-kick">
          {kicker.split(' // ').map((part, i, arr) => (
            <span key={i}>
              {i === 0 ? part : <span style={{ color: 'var(--gold, #FAB90C)' }}>{part}</span>}
              {i < arr.length - 1 && <span> // </span>}
            </span>
          ))}
        </div>
        <h1>
          e-Ventschau
          <span className="nh-sub">
            {content?.subtitle ? (
              content.subtitle
            ) : (
              <>
                <b>Benefiz</b> · Kultur · <i>Gemeinschaft</i> — zwei Nächte auf dem Hof
              </>
            )}
          </span>
        </h1>
        <div className="nh-cta">
          {buttons.map((b, i) => (
            <Link key={i} className={b.variant === 'secondary' ? 'btn-secondary' : 'btn-primary'} href={b.href}>
              {b.label}
            </Link>
          ))}
        </div>
        <div className="nh-meta">
          <div className="nh-hm">
            <div className="k">Acts</div>
            <div className="v">
              {lineup.length} Bands{stageCount > 0 ? ` · ${stageCount} Bühnen` : ''}
            </div>
          </div>
          <div className="nh-hm">
            <div className="k">Datum</div>
            <div className="v">{dateMeta}</div>
          </div>
          {tiles.map((t, i) => (
            <div className="nh-hm" key={i}>
              <div className="k">{t.label}</div>
              <div className="v">{t.value}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

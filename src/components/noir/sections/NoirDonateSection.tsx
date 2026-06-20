import Link from 'next/link'
import { NOIR_DONATE_DEFAULTS, formatEuro, type NoirDonateContent } from '@/lib/noir-home-defaults'

export default function NoirDonateSection({ content }: { content?: NoirDonateContent | null }) {
  const d = NOIR_DONATE_DEFAULTS
  const label = content?.label || d.label
  const heading = content?.heading || d.heading
  const text = content?.text || d.text
  const chips = content?.chips?.length ? content.chips : d.chips
  const ctaLabel = content?.ctaLabel || d.ctaLabel
  const ctaHref = content?.ctaHref || d.ctaHref
  const cardHeading = content?.cardHeading || d.cardHeading
  const cardSubtext = content?.cardSubtext || d.cardSubtext
  const raised = content?.raised ?? d.raised
  const target = content?.target ?? d.target
  const pct = target > 0 ? Math.min(100, Math.round((raised / target) * 100)) : 0
  const remaining = Math.max(0, target - raised)

  return (
    <section className="nh-sec nh-sec-coal" id="spenden">
      <div className="nh-wrap">
        <div className="nh-don">
          <div>
            <div className="nh-sec-head" style={{ marginBottom: 0 }}>
              <div className="nh-lab">{label}</div>
              <h2>{heading}</h2>
              <p className="nh-sub">{text}</p>
            </div>
            <div className="nh-chips">
              {chips.map((c) => (
                <Link key={c} className="nh-chip" href={ctaHref}>
                  {c}
                </Link>
              ))}
            </div>
            <Link className="btn-primary" href={ctaHref}>
              {ctaLabel}
            </Link>
          </div>
          <div className="nh-dcard">
            <h3>{cardHeading}</h3>
            <p style={{ color: 'var(--muted, #8AA0B4)', fontSize: 14 }}>{cardSubtext}</p>
            <div
              className="nh-pbar"
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${cardHeading}: ${pct} % erreicht`}
            >
              <i style={{ width: `${pct}%` }} />
            </div>
            <div className="nh-drow">
              <span>
                <b>{formatEuro(raised)}</b> gesammelt
              </span>
              <span>Ziel {formatEuro(target)}</span>
            </div>
            <div
              className="nh-drow"
              style={{ marginTop: 20, paddingTop: 18, borderTop: '1px solid var(--b2, #123E63)' }}
            >
              <span>{pct}% erreicht</span>
              <span>noch {formatEuro(remaining)}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

import Link from 'next/link'
import { NOIR_DONATE_DEFAULTS, formatEuro, type NoirDonateContent } from '@/lib/noir-home-defaults'
import PayPalDonateButton from './PayPalDonateButton'

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
        <div className="nh-sec-head">
          <div className="nh-lab">{label}</div>
          <h2>{heading}</h2>
          <p className="nh-sub">{text}</p>
        </div>

        <div className="nh-don">
          {/* LEFT — Tickets */}
          <div className="nh-tcard">
            <div className="nh-lab">Tickets</div>
            <h3>Solidarischer Eintritt</h3>
            <p className="nh-card-sub">
              Zahl, was du kannst – wähle deinen Beitrag an der Abendkasse. Kein Mindestpreis.
            </p>
            <div className="nh-chips">
              {chips.map((c) => (
                <Link key={c} className="nh-chip" href={ctaHref}>
                  {c}
                </Link>
              ))}
            </div>
            <Link className="btn-primary nh-don-cta" href={ctaHref}>
              {ctaLabel}
            </Link>
          </div>

          {/* RIGHT — Spenden */}
          <div className="nh-dcard nh-dcard-accent">
            <div className="nh-lab">Spenden</div>
            <h3>{cardHeading}</h3>
            <p className="nh-card-sub">{cardSubtext}</p>
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
              style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--b2, #123E63)' }}
            >
              <span>{pct}% erreicht</span>
              <span>noch {formatEuro(remaining)}</span>
            </div>
            <p className="nh-paypal-cap">Direkt spenden via PayPal</p>
            <div className="nh-paypal-box">
              <PayPalDonateButton />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

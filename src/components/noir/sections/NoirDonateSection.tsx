import Link from 'next/link'
import { NOIR_DONATE_DEFAULTS, formatEuro, type NoirDonateContent } from '@/lib/noir-home-defaults'

// PayPal "No-Code Payments" hosted checkout for the KombiTicket. We link to
// PayPal's own hosted page instead of embedding the SDK: the embed loaded a
// heavy script on every visit and logged eligibility errors, with no upside
// over a plain link for a single hosted button.
const PAYPAL_TICKET_URL = 'https://www.paypal.com/ncp/payment/MGNNL73RQ88DG'

export default function NoirDonateSection({ content }: { content?: NoirDonateContent | null }) {
  const d = NOIR_DONATE_DEFAULTS
  const label = content?.label || d.label
  const heading = content?.heading || d.heading
  const text = content?.text || d.text
  const ctaLabel = content?.ctaLabel || d.ctaLabel
  const ctaHref = content?.ctaHref || d.ctaHref
  const cardHeading = content?.cardHeading || d.cardHeading
  const cardSubtext = content?.cardSubtext || d.cardSubtext
  const raised = content?.raised ?? d.raised
  const target = content?.target ?? d.target
  const bank = { ...d.bank, ...(content?.bank ?? {}) }
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
          {/* LEFT — Tickets (via PayPal) */}
          <div className="nh-tcard nh-dcard-accent">
            <div className="nh-lab">Tickets</div>
            <h3>KombiTicket – beide Nächte</h3>
            <p className="nh-card-sub">
              Online buchen per PayPal. An der Abendkasse gilt: zahl, was du kannst – kein Mindestpreis.
            </p>
            <a
              className="nh-ticket-btn"
              href={PAYPAL_TICKET_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              Ticket buchen via PayPal &rarr;
            </a>
            <p className="nh-ticket-note">Sichere Bezahlung über PayPal (öffnet in neuem Tab).</p>
          </div>

          {/* RIGHT — Spenden (via Banküberweisung) */}
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

            <div className="nh-bank">
              <div className="nh-bank-title">Spendenkonto</div>
              <dl className="nh-bank-list">
                {bank.accountHolder && (
                  <div className="nh-bank-row">
                    <dt>Kontoinhaber</dt>
                    <dd>{bank.accountHolder}</dd>
                  </div>
                )}
                {bank.bankName && (
                  <div className="nh-bank-row">
                    <dt>Bank</dt>
                    <dd>{bank.bankName}</dd>
                  </div>
                )}
                {bank.iban && (
                  <div className="nh-bank-row">
                    <dt>IBAN</dt>
                    <dd className="nh-mono">{bank.iban}</dd>
                  </div>
                )}
                {bank.purpose && (
                  <div className="nh-bank-row">
                    <dt>Verwendungszweck</dt>
                    <dd>{bank.purpose}</dd>
                  </div>
                )}
              </dl>
              <p className="nh-bank-note">
                Spenden derzeit per Überweisung – die PayPal-Spende folgt in Kürze.
              </p>
            </div>

            <Link className="nh-don-link" href={ctaHref}>
              {ctaLabel} &rarr;
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

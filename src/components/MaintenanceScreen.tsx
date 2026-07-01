interface MaintenanceScreenProps {
  siteName: string
  logoUrl: string | null
}

/**
 * Full-screen maintenance placeholder shown to public visitors while the site
 * is being reworked. Rendered instead of the normal Header/Footer chrome by the
 * public layout when `maintenanceMode` is on and the visitor is not a logged-in
 * admin. Inherits the noir theme (data-theme="noir") + CSS variables from the
 * root layout.
 */
export default function MaintenanceScreen({ siteName, logoUrl }: MaintenanceScreenProps) {
  return (
    <>
      <div className="nh-grain" aria-hidden="true" />
      <div className="nh-scan" aria-hidden="true" />
      <main
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '48px 24px',
          background:
            'radial-gradient(120% 90% at 70% 10%, #14517f 0, #072a45 42%, var(--brand-bg, #051A2E) 78%)',
          color: 'var(--brand-text, #FBF7EF)',
          position: 'relative',
          zIndex: 2,
        }}
      >
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt={siteName}
            style={{ width: 'clamp(160px, 32vw, 300px)', height: 'auto', marginBottom: 40 }}
          />
        ) : null}

        <div
          className="nh-mono"
          style={{
            fontSize: 13,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--brand-accent, #FAB90C)',
            marginBottom: 22,
          }}
        >
          Wartung
        </div>

        <h1
          style={{
            fontSize: 'clamp(38px, 8vw, 88px)',
            letterSpacing: '-0.03em',
            lineHeight: 0.98,
            margin: 0,
            maxWidth: 900,
            textWrap: 'balance',
          }}
        >
          Wir sind gleich zurück
        </h1>

        <p
          style={{
            marginTop: 28,
            fontSize: 'clamp(16px, 2.2vw, 20px)',
            color: 'var(--brand-text-muted, #8AA0B4)',
            maxWidth: 520,
          }}
        >
          Diese Seite wird gerade überarbeitet. Schaut bald wieder vorbei.
        </p>
      </main>
    </>
  )
}

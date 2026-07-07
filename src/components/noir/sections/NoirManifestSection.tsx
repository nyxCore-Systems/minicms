import { NOIR_MANIFEST_DEFAULTS, type NoirManifestContent } from '@/lib/noir-home-defaults'
import NoirRichText from './NoirRichText'

export default function NoirManifestSection({ content }: { content?: NoirManifestContent | null }) {
  const text = content?.text || NOIR_MANIFEST_DEFAULTS.text
  const stats = content?.stats?.length ? content.stats : NOIR_MANIFEST_DEFAULTS.stats

  return (
    <section className="nh-manifest" id="manifest">
      <div className="nh-wrap">
        <h2>
          {content?.heading ? (
            content.heading
          ) : (
            <>
              Wir machen <em>Lärm gegen das Vergessen.</em>
            </>
          )}
        </h2>
        <NoirRichText content={text} />
        <div className="nh-mstats">
          {stats.map((s, i) => (
            <div className="nh-ms" key={i}>
              <div className="v">{s.value}</div>
              <div className="k">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

import { getNoirHomeData } from '@/lib/noir-home'

function MarqueeRun({ names, ariaHidden }: { names: string[]; ariaHidden?: boolean }) {
  return (
    <span aria-hidden={ariaHidden}>
      {names.map((n) => (
        <span key={n}>
          {n.toUpperCase()}
          <span className="d"> // </span>
        </span>
      ))}
    </span>
  )
}

export default async function NoirMarqueeSection() {
  const { lineup } = await getNoirHomeData()
  if (lineup.length === 0) return null
  const names = lineup.map((a) => a.name)
  return (
    <div className="nh-marq">
      <div className="nh-marq-track">
        <MarqueeRun names={names} />
        <MarqueeRun names={names} ariaHidden />
      </div>
    </div>
  )
}

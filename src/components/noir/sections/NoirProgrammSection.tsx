import NoirTimetable from '@/components/noir/NoirTimetable'
import { getNoirHomeData } from '@/lib/noir-home'
import { NOIR_TIMETABLE_DEFAULTS } from '@/lib/noir-home-defaults'

export default async function NoirProgrammSection({
  title,
  subtitle,
}: {
  title?: string | null
  subtitle?: string | null
}) {
  const { days } = await getNoirHomeData()
  if (days.length === 0) return null
  const label = title || NOIR_TIMETABLE_DEFAULTS.label
  const intro = subtitle || NOIR_TIMETABLE_DEFAULTS.intro

  return (
    <section className="nh-sec nh-sec-coal" id="programm">
      <div className="nh-wrap">
        <div className="nh-sec-head">
          <div className="nh-lab">{label}</div>
          <h2>{NOIR_TIMETABLE_DEFAULTS.heading}</h2>
          <p className="nh-sub">{intro}</p>
        </div>
        <NoirTimetable days={days} />
      </div>
    </section>
  )
}

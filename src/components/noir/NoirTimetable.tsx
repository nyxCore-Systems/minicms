export type NoirSlot = {
  time: string
  title: string
  subtitle: string
  type: string
}

export type NoirDay = {
  id: string
  label: string
  rows: NoirSlot[]
}

// Both festival days are shown at once: side by side as two columns on
// desktop, stacked on mobile (see .nh-prog in globals.css). Each day is a
// self-contained block with its own heading, so a slot is never ambiguous
// about which day it belongs to — the previous tab switcher read like a
// two-column table header and confused users.
export default function NoirTimetable({ days }: { days: NoirDay[] }) {
  if (days.length === 0) return null

  return (
    <div className="nh-prog">
      {days.map((day) => (
        <section key={day.id} className="nh-pday">
          <h3 className="nh-pday-head">{day.label}</h3>
          <div role="table" aria-label={`Programm ${day.label}`}>
            <div className="sr-only" role="row">
              <span role="columnheader">Uhrzeit</span>
              <span role="columnheader">Programm</span>
              <span role="columnheader">Art</span>
            </div>
            {day.rows.map((row, idx) => (
              <div key={`${day.id}-${idx}`} className="nh-prow" role="row">
                <span className="tm" role="cell">
                  {row.time}
                </span>
                <div role="cell">
                  <div className="ti">{row.title}</div>
                  {row.subtitle && <div className="su">{row.subtitle}</div>}
                </div>
                <span className="nh-ty" role="cell">
                  {row.type}
                </span>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

'use client'

import { useRef, useState } from 'react'

export type NoirSlot = {
  time: string
  title: string
  subtitle: string
  type: string
  highlight: boolean
}

export type NoirDay = {
  id: string
  label: string
  rows: NoirSlot[]
}

export default function NoirTimetable({ days }: { days: NoirDay[] }) {
  const [activeId, setActiveId] = useState(days[0]?.id)
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  if (days.length === 0) return null

  // Automatic activation: selection follows focus (recommended for a small tab set).
  function focusTab(id: string) {
    setActiveId(id)
    tabRefs.current[id]?.focus()
  }

  function onKeyDown(e: React.KeyboardEvent, index: number) {
    const last = days.length - 1
    let next = -1
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = index === last ? 0 : index + 1
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = index === 0 ? last : index - 1
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = last
    if (next >= 0) {
      e.preventDefault()
      focusTab(days[next].id)
    }
  }

  return (
    <div className="nh-prog">
      <div className="nh-ptab" role="tablist" aria-label="Festivaltage">
        {days.map((day, i) => {
          const selected = day.id === activeId
          return (
            <button
              key={day.id}
              ref={(el) => {
                tabRefs.current[day.id] = el
              }}
              id={`nh-tab-${day.id}`}
              className="nh-tab"
              role="tab"
              type="button"
              aria-selected={selected}
              aria-controls={`nh-panel-${day.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActiveId(day.id)}
              onKeyDown={(e) => onKeyDown(e, i)}
            >
              {day.label}
            </button>
          )
        })}
      </div>

      {days.map((day) => {
        const selected = day.id === activeId
        return (
          <div
            key={day.id}
            id={`nh-panel-${day.id}`}
            role="tabpanel"
            aria-labelledby={`nh-tab-${day.id}`}
            hidden={!selected}
            tabIndex={0}
          >
            <div role="table" aria-label={`Programm ${day.label}`}>
              <div className="sr-only" role="row">
                <span role="columnheader">Uhrzeit</span>
                <span role="columnheader">Programm</span>
                <span role="columnheader">Art</span>
              </div>
              {day.rows.map((row, idx) => (
                <div
                  key={`${day.id}-${idx}`}
                  className={`nh-prow${row.highlight ? ' hl' : ''}`}
                  role="row"
                >
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
          </div>
        )
      })}
    </div>
  )
}

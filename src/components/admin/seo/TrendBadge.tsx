'use client'

export default function TrendBadge({ delta }: { delta: number | null }) {
  if (delta === null || delta === undefined) {
    return (
      <span className="text-xs text-gray-400 font-medium">---</span>
    )
  }

  const isPositive = delta > 0
  const isNeutral = delta === 0

  if (isNeutral) {
    return (
      <span className="text-xs text-gray-400 font-medium">0.0%</span>
    )
  }

  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-medium ${
        isPositive ? 'text-green-600' : 'text-red-500'
      }`}
    >
      <svg
        className="w-3 h-3"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2.5}
        stroke="currentColor"
      >
        {isPositive ? (
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 4.5l15 15m0 0V8.25m0 11.25H8.25" />
        )}
      </svg>
      {isPositive ? '+' : ''}{delta.toFixed(1)}%
    </span>
  )
}

import {
  InformationCircleIcon,
  ExclamationTriangleIcon,
  LightBulbIcon,
  FireIcon,
} from '@heroicons/react/24/outline'

const variants = {
  info: {
    border: 'border-brand-steel',
    bg: 'bg-brand-steel/5 dark:bg-brand-steel/10',
    icon: InformationCircleIcon,
    iconColor: 'text-brand-steel',
    label: 'Info',
  },
  warning: {
    border: 'border-amber-500',
    bg: 'bg-amber-500/5 dark:bg-amber-500/10',
    icon: ExclamationTriangleIcon,
    iconColor: 'text-amber-500',
    label: 'Warnung',
  },
  tip: {
    border: 'border-brand-primary-light',
    bg: 'bg-brand-primary-light/5 dark:bg-brand-primary-light/10',
    icon: LightBulbIcon,
    iconColor: 'text-brand-primary-light',
    label: 'Tipp',
  },
  danger: {
    border: 'border-red-500',
    bg: 'bg-red-500/5 dark:bg-red-500/10',
    icon: FireIcon,
    iconColor: 'text-red-500',
    label: 'Achtung',
  },
} as const

export type CalloutType = keyof typeof variants

interface CalloutBoxProps {
  type: CalloutType
  children: React.ReactNode
}

export default function CalloutBox({ type, children }: CalloutBoxProps) {
  const v = variants[type] || variants.info
  const Icon = v.icon

  return (
    <div
      className={`my-6 rounded-sm border-l-4 ${v.border} ${v.bg} p-4 sm:p-5`}
      role="note"
      aria-label={v.label}
    >
      <div className="flex items-start gap-3">
        <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
          <Icon className={`w-6 h-6 ${v.iconColor}`} />
          <span className={`text-sm font-semibold ${v.iconColor} uppercase tracking-wide`}>
            {v.label}
          </span>
        </div>
      </div>
      <div className="prose-glass mt-2 [&>:first-child]:mt-0 [&>:last-child]:mb-0">
        {children}
      </div>
    </div>
  )
}

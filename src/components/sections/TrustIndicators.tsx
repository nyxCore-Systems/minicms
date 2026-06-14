interface TrustItem {
  label: string
  sublabel: string
}

interface TrustIndicatorsProps {
  items: TrustItem[]
}

export default function TrustIndicators({ items }: TrustIndicatorsProps) {
  return (
    <section className="py-12 -mt-8 relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="glass-strong rounded-sm p-6 sm:p-8">
          <div className={`grid grid-cols-2 md:grid-cols-${Math.min(items.length, 4)} gap-6 text-center`}>
            {items.map((item, i) => (
              <div key={i}>
                <p className="text-2xl font-bold text-brand-accent">{item.label}</p>
                <p className="text-sm text-brand-text-muted mt-1">{item.sublabel}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

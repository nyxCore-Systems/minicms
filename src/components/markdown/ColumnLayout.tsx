interface ColumnLayoutProps {
  columns: 2 | 3
  children: React.ReactNode[]
}

export default function ColumnLayout({ columns, children }: ColumnLayoutProps) {
  const gridClass = columns === 3
    ? 'grid grid-cols-1 md:grid-cols-3 gap-6'
    : 'grid grid-cols-1 md:grid-cols-2 gap-6'

  return (
    <div className={`my-6 ${gridClass}`}>
      {children.map((child, i) => (
        <div key={i} className="prose-glass [&>:first-child]:mt-0 [&>:last-child]:mb-0">
          {child}
        </div>
      ))}
    </div>
  )
}

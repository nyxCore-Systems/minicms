interface HeroBlockProps {
  children: React.ReactNode
}

export default function HeroBlock({ children }: HeroBlockProps) {
  return (
    <div className="prose-glass-hero mb-8 [&>:first-child]:mt-0 [&>:last-child]:mb-0">
      {children}
    </div>
  )
}

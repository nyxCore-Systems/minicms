interface TextLogoProps {
  siteName: string
  className?: string
}

export default function TextLogo({ siteName, className = '' }: TextLogoProps) {
  return (
    <span className={`text-xl font-display font-bold text-brand-primary ${className}`}>
      {siteName}
    </span>
  )
}

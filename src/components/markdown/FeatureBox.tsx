interface FeatureBoxProps {
  children: React.ReactNode
}

export default function FeatureBox({ children }: FeatureBoxProps) {
  return (
    <div className="my-6">
      <div className="prose-glass [&>:first-child]:mt-0 [&>:last-child]:mb-0">
        {children}
      </div>
    </div>
  )
}

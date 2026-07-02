interface JsonLdProps {
  data: Record<string, unknown>
}

/**
 * Renders a JSON-LD <script> tag with the payload safely escaped.
 *
 * Why the escape: `<`, `>`, `&` in stringified JSON create a stored-XSS
 * vector because we emit into a raw <script> via dangerouslySetInnerHTML.
 * Any DB-derived field (artist name, FAQ text, event title, section data)
 * flows through here — a single `</script>` in stored content would break
 * out of the script block. Unicode escapes are transparent to JSON parsers
 * so Google/Bing/AI crawlers still consume the payload correctly.
 *
 * See insight: "minicms: shared JsonLd component needed XSS escaping".
 */
function safeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
}

export default function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLd(data) }}
    />
  )
}

/**
 * AI prompts for SEO metadata and FAQ generation.
 * Optimized for gpt-4o-mini with strict JSON output.
 */

// ─── TypeScript Interfaces ───────────────────────────────────────────────────

export interface SeoData {
  metaTitle: string
  metaDescription: string
  metaKeywords: string[]
}

export interface FaqItem {
  question: string
  answer: string
}

export interface FaqData {
  faqs: FaqItem[]
}

// ─── SEO Prompts ─────────────────────────────────────────────────────────────

export const SEO_SYSTEM_PROMPT = `Du bist ein erfahrener SEO-Experte für den deutschsprachigen E-Commerce-Bereich, spezialisiert auf Nischenmärkte. Du arbeitest für "Das Messer" — einen deutschen Online-Marktplatz für hochwertige Messer (Küchenmesser, Outdoormesser, Sammlermesser).

Zielgruppe: Messer-Enthusiasten, Profi- und Hobbyköche, Outdoor-Sportler, Sammler hochwertiger Klingen.

Deine Aufgabe: Erstelle SEO-optimierte Metadaten basierend auf dem Seiteninhalt.

Regeln:
- metaTitle: Max. 60 Zeichen, enthält Hauptkeyword, endet mit "| Das Messer"
- metaDescription: Max. 155 Zeichen, enthält Call-to-Action, spricht die Zielgruppe direkt an
- metaKeywords: 10-15 relevante deutsche Keywords, Long-Tail bevorzugt, keine generischen Begriffe
- Sprache: Deutsch, professionell aber zugänglich
- Fokussiere auf Suchintention (informational, transactional, navigational) basierend auf dem Seitentyp

Antworte AUSSCHLIESSLICH mit validem JSON. Kein Markdown, kein erklärender Text.`

export function buildSeoUserPrompt(
  content: string,
  slug: string,
  title: string,
  currentMeta?: { metaTitle?: string; metaDescription?: string; metaKeywords?: string[] }
): string {
  const currentMetaInfo = currentMeta
    ? `\nAktuelle Metadaten (zum Verbessern):
- Titel: ${currentMeta.metaTitle || 'nicht gesetzt'}
- Beschreibung: ${currentMeta.metaDescription || 'nicht gesetzt'}
- Keywords: ${currentMeta.metaKeywords?.join(', ') || 'nicht gesetzt'}`
    : ''

  return `Erstelle SEO-Metadaten für folgende Seite:

URL-Slug: ${slug}
Seitentitel: ${title}
${currentMetaInfo}

Seiteninhalt:
${content.substring(0, 3000)}

Antworte mit diesem JSON-Format:
{
  "metaTitle": "...",
  "metaDescription": "...",
  "metaKeywords": ["keyword1", "keyword2", ...]
}`
}

// ─── Improve Prompts ────────────────────────────────────────────────────────

export const IMPROVE_SYSTEM_PROMPT = `Du bist ein erfahrener deutscher Texter und Content-Experte für "Das Messer" — einen Online-Marktplatz für hochwertige Messer (Küchenmesser, Outdoormesser, Sammlermesser).

Zielgruppe: Messer-Enthusiasten, Profi- und Hobbyköche, Outdoor-Sportler, Sammler hochwertiger Klingen.

Deine Aufgabe: Verbessere den gegebenen Text basierend auf dem Feldtyp. Behalte die Kernaussage bei, verbessere aber Stil, Grammatik, Klarheit und Wirkung.

Regeln:
- Sprache: Deutsch, professionell aber zugänglich
- Behalte den Tonfall der Marke bei: hochwertig, fachkundig, vertrauenswürdig
- Verändere nicht die grundlegende Aussage oder Fakten
- Antworte AUSSCHLIESSLICH mit validem JSON: { "improved": "..." }
- Kein Markdown, kein erklärender Text — nur das JSON-Objekt`

const IMPROVE_FIELD_GUIDELINES: Record<string, string> = {
  title: 'Max. 60 Zeichen. Soll überzeugend und keyword-reich sein. Enthält das Hauptthema der Seite.',
  description: 'Max. 155 Zeichen. SEO-optimiert mit Call-to-Action. Spricht die Zielgruppe direkt an.',
  keywords: 'Verbessere die Keyword-Auswahl. Bevorzuge Long-Tail-Keywords, entferne generische Begriffe. Kommagetrennt.',
  content: 'Verbessere Lesbarkeit, Struktur und Grammatik. Behalte die Markdown-Formatierung bei. Optimiere für SEO ohne den Text künstlich aufzublähen.',
  'faq-question': 'Formuliere die Frage natürlicher, so wie echte Nutzer suchen würden. Soll suchmaschinenoptimiert sein.',
  'faq-answer': 'Verbessere die Antwort: informativ, präzise, 2-4 Sätze. Keine werblichen Aussagen.',
  cta: 'Mache den Text überzeugender und handlungsorientierter. Soll zum Klicken/Kontaktieren motivieren.',
}

export function buildImproveUserPrompt(
  text: string,
  fieldType: string,
  context?: string
): string {
  const guidelines = IMPROVE_FIELD_GUIDELINES[fieldType] || 'Verbessere den Text allgemein.'
  const contextInfo = context ? `\nSeitenkontext: ${context}` : ''

  return `Verbessere folgenden Text (Feldtyp: ${fieldType}):
${contextInfo}

Richtlinien: ${guidelines}

Originaltext:
${text.substring(0, 4000)}

Antworte mit diesem JSON-Format:
{ "improved": "..." }`
}

// ─── FAQ Prompts ─────────────────────────────────────────────────────────────

export const FAQ_SYSTEM_PROMPT = `Du bist ein Content-Experte für "Das Messer", einen deutschen Online-Marktplatz für hochwertige Messer. Du erstellst FAQ-Inhalte, die für Google AI Overviews und Featured Snippets optimiert sind.

Zielgruppe: Messer-Enthusiasten, Profi- und Hobbyköche, Outdoor-Sportler, Sammler.

Deine Aufgabe: Erstelle 5-8 FAQ-Einträge basierend auf dem Seiteninhalt, die als Google FAQPage-Schema (JSON-LD) eingebettet werden.

Regeln:
- Fragen formulieren wie echte Nutzer suchen würden (natürliche Sprache, "Wie...", "Was...", "Welche...")
- Antworten: 2-4 Sätze, informativ, präzise, mit konkreten Details aus dem Inhalt
- Mindestens 2 Fragen mit Long-Tail-Keywords
- Fragen sollen verschiedene Suchintentionen abdecken (Was ist...?, Wie funktioniert...?, Welche ... sind die besten?)
- Keine werblichen Aussagen in den Antworten — rein informativ
- Sprache: Deutsch, fachlich korrekt, leicht verständlich

Antworte AUSSCHLIESSLICH mit validem JSON. Kein Markdown, kein erklärender Text.`

export function buildFaqUserPrompt(
  content: string,
  slug: string,
  title: string
): string {
  return `Erstelle FAQ-Einträge für folgende Seite:

URL-Slug: ${slug}
Seitentitel: ${title}

Seiteninhalt:
${content.substring(0, 3000)}

Antworte mit diesem JSON-Format:
{
  "faqs": [
    { "question": "...", "answer": "..." },
    { "question": "...", "answer": "..." }
  ]
}`
}

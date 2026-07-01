# P1 — Editor-Konsolidierung (3 Impls → 1 geteilte Komponente)

**Datum:** 2026-07-01
**Bereich:** Admin-Content-Editoren (`src/components/admin/MarkdownEditorField.tsx`,
`src/components/admin/editor/*`, `src/app/admin/content|artists|events|sections/*`,
`src/app/api/admin/sections/route.ts`), neue reine Helfer in `src/lib/`
**Status:** Design freigegeben
**Teil der Roadmap:** [wysiwyg-roadmap](2026-07-01-wysiwyg-roadmap.md) — Sub-Projekt P1.
**Baut auf:** [P0 Roundtrip-Absicherung](2026-07-01-wysiwyg-p0-roundtrip-design.md) (Golden-Gate).

## Problem

Dieselbe 3-Modus-Editier-UX (Markdown/WYSIWYG/Preview) existiert in **drei** divergierenden
Implementierungen, und die markdown⇄Plate-Serialisierung ist an **vier** Stellen kopiert:

1. **`MarkdownEditorField`** (`src/components/admin/MarkdownEditorField.tsx`) — die *einzige*
   wiederverwendbare 3-Modus-Komponente, aber nur an `/admin/sections` verdrahtet. Ihre
   `onChange`-Signatur ist `(value: string) => void`; der interne Plate-Baum wird **nie** über
   Props exportiert → `contentJson` geht bei jedem Speichern verloren (`MarkdownEditorField.tsx:23-29,39,48-51`).
2. **Inline-Duplikat** in `src/app/admin/content/[id]/page.tsx` — reimplementiert denselben
   Umschalter von Hand (eigener State, eigene Buttons, eigenes `<textarea>`, direkter `PlateEditor`),
   persistiert `Page.content/contentJson/editorMode` korrekt.
3. **Bare `PlateEditor`, WYSIWYG-only** in `src/app/admin/artists/[id]/page.tsx` (`Artist.bio`) und
   `src/app/admin/events/[id]/page.tsx` (`Event.description`) — kein Markdown/Preview-Umschalter,
   `editorMode` fest auf `'wysiwyg'`.

`PlateEditor` selbst ist markdown-agnostisch (spricht nur `TElement[]`); `markdownToPlate`/
`plateToMarkdown` werden aus vier unabhängigen Aufrufstellen aufgerufen
(`MarkdownEditorField.tsx`, `content/[id]/page.tsx`, `artists/[id]/page.tsx`, `events/[id]/page.tsx`).

**Größte Inkonsistenz:** die wiederverwendbare Komponente ist die kaputte — sie ist an das eine
Feld (`HomepageSection`) verdrahtet, das gar keine JSON-Spalte hat, und ihre Props lassen den
Plate-Baum nicht heraus; WYSIWYG-Edits an `/admin/sections` sind bei jedem Speichern verlustbehaftet.

## Ziele

- **Eine** geteilte 3-Modus-Feldkomponente für die einfachen Plate-Felder (Artists, Events,
  Sections). Die Content-Editor-Seite behält ihre bespoke Power-Editor-UI, teilt aber dieselbe
  Serialisierung (siehe Content-Editor-Entscheidung unten).
- markdown⇄Plate-Serialisierung an **einer** Stelle (geteilte reine Helfer), nicht 4-fach kopiert —
  von allen vier Flächen konsumiert.
- `contentJson`-Drop an `/admin/sections` behoben.
- Künstler-Bios und Event-Beschreibungen erhalten den vollen 3-Modus-Umschalter.

## Nicht-Ziele (später / bewusst ausgelassen)

- Rohe `<textarea>`-Felder ohne WYSIWYG (`Vendor.description/content`, `VendorAd.content`,
  `Product.content`, `ProductCategory.description`) — per Roadmap-Whitelist ein eigenes
  Mini-Projekt (Migration + Renderer-Swap + Content-Audit). **Nicht Teil von P1.**
- Abschaffen des `*Json`-Mirrors. P0 macht den Roundtrip verlustfrei, sodass `contentJson`
  technisch aus Markdown ableitbar wäre — aber das Entfernen ist eine Schema-/Verhaltensänderung
  über die Konsolidierung hinaus. `*Json` bleibt; **Markdown ist autoritativ, `contentJson` ist
  ein Spiegel** (siehe Persistenz-Vertrag). Ableiten-only ist eine mögliche spätere Vereinfachung.
- Neue Direktiven / Node-Typen (P4+). Keine Änderung an `directiveParser.ts` oder den Serializern
  (das P0-Golden-Gate bleibt unverändert das Merge-Gate).

## Entscheidungen (mit Nutzer bestätigt)

- **Scope:** Konsolidieren **+** Drop-Fix an `/admin/sections`.
- **Artist/Event-UX:** voller 3-Modus überall.
- **Ansatz:** `MarkdownEditorField` wird zur einen kontrollierten Feldkomponente mit einheitlichem
  `onChange`-Payload umgebaut (verworfen: dünne Komponente + Adapter; Headless-Hook — YAGNI).
- **Content-Editor-Fläche (bestätigt):** Die Content-Seite (`content/[id]/page.tsx`) ist ein
  bespoke Power-Editor — Medien-Picker in *beiden* Modi (Plate-`insertImageRef` in WYSIWYG,
  `![alt](url)` am `<textarea>`-Cursor in Markdown), Seiten-Toolbar-Toggle, ausklappbares
  Hilfe-Panel, AI-Improve, Versionen. Sie behält ihre UI, **routet aber Serialisierung + Modus-
  Umschaltung über `contentEditor.ts`** (killt die Serialisierungs-Kopie). Kein voller Swap auf
  `<MarkdownEditorField>` — das würde eine erweiterte Komponenten-API (imperativer Bild-Insert-
  Handle, ausblendbarer Toggle) und viel Churn am wichtigsten Editor bedeuten; verworfen zugunsten
  des risikoarmen Serialisierungs-Sharings. (Voller Swap bleibt eine mögliche spätere Vereinfachung.)

## Design

### Schichtung

- **`PlateEditor`** (`src/components/admin/editor/PlateEditor.tsx`) — **unverändert**, markdown-
  agnostische Plate-Fläche (`initialValue: TElement[]`, `onChange: (TElement[]) => void`). Internes Detail.
- **`MarkdownEditorField`** (`src/components/admin/MarkdownEditorField.tsx`) — **die eine**
  3-Modus-Feldkomponente. Besitzt die Serialisierung, rendert `PlateEditor` im WYSIWYG-Modus,
  `<textarea>` im Markdown-Modus, `<MarkdownContent>` im Preview-Modus. Alle 4 Flächen nutzen sie.
- **Reine Helfer** in `src/lib/contentEditor.ts` — Modus-Umschalt-Orchestrierung + Section-Blob-
  Mapping. **Ohne React**, damit mit node:test/tsx testbar (einziger Test-Runner des Projekts).

### Komponenten-API (kontrolliert)

```ts
export type EditorMode = 'markdown' | 'wysiwyg' | 'preview'

export interface ContentEditorValue {
  markdown: string          // Quelle der Wahrheit
  contentJson: TElement[]   // gespiegelter Plate-Baum (rehydriert WYSIWYG verlustfrei)
  editorMode: EditorMode
}

interface MarkdownEditorFieldProps {
  value: string                                   // Markdown (autoritativ)
  contentJson?: TElement[] | null                 // optionaler Mirror zum Seeden von WYSIWYG
  editorMode?: EditorMode                          // gesteuerter Modus (default 'markdown')
  onChange: (next: ContentEditorValue) => void     // emittiert das ganze Triple bei jeder Änderung
  label?: string
  placeholder?: string
  minHeight?: number
}
```

Die Komponente ist kontrolliert: der Parent hält `{markdown, contentJson, editorMode}` und persistiert
das, was `onChange` liefert. Modus-Wechsel und Tipp-Änderungen laufen über denselben `onChange`.

### Reine Helfer (`src/lib/contentEditor.ts`) — testbar

```ts
// Beim Betreten des WYSIWYG-Modus: bevorzugt den vorhandenen Mirror, sonst aus Markdown ableiten.
export function plateValueFor(markdown: string, contentJson: TElement[] | null): TElement[]
//   contentJson non-null & nicht-leer -> contentJson; sonst markdownToPlate(markdown)

// Beim Verlassen des WYSIWYG-Modus: Markdown aus dem Plate-Baum regenerieren (autoritativ).
export function markdownFrom(plate: TElement[]): string
//   -> plateToMarkdown(plate)  (dünner benannter Wrapper, damit die Orchestrierung testbar bleibt)

// Section-Persistenz: Triple <-> HomepageSection.content (Json-Blob), abwärtskompatibel.
export function sectionContentToValue(blob: unknown): ContentEditorValue
//   { markdown, contentJson, editorMode }-Blob -> Triple;
//   Alt-Blob mit nur { markdown } -> { markdown, contentJson: [], editorMode: 'markdown' }
export function valueToSectionContent(v: ContentEditorValue): { markdown: string; contentJson: TElement[]; editorMode: EditorMode }
//   normalisiert die zu persistierende Blob-Form: contentJson nie null (-> []), editorMode auf
//   einen gültigen Wert defaulten ('markdown'); dokumentiert das Blob-Schema und gibt einen Test-Seam.
```

`markdownToPlate`/`plateToMarkdown` bleiben die einzige Serialisierungsquelle; `contentEditor.ts`
orchestriert sie nur und wird von der Komponente **und** vom Section-Save konsumiert.

### Persistenz-Vertrag pro Fläche

**Kernprinzip: Markdown ist autoritativ, `contentJson` ist ein Spiegel/Cache.** Der Public-Renderer
rendert immer aus Markdown (`MarkdownContent` + `parseBlocks`, durch P0 verlustfrei). `contentJson`
seedet nur den Editor. Beim Speichern im WYSIWYG-Modus wird Markdown aus dem Plate-Baum regeneriert;
Markdown + `contentJson` + `editorMode` werden zusammen gespeichert.

| Fläche | Route / API | Felder | Änderung |
|--------|-------------|--------|----------|
| Pages | `content/[id]/page.tsx` | `Page.content/contentJson/editorMode` | UI bleibt (Power-Editor); Serialisierung + Modus-Umschaltung → `contentEditor.ts`-Helfer; Persistenz unverändert |
| Artists | `artists/[id]/page.tsx` | `Artist.bio/bioJson/editorMode` | Direkter `PlateEditor` → geteilte Komponente; **neu 3-Modus** |
| Events | `events/[id]/page.tsx` | `Event.description/descriptionJson/editorMode` | Direkter `PlateEditor` → geteilte Komponente; **neu 3-Modus** |
| Sections | `sections/page.tsx` + `api/admin/sections/route.ts` | `HomepageSection.content` (Json-Blob) | Geteilte Komponente; Save schreibt `{markdown, contentJson, editorMode}`; **Drop behoben** |

### Section-Drop-Fix (Details)

- `sections/page.tsx` baut den Submit-Body heute als `parsedContent = { markdown: contentMarkdown }`
  (`~:778-780`). Neu: `valueToSectionContent(value)` → `{ markdown, contentJson, editorMode }`.
- `api/admin/sections/route.ts` schreibt `content` unverändert als Json-Blob in `prisma.homepageSection`
  (`~:62`, `~:100`) — **keine Prisma-Migration**, da `content Json?` bereits existiert.
- Der öffentliche Section-Renderer (`components/sections/HomepageSectionRenderer.tsx`) liest weiter
  `content.markdown` → **abwärtskompatibel**; Alt-Blobs (nur `.markdown`) funktionieren via
  `sectionContentToValue` weiter.

## Betroffene Dateien

- `src/components/admin/MarkdownEditorField.tsx` — Umbau zur kontrollierten 3-Modus-Komponente mit
  Triple-`onChange`; konsumiert `contentEditor.ts`.
- `src/lib/contentEditor.ts` — **neu**, reine Orchestrierungs-/Mapping-Helfer.
- `src/lib/__tests__/contentEditor.test.ts` — **neu**, TDD für die reinen Helfer.
- `src/app/admin/content/[id]/page.tsx` — bespoke UI behalten; die inline `markdownToPlate`/
  `plateToMarkdown`-Aufrufe (Modus-Umschaltung) durch `plateValueFor`/`markdownFrom` aus
  `contentEditor.ts` ersetzen (kein Komponenten-Swap).
- `src/app/admin/artists/[id]/page.tsx` — direkten `PlateEditor` durch `<MarkdownEditorField>` ersetzen (3-Modus).
- `src/app/admin/events/[id]/page.tsx` — dito für `Event.description`.
- `src/app/admin/sections/page.tsx` — Submit-Body über `valueToSectionContent`; Feld exportiert jetzt das Triple.
- `src/app/api/admin/sections/route.ts` — nur bestätigen, dass der Json-Blob durchgereicht wird (erwartet unverändert).
- `src/components/admin/editor/PlateEditor.tsx` — **unverändert**.

## Risiken / Edge Cases

- **Regressions-Risiko auf Live-Editoren:** Pages/Artists/Events editieren echte Inhalte. Der Umbau
  darf die persistierte Struktur nicht ändern (außer dem beabsichtigten Section-Fix). Manueller
  Spot-Check auf allen 4 Flächen ist Teil der Verifikation.
- **`contentJson`-Seeding:** wenn ein Alt-Datensatz `contentJson=null` hat, muss WYSIWYG aus Markdown
  ableiten (via `plateValueFor`), nicht auf leerem Baum starten.
- **Leerer Inhalt:** leeres Markdown → leerer/known-leerer Plate-Baum → leeres Markdown (idempotent);
  von `contentEditor.test.ts` abgedeckt.
- **Modus-Default für Bestandsdaten:** Artists/Events haben `editorMode`-Spalte default `'markdown'`,
  wurden aber bisher WYSIWYG-only bedient. Nach P1 respektiert die Fläche den gespeicherten `editorMode`
  (Default `'markdown'`), d. h. Bestands-Bios öffnen ggf. im Markdown-Modus — akzeptiert (Nutzer kann umschalten).
- **Kein React-Test-Runner:** Komponentenlogik, die getestet werden muss, lebt in `contentEditor.ts`
  (rein). Die React-Verdrahtung wird durch `npm run build` (Typen) + manuellen Spot-Check abgesichert.

## Verifikation

- `npm test` grün (neue `contentEditor.test.ts` + bestehende inkl. P0-Golden-Gate).
- `npm run build` grün (`prisma generate` + `next build`, keine Typfehler an den 4 Aufrufstellen).
- **Manueller Spot-Check** auf `/admin/content/[id]`, `/admin/artists/[id]`, `/admin/events/[id]`,
  `/admin/sections`: laden → Modi umschalten → speichern → persistiertes Triple prüfen; Public-Render
  unverändert. **Speziell:** eine Section an `/admin/sections` in WYSIWYG bearbeiten, speichern,
  neu laden → `contentJson` ist persistiert (Drop behoben) und Public-Render unverändert.

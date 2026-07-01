# P0 — Roundtrip-Absicherung & Serialisierungs-Sicherheitsnetz

**Datum:** 2026-07-01
**Bereich:** Markdown⇄Plate-Serialisierung (`src/components/admin/editor/serialization/*`,
`src/lib/directiveParser.ts`, `src/components/MarkdownContent.tsx`)
**Status:** Design freigegeben
**Teil der Roadmap:** [wysiwyg-roadmap](2026-07-01-wysiwyg-roadmap.md) — erstes Sub-Projekt.

## Problem

Der Markdown⇄Plate-Roundtrip ist ein handgeschriebener Regex/Zeilen-Parser. Er korrumpiert
Inhalte bei bestimmten Eingaben und **hat keine Tests**. Bevor neue Node-Typen (Links, Bilder,
Karten in P4–P8) hinzukommen, muss der Roundtrip abgesichert sein — sonst multipliziert sich
Datenverlust über jedes neue Feature.

### Verifizierte Bugs

1. **Inline-URL/Text-Abschnitt** (`serialization/markdownToPlate.ts:39`): Das flache
   `inlineRe` nutzt `\(([^)]+)\)` für URLs → jede URL mit `)` (z. B. Wikipedia-, Ticket-URLs)
   wird abgeschnitten; `\[([^\]]+)\]` bricht bei verschachtelten Klammern im Linktext.
2. **Totes Directive-raw-Sicherheitsnetz:** `parseBlocks` (`directiveParser.ts:6,18`) matcht
   Direktiven nur gegen eine **feste Allowlist** (`DIRECTIVE_RE`). Ein unbekanntes/künftiges/
   veraltetes `:::name` fällt in den Markdown-Else-Zweig und wird zeilenweise neu interpretiert
   → innenliegende `---`/`#`/`-` werden zu hr/heading/list verformt. Das dafür vorgesehene
   `ELEMENT_DIRECTIVE_RAW` (voll verdrahtet: Typ, `elements/DirectiveRawElement.tsx`,
   `plugins/directiveRawPlugin.ts`, `useEditorConfig.ts`, Serializer `plateToMarkdown.ts:242`)
   wird von `markdownToPlate` **nie erzeugt** — der Default-Zweig `blockToPlateNodes` (Zeile 422)
   ist unerreichbar.
3. **Keine Roundtrip-Tests** vorhanden; `serializeChildren` verbindet mit `\n\n`, wodurch auch
   ein No-op-WYSIWYG-Speichern den ganzen Body neu schreibt (PageVersion-Churn).

## Ziele

- Roundtrip verlustfrei für: URLs mit Klammern, verschachtelte Linktexte, und beliebige (auch
  unbekannte) `:::`-Direktiven.
- Automatisierte Golden-Roundtrip-Tests als Merge-Gate für P1–P9.

## Nicht-Ziele (später)

- Umstieg auf `@udecode/plate-markdown` (AST-Roundtrip) — großer Rewrite, DEFER.
- Tabellen-Parser in `markdownToPlate` (Serializer kann Tabellen, Parser nicht) — DEFER.
- No-op-Save-Unterdrückung via `Page.contentHash` — DEFER (eigener kleiner Task in P1).

## Entscheidungen

- **Directive-raw greift im geteilten `parseBlocks`** (Editor + öffentlicher Renderer behandeln
  unbekannte Direktiven sauber).
- **Golden-Tests über kuratierte Fixtures** (deterministisch) + manueller Spot-Check gegen
  Live-Inhalte.

## Design

### Teil 1 — Inline-Parser-Fix (`markdownToPlate.ts`)

`parseInlineMarkdown` von einem flachen Regex auf einen kleinen **Scanner** umstellen, der
Links/Bilder mit **balancierter** Klammer-/Paren-Erkennung liest:

- Für `[` … `](` … `)`: Linktext bis zur schließenden `]` mit Bracket-Tiefenzählung lesen;
  danach `(` … `)` mit Paren-Tiefenzählung lesen (URLs mit inneren `)` bleiben erhalten).
- Bilder `![alt](url)` analog (alt darf leer sein).
- Marks (`**`, `*`, `~~`, `` ` ``) unverändert behandeln.
- **Ausgabe-Nodeformen bleiben identisch** (`{type:'a',url,children}`, `{type:'img',url,alt,children}`,
  Text-Marks) → nichts stromabwärts ändert sich.

Auch die zeilenweisen Helfer `parseImageLine` prüfen (nutzt `([^)]+)`), damit eine Bild-Zeile mit
`)` in der URL nicht abbricht — konsistent zum Inline-Scanner behandeln.

### Teil 2 — Directive-raw-Sicherheitsnetz

**`directiveParser.ts`:**
- Neuer generischer Fence-Detektor, z. B. `GENERIC_DIRECTIVE_RE = /^:::([a-zA-Z0-9][a-zA-Z0-9-]*)\s*$/`.
- In `parseBlocks`: Erst `DIRECTIVE_RE` (Allowlist) wie bisher. Wenn eine Zeile *wie* ein Fence
  aussieht (`GENERIC_DIRECTIVE_RE`) aber **nicht** in der Allowlist ist, als
  `Block {type:'directive-raw', directiveId:name, content:<verbatim inner>}` erfassen. Der innere
  Inhalt wird **roh** per `:::`-Tiefe gesammelt (nicht weiter geparst), inkl. verschachtelter Fences.
- `Block`-Union um `'directive-raw'` erweitern.
- Damit der Detektor die Tiefenzählung nicht bricht: Öffnende Fences in der Tiefenlogik sind
  „`DIRECTIVE_RE` **oder** `GENERIC_DIRECTIVE_RE`". (Bestehende `depth++`-Zweige entsprechend
  auf den generischen Fence-Match umstellen, sonst schließt ein unbekannter innerer Fence
  die Tiefe falsch.)

**`serialization/markdownToPlate.ts`:**
- `blockToPlateNodes`: neuer `case 'directive-raw'` → ein `ELEMENT_DIRECTIVE_RAW`-Node mit
  `rawMarkdown = ":::" + directiveId + "\n" + content + "\n:::"` (voller Fence, damit der
  Serializer byte-exakt zurückschreibt), `children:[{text:''}]`.
- Der tote Default-Zweig (Zeile 422) kann bleiben oder entfällt; der reguläre Pfad erzeugt jetzt
  directive-raw.

**`serialization/plateToMarkdown.ts`:** unverändert — `ELEMENT_DIRECTIVE_RAW` gibt `rawMarkdown`
verbatim aus (bereits vorhanden, Zeile 242). Sicherstellen, dass `rawMarkdown` den vollen Fence
enthält (siehe oben).

**`src/components/MarkdownContent.tsx`:** **kein neuer Zweig zwingend nötig.** Verifiziert: der
`default`-Zweig in `RenderBlocks` (Zeile 190–191) rendert `block.content` bereits als
`MarkdownSegment`. Da der `directive-raw`-Block den **inneren** Inhalt in `block.content` trägt
(Fence in `directiveId`), degradiert die öffentliche Seite automatisch sanft (innerer Inhalt als
Markdown, `:::name`/`:::`-Rahmen verworfen) statt Roh-Text zu leaken. Optional ein expliziter
`case 'directive-raw'` (identisch zum default) nur zur Lesbarkeit. „Drei Dateien synchron"-Regel
gilt weiterhin für die `Block`-Union.

### Teil 3 — Golden-Roundtrip-Tests

`src/components/admin/editor/serialization/__tests__/roundtrip.test.ts` (bzw. `src/lib/__tests__/`),
`node:test` via `tsx` (Projekt-Konvention, flache Assertions wie `slug.test.ts`).

**Invarianten je Fixture `md`:**
- Sei `rt(x) = plateToMarkdown(markdownToPlate(x))`.
- **Idempotenz:** `rt(rt(md)) === rt(md)` (nach einer Normalisierung stabil).
- **Renderer-Treue:** `parseBlocks(md)` ≡ `parseBlocks(rt(md))` (gleiche Block-Typen/-Reihenfolge/
  -Kerninhalte) — bindet den Editor-Roundtrip an die Interpretation des öffentlichen Renderers und
  fängt Divergenz.
- **Kein Verlust:** kritische Substrings (URLs inkl. `)`, Direktivnamen, Linktexte) überleben in `rt(md)`.

**Fixture-Korpus (kuratiert):**
- Link mit `)` in URL: `[Wiki](https://de.wikipedia.org/wiki/Foo_(Bar))`.
- Verschachtelter Linktext: `[a [b] c](https://x.y)`.
- Bild-Zeile mit `)` in URL.
- Jede Direktive **verschachtelt** in `callout` / `box` / `columns-2/3` (info/warning/tip/danger,
  hero, banner-*, slider-*, products-*).
- Unbekannte Direktive `:::foo … :::` (auch verschachtelt in callout) → als directive-raw erhalten.
- Gemischtes Dokument: Headings, Listen, Blockquote, Codeblock, hr, Absätze.

**Merge-Gate:** Ab hier darf kein neuer Node/keine Direktive mergen ohne Fixture, die ihn/sie
verschachtelt in einem Block-Kontext abdeckt.

## Betroffene Dateien

- `src/components/admin/editor/serialization/markdownToPlate.ts` — Inline-Scanner + directive-raw-Case.
- `src/lib/directiveParser.ts` — generischer Fence-Detektor, `directive-raw`-Block, Tiefenlogik.
- `src/components/MarkdownContent.tsx` — optionaler expliziter `directive-raw`-Case (default deckt es
  bereits ab; verifiziert Zeile 190–191).
- `src/components/admin/editor/serialization/__tests__/roundtrip.test.ts` — **neu**.
- (`plateToMarkdown.ts` — nur wenn nötig; erwartet unverändert.)

## Risiken / Edge Cases

- **Geteilter Parser:** `parseBlocks` wird auch vom öffentlichen Renderer genutzt → jede Änderung
  gegen bestehende Inhalte prüfen (Golden-Tests + Live-Spot-Check). „Drei Dateien synchron".
- **Tiefenlogik:** Der generische Fence darf die `depth`-Zählung nicht verfälschen (bekannte UND
  unbekannte Fences erhöhen die Tiefe konsistent).
- **`---` als Spaltentrenner vs. hr:** unverändert lassen; `splitColumns` bleibt maßgeblich in
  `columns`-Kontext. Fixtures decken columns mit innerem Inhalt ab.
- **Whitespace-Normalisierung** (`\n\n`) macht Idempotenz erst nach einem Durchlauf wahr — deshalb
  `rt(rt(md)) === rt(md)`, nicht `rt(md) === md`.

## Verifikation

- `npm test` grün (neue Roundtrip-Tests + bestehende).
- `npm run build` grün.
- Manueller Spot-Check: eine reale Seite/Bio/Beschreibung im Admin in WYSIWYG öffnen, speichern,
  Diff prüfen (keine unerwartete Strukturänderung).

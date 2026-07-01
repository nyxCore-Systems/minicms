# WYSIWYG-Editor Ausbau — Roadmap & Zerlegung

**Datum:** 2026-07-01
**Status:** Zerlegung freigegeben; wird sub-projektweise gespect & gebaut.
**Grundlage:** Analyse-Workflow (4 Architektur-Maps + 6 nyxCore-Persona-Lenses + Synthese).

## Ausgangslage (verifiziert)

- Editor = **bestehender Plate v48**-Aufbau (`src/components/admin/editor/`), kein Greenfield.
- `MarkdownEditorField` (3 Modi: Markdown/WYSIWYG/Vorschau) ist erst an **einer** Stelle
  verdrahtet (`/admin/sections`) und **verwirft** dabei `contentJson`.
- End-to-end verdrahtet (Editor + `*Json` + `editorMode` + Public-Render via `MarkdownContent`)
  sind nur **3 Felder**: `Page.content`, `Artist.bio`, `Event.description`.
- Undo/Redo ist **bereits aktiv** (slate-history in Plate-Core); es fehlen nur Buttons/Keybinds.
- Markdown⇄Plate-Roundtrip = **handgeschriebener Regex-Parser** mit echten Bugs → Fundament.
- **„Ankündigungen"** existiert als Modell/Feature **nicht** im Code.

## Freigegebene Entscheidungen

- **Start:** Fundament zuerst (P0).
- **Undo/Redo:** ephemer jetzt (P3); benannte Snapshots später über bestehendes `PageVersion`
  (auf Artist/Event generalisiert); scrollbare 50-Schritt-Timeline-UI **gestrichen**.
- **Cuts/Defer:** Übersetzungen (10+ Sprachen, Terminologie, TMS-Export); Echtzeit-Rechtschreibung
  (stattdessen native Browser-Rechtschreibung + On-Demand-KI-Grammatik); Medien-Crop-UI + eigene
  Versionierung; externe Link-Vorschau (P6).
- **KI (P9):** in Scope — GDPR-Voraussetzungen (OpenAI-DPA + EU-Residency/ZDR + Per-Tenant-Opt-in
  default AUS + `datenschutz.md`) sind laut Nutzer machbar und sind harte Release-Blocker.

## Sub-Projekte

| ID | Name | Kompl. | Hängt ab von |
|----|------|--------|--------------|
| **P0** | Roundtrip-Absicherung & Serialisierungs-Sicherheitsnetz | M | – |
| **P1** | Editor-Konsolidierung (3 Impls → 1 geteilte Komponente) | M | P0 |
| **P2** | Barrierefreie Toolbar-Primitive | S | P1 |
| **P3** | Undo/Redo Keyboard + Toolbar-Wiring | S | P2 |
| **P7** | Medien: Auto-Optimierung (`f_auto/q_auto`) + Drag-&-Drop-Upload | M | P1 |
| **P4** | Echter Inline-Link-Node + Einfügen/Bearbeiten/Entfernen-UI | M | P1,P2,P3 |
| **P5** | Interne Event/Künstler-Links: Autosuggest + Vorschau-Karten (Direktiven) | M | P4 |
| **P9** | KI-Action-Framework + Beschreibungs-Generierung (compliance-gated) | M | P1 |
| **P8** | Bild-Ausrichtung + Medien-Bibliothek (Tags/Filter/Suche/Alt-Text) | M | P7,P0 |
| ~~P6~~ | ~~Externe URL-Vorschau (SSRF-gehärtet)~~ — **verschoben** | L | P4,P0 |

**Baureihenfolge (v1):** P0 → P1 → P2 → P3 → P7 → P4 → P5 → P9 → P8.

## Querschnitts-Gates (gelten für alle Sub-Projekte)

1. **Persistenz-Vertrag:** Reiche Attribute (interne Karten, Bild-Ausrichtung/-Breite, später
   Link-Vorschauen) leben als **Direktiv-Block** (`:::event-card`, `:::artist-card`, …) —
   der einzige roundtrip-sichere Kanal. Reine Links bleiben inline `a`. Keine Ad-hoc-Syntax,
   die der Parser nicht wieder einlesen kann.
2. **Ein-Commit-Regel:** Jeder neue Node/jede neue Direktive kommt zusammen mit einem P0-Golden-Test
   (verschachtelt in callout/box/columns) und wird in `DIRECTIVE_RE` + `Block`-Union + `parseBlocks`
   + beide Serializer + `MarkdownContent` in **einem** Commit ergänzt.
3. **Security must-not-ship (Nemesis):** SSRF-IP-Filter pro Redirect-Hop (P6); Upload-Content-Validierung
   + Tenant-Ordner-Verifizierung + kein rohes SVG (P7); Role-Gating + Rate-Limit auf allen KI-Endpoints
   (P9); href-Protokoll-Allowlist an Editor+Serializer+Renderer (P4); Embeds/iframes sandboxen.
4. **GDPR-Blocker:** Kein KI-/Egress-Feature geht live, bevor DPA + EU-Residency + Per-Tenant-Opt-in +
   `datenschutz.md`/ROPA stehen. Echtzeit-Rechtschreibung nur self-hosted/clientseitig, nie Keystroke-Stream.
5. **Accessibility-Gate:** Nichts rendert auf dem Noir-Theme ohne 4,5:1-Kontrastprüfung; jedes
   Editor-Feature bekommt einen Keyboard-Only-Pass; Alt-Text im Bild-Flow erzwungen.
6. **Snapshots ≠ Undo:** „Snapshots/Timeline/Zeitstempel+User" = bestehendes `PageVersion`-Muster
   (auf Artist/Event zu generalisieren), **nie** mit dem ephemeren slate-Undo aus P3 vermengt.
7. **Rollout ist eine Whitelist:** Nur `Page.content`, `Artist.bio`, `Event.description` sind fertig
   verdrahtet. Jedes weitere Feld (Vendor/Product/Section-Text/Excerpts) ist ein Mini-Projekt
   (Migration + Renderer-Swap + Content-Audit auf versehentliches Markdown). Ankündigungen brauchen
   zuerst ein Modell.

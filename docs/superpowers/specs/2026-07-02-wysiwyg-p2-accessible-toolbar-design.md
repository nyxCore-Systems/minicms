# P2 — Barrierefreie Toolbar-Primitive

**Datum:** 2026-07-02
**Bereich:** Plate-Editor-Toolbar (`src/components/admin/editor/PlateToolbar.tsx`,
`PlateEditor.tsx`, `SlashCommandMenu.tsx`), neue Primitive unter
`src/components/admin/editor/toolbar/`, neue reine Nav-Logik in `src/lib/`.
**Status:** Design freigegeben
**Teil der Roadmap:** [wysiwyg-roadmap](2026-07-01-wysiwyg-roadmap.md) — Sub-Projekt P2.
**Baut auf:** P1 (Editor-Konsolidierung, gemerged PR #6). **Vorbereitung für:** P3 (Undo/Redo-
Toolbar-Wiring) und P4 (Link-UI), die dieselben Primitive wiederverwenden.

## Problem

Die Editor-Toolbar (`PlateToolbar.tsx`, 138 Zeilen) ist praktisch **nicht tastaturbedienbar**
und semantisch nackt:

- **Tastatur tot:** Jeder Button wendet die Aktion in `onMouseDown` + `preventDefault()` an (um die
  Editor-Textauswahl zu erhalten) und hat **kein** `onClick`/`onKeyDown`. Tastatur-Aktivierung feuert
  `click`, nicht `mousedown` → ein Tastaturnutzer kann über die Toolbar **nichts** auslösen
  (Fett/Kursiv/Überschrift/Bild/Block).
- **Keine Toolbar-Semantik:** Der Wrapper-`<div>` hat kein `role="toolbar"`/`aria-label`, kein Roving
  Tabindex, keine Pfeiltasten-Navigation (WAI-ARIA-Toolbar-Muster). Jeder Button ist ein eigener Tab-Stopp.
- **Kein `aria-pressed`** auf den Umschalt-Buttons (Fett/Kursiv/Durchgestrichen) — der Aktiv-Zustand ist
  nur farblich, für Screenreader unsichtbar.
- **Labels nur via `title`** — die Buttons enthalten nur Glyphen/SVG (B, I, S, H1–3, Bild-Icon); es
  fehlt `aria-label`.
- **Kein sichtbarer Tastatur-Fokus** (kein `focus-visible`-Ring) — Roving-Navigation wäre unsichtbar.
- **Kontrast ungeprüft:** `hover:text-gray-700` und der Muted-Idle-Zustand sind nie gegen den echten
  Toolbar-Hintergrund auf 4,5:1 geprüft (Accessibility-Gate #5).
- **`+ Block`** öffnet `SlashCommandMenu` nur per `onMouseDown` → per Tastatur nicht öffenbar.

`SlashCommandMenu` selbst ist innen bereits weitgehend tastaturfähig (Suchfeld mit Autofokus,
Pfeil-hoch/runter, Enter zum Einfügen, Escape zum Schließen) — ihm fehlen nur ARIA-Listbox-Rollen und
ein Tastatur-Öffnungspfad + Fokus-Rückgabe.

## Ziele

- Die Toolbar wird ein konformes **WAI-ARIA-Toolbar** (role, `aria-label`, Roving Tabindex,
  Pfeil-/Home-/End-Navigation), dessen Buttons **per Maus UND Tastatur** funktionieren, ohne die
  Editor-Auswahl zu verlieren.
- Wiederverwendbare **Toolbar-Primitive** (`Toolbar`, `ToolbarButton`, `ToolbarToggleButton`,
  `ToolbarSeparator`), auf die P3/P4 aufsetzen.
- `aria-pressed` auf Umschalt-Buttons, `aria-label` auf allen Controls, sichtbarer `focus-visible`-Ring.
- 4,5:1-Kontrast-Pass auf allen Zuständen; Fehlschläge behoben.
- `+ Block` per Tastatur öffenbar; Fokus wandert ins Menü und kehrt beim Schließen (Escape/Auswahl)
  zum Trigger zurück — **keine Tastaturfalle**.

## Nicht-Ziele (bewusst / später)

- **Keine neuen Toolbar-Buttons.** Undo/Redo ist P3, Link-Einfügen/-Bearbeiten ist P4.
- **Keine ARIA-Listbox-Überarbeitung von `SlashCommandMenu`** (`role=listbox/option`,
  `aria-activedescendant`, `aria-selected`) — dokumentierter Folge-Schritt, nicht P2.
- **Keine** Änderung an Serialisierung, Direktiven, `directiveParser.ts` oder dem P0-Golden-Gate.
- **Keine** neue Test-Infrastruktur (kein jsdom/Testing-Library) — siehe Testansatz.

## Entscheidungen (mit Nutzer bestätigt)

- **Ansatz:** Hand-gerolltes Roving-Tabindex-Muster, gestützt auf eine reine, getestete Nav-Funktion
  (verworfen: `aria-activedescendant`; externe Bibliothek wie Radix/Ariakit — Dependency + kämpft mit
  dem Editor-Fokus, gegen die Hand-gerollte Editor-Philosophie).
- **Block-Menü-Tiefe:** Toolbar + Primitive + Menü ohne Tastaturfalle; interne ARIA-Listbox-Rollen sind
  Folge-Schritt.
- **Testansatz:** Reine Nav-Logik in `src/lib/toolbarNav.ts` mit `node:test`; React-Verdrahtung über
  `npm run build` + manuellen Keyboard-only- und Screenreader-Pass (kein React-Test-Runner im Projekt —
  gleiches Muster wie P1s `contentEditor.ts`).

## Design

### Kernproblem: Tastatur-Aktivierung ohne Verlust der Editor-Auswahl

In jedem Primitiv:

- **`onMouseDown` → nur `preventDefault()`** (verhindert Fokus-Diebstahl durch den Button; **keine**
  Aktion hier).
- **`onClick` → führt das Kommando aus.** `click` feuert sowohl bei Maus-Loslassen als auch bei
  Tastatur-Enter/Space, daher läuft die Aktion bei beiden Eingaben **genau einmal**.
- **Fokus-Rückgabe:** Plate/Slate hält `editor.selection` im Modell, auch während der DOM-Fokus auf
  einem Button liegt. Die bestehenden Handler in `PlateEditor` (`toggleMark`, `insertNode`,
  `handleInsertImage`) bekommen ein abschließendes `editor.tf.focus()`. Auf dem Maus-Pfad hat der Fokus
  den Editor nie verlassen (No-Op); auf dem Tastatur-Pfad kehrt der Cursor in den Text zurück
  („aktivieren → weitertippen").

Die Kommando-Verdrahtung bleibt in `PlateEditor` (dem Besitzer der Editor-Instanz); die Primitive
bleiben editor-agnostisch (sie liefern nur `onActivate`), damit P3/P4 sie wiederverwenden können.

### Reine Nav-Logik — `src/lib/toolbarNav.ts`

```ts
/**
 * Horizontale Toolbar, umlaufend. Liefert den nächsten Fokus-Index oder null,
 * wenn `key` keine Navigationstaste ist (dann Event durchlassen).
 */
export function nextToolbarIndex(key: string, current: number, count: number): number | null
//   'ArrowRight' | 'ArrowDown' -> (current + 1) % count           (umläuft zum ersten)
//   'ArrowLeft'  | 'ArrowUp'   -> (current - 1 + count) % count    (umläuft zum letzten)
//   'Home' -> 0 ;  'End' -> count - 1
//   sonst -> null
```

React-frei → `node:test` in `src/lib/__tests__/toolbarNav.test.ts`. Der `Toolbar`-Container ruft die
Funktion im `keydown` auf, aktualisiert seinen `activeIndex` und fokussiert die Ref an diesem Index;
jedes Kind trägt `tabIndex = index === activeIndex ? 0 : -1` (Roving). Bei `count <= 1` bleibt der
Index 0 (Umlauf trivial).

### Primitive — `src/components/admin/editor/toolbar/`

- **`Toolbar`** — `role="toolbar"`, `aria-label` (Prop), `aria-orientation="horizontal"`. Besitzt
  `activeIndex`-State, eine Ref-Registry (Kinder registrieren sich in DOM-Reihenfolge) und den
  `keydown`-Handler über `nextToolbarIndex`. **Ein** Tab-Stopp. Stellt einen Context bereit, über den
  Kinder ihren Index + den aktiven Index lesen und sich registrieren.
- **`ToolbarButton`** — Kommando-Button (Überschriften, Bild, „+ Block"): `type="button"`,
  `aria-label` (Prop), Roving-`tabIndex` aus dem Context, `onMouseDown`=preventDefault +
  `onClick`→`onActivate`, sichtbarer `focus-visible:ring-2 focus-visible:ring-brand-accent`.
- **`ToolbarToggleButton`** — wie `ToolbarButton` plus `aria-pressed={pressed}` (Fett/Kursiv/
  Durchgestrichen), gespeist aus `activeMarks`.
- **`ToolbarSeparator`** — `role="separator" aria-orientation="vertical"`, nicht fokussierbar
  (vom Roving übersprungen; registriert sich nicht in der Fokus-Registry).

`PlateToolbar` wird neu aus diesen Primitiven komponiert; die sichtbare Optik bleibt bis auf den neuen
Fokus-Ring gleich.

### ARIA, Kontrast & Fokus (Accessibility-Gate #5)

- Jeder Button erhält ein deutsches `aria-label` (entsprechend dem heutigen `title`); `title` bleibt
  für den Hover-Tooltip erhalten.
- Umschalt-Zustand über `aria-pressed` (nicht nur farblich).
- **Kontrast-Pass:** 4,5:1-Prüfung auf Idle-Glyphentext / Hover / Aktiv / Fokus-Ring gegen den
  **tatsächlichen** Toolbar-Hintergrund; jeder Zustand, der durchfällt (insb. `hover:text-gray-700`
  und der Muted-Idle-Ton), wird auf ein geprüftes Token angehoben. Exakte Tokens im Plan, nach Messung.
  (Icon-only-Buttons als UI-Komponenten benötigen ≥3:1 nach WCAG 1.4.11; Buchstaben-Glyphen als Text
  benötigen ≥4,5:1 nach 1.4.3.)
- **Sichtbarer Tastatur-Fokus:** `focus-visible`-Ring auf jedem Control (heute keiner).

### Block-Menü — keine Tastaturfalle

`SlashCommandMenu` hat bereits Suche + Pfeil-hoch/runter + Enter + Escape + Autofokus des Suchfelds.
P2 ergänzt nur die Fallenvermeidung:

- Der „+ Block"-`ToolbarButton` öffnet das Menü über `onActivate` (also auch per Tastatur).
- Beim **Schließen über Escape oder nach Auswahl** kehrt der Fokus zum „+ Block"-Trigger zurück.
  Die Rückgabe wird **an einer Stelle** implementiert: in `PlateToolbar`s `onClose`-Handler
  (`() => { setShowBlockMenu(false); blockBtnRef.current?.focus() }`).
- Voraussetzung: `SlashCommandMenu` ruft `onClose` auf **jedem** Menü-eigenen Schließpfad auf
  (Escape, Enter-Auswahl, Klick-Auswahl). Escape ruft es bereits. Falls ein Auswahl-Pfad `onClose`
  heute **nicht** aufruft, wird dieser eine Aufruf ergänzt — das ist die einzige mögliche Änderung
  an `SlashCommandMenu`.
- **Outside-Click**-Schließen (der bestehende `mousedown`-Listener in `PlateToolbar`) fokussiert den
  Trigger **nicht** zurück (der Nutzer ist woanders) und läuft **nicht** über `onClose`, sondern setzt
  `showBlockMenu=false` direkt — zwei getrennte Schließpfade.

Das Suchfeld-Autofokus des Menüs bleibt unverändert.

## Betroffene Dateien

- `src/lib/toolbarNav.ts` — **neu**, reine `nextToolbarIndex`.
- `src/lib/__tests__/toolbarNav.test.ts` — **neu**, `node:test` (TDD).
- `src/components/admin/editor/toolbar/` — **neu**: `Toolbar`, `ToolbarButton`, `ToolbarToggleButton`,
  `ToolbarSeparator` (+ interner Context/Index-Registry). Kleine, fokussierte Dateien.
- `src/components/admin/editor/PlateToolbar.tsx` — Neubau aus den Primitiven; Block-Menü-Fokus rein/raus.
- `src/components/admin/editor/PlateEditor.tsx` — abschließendes `editor.tf.focus()` in
  `toggleMark`/`insertNode`/`handleInsertImage`.
- `src/components/admin/editor/SlashCommandMenu.tsx` — **erwartet unverändert**; nur falls ein
  Auswahl-Schließpfad heute `onClose` nicht aufruft, wird dieser eine Aufruf ergänzt (Fokus-Rückgabe
  selbst lebt in `PlateToolbar`s `onClose`).

## Risiken / Edge Cases

- **Doppel-Auslösung bei Maus:** Wird verhindert, indem die Aktion **nur** in `onClick` liegt und
  `onMouseDown` ausschließlich `preventDefault()` macht (kein Aktions-Aufruf). Ein Maus-Klick → ein
  `click`; eine Tastatur-Aktivierung → ein `click`.
- **`editor.tf.focus()` auf dem Maus-Pfad:** harmlos (Fokus war nie weg). Falls es einen sichtbaren
  Cursor-Sprung verursacht, im Plan verifizieren; erwartet unkritisch.
- **Roving-Tabindex vs. Editor-Tab-Reihenfolge:** Die Toolbar steht vor der `contentEditable` im DOM;
  als **ein** Tab-Stopp gelangt der Nutzer per Tab hinein, navigiert per Pfeil, aktiviert → Fokus zurück
  in den Text. Kein zusätzlicher Shortcut nötig.
- **Separator im Roving:** Separatoren registrieren sich nicht in der Fokus-Registry, damit die
  Pfeil-Navigation sie überspringt.
- **Kein React-Test-Runner:** die testbare Logik ist `toolbarNav.ts` (rein); die Verdrahtung wird über
  Build + manuellen a11y-Pass abgesichert.

## Verifikation

- `npm test` grün (neue `toolbarNav.test.ts` + bestehende inkl. P0-Golden-Gate).
- `npm run build` grün (keine Typfehler).
- **Manueller Keyboard-only-Pass:** Tab erreicht die Toolbar → Pfeil/Home/End roamt über die Controls →
  Enter/Space wendet an → Fokus kehrt in den Text zurück; „+ Block" öffnet per Tastatur, Escape/Auswahl
  gibt den Fokus an den Trigger zurück.
- **Manueller Screenreader-Pass:** Toolbar wird als Toolbar angesagt; jeder Button hat einen Namen;
  Umschalt-Buttons sagen ihren Pressed-Zustand an.
- **Kontrast-Pass:** alle Zustände gegen den Toolbar-Hintergrund geprüft; Fehlschläge behoben.

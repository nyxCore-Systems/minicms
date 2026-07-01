# Timetable-Editor: Datum/Zeit aufräumen + Drag-and-Drop-Sortierung

**Datum:** 2026-07-01
**Bereich:** Admin → Events → Timetable-Builder
**Status:** Design freigegeben

## Problem

Im Timetable-Builder (`src/components/admin/events/TimetableBuilder.tsx`) hat jeder Slot
**zwei volle `datetime-local`-Felder** (Start + Ende). Dadurch wird das Festival-Datum pro
Slot doppelt eingegeben, die Felder sind zu schmal, um lesbar zu sein (`07.08.202…`), und
es gibt keine Möglichkeit, Slots manuell zu sortieren.

## Ziele

1. **Datum/Zeit-Eingabe entschlacken** — kein wiederholtes Volldatum mehr; ein kompaktes
   Tag-Dropdown plus reine Uhrzeitfelder pro Slot.
2. **Drag-and-Drop-Sortierung** — Timetable-Zeilen global (bühnenübergreifend) per Drag&Drop
   umsortierbar; die Reihenfolge wird über `sortOrder` persistiert.

## Nicht-Ziele (YAGNI)

- Die **öffentliche** Event-Seite bleibt unverändert (sortiert weiter nach `startTime`;
  `lib/events.ts` und der Public-Renderer werden nicht angefasst). Die Drag-Reihenfolge
  gilt nur im Admin-Editor.
- Keine Sortierung „pro Bühne gruppiert“ — die Sortierung ist global über alle Slots.
- Keine Änderung am PUT/POST/DELETE-Vertrag für einzelne Appearances.

## Kontext (Ist-Zustand)

- **Model `Appearance`** (`prisma/schema.prisma`): `startTime DateTime`, `endTime DateTime?`,
  `sortOrder Int @default(0)`, `note String?`. Kein Schema-Change nötig.
- **Model `Event`**: `startDate DateTime`, `endDate DateTime?` → Quelle für die Festivaltage.
- **Server-Validierung** (`src/lib/event-validation.ts`, `sanitizeAppearance`): weist
  `endTime <= startTime` als ungültig zurück. → Overnight-Slots müssen clientseitig korrekt
  als „nächster Tag“ berechnet werden.
- **API GET** `/api/admin/events/[id]` liefert Appearances sortiert nach `startTime, sortOrder`.
- **Keine DnD-Bibliothek** im Projekt vorhanden.

## Entscheidungen

- **DnD-Bibliothek:** `@dnd-kit/core` + `@dnd-kit/sortable` (barrierefrei, touch-tauglich).
- **Sortier-Scope:** global über alle Slots.
- **Öffentliche Ansicht:** unverändert.

## Teil 1 — Datum/Zeit-Eingabe

Pro Slot ersetzen wir die zwei `datetime-local`-Felder durch **drei Felder**:

| Feld | Typ | Quelle / Verhalten |
|------|-----|--------------------|
| Tag  | `<select>` | Optionen aus `event.startDate`…`event.endDate` (inklusive, tageweise). Format `DD.MM.` |
| Start | `<input type="time">` | Uhrzeit des Slot-Beginns |
| Ende  | `<input type="time">` | Uhrzeit des Slot-Endes (optional) |

**Tagesliste bilden:**
- Aus `startDate` bis `endDate` (falls `endDate` null → nur `startDate`) je ein Eintrag pro
  Kalendertag, lokale Zeitzone.
- Fällt der gespeicherte Tag eines bestehenden Slots außerhalb dieses Bereichs (Altdaten),
  wird dieser Tag zusätzlich in die Optionsliste aufgenommen, damit keine Daten „verschwinden“.
- Jede Option: `value` = `YYYY-MM-DD` (lokal), Label = `DD.MM.` (ggf. `DD.MM.YYYY` wenn das
  Festival über einen Jahreswechsel geht — Kann-Fall, Label enthält Jahr nur bei Bedarf).

**Rekombination zu ISO-Datetime (beim Speichern):**
- `startTime` = ausgewählter Tag + Start-Uhrzeit (lokal) → ISO.
- `endTime` = ausgewählter Tag + Ende-Uhrzeit (lokal) → ISO; leer → `null`.
- **Overnight-Regel:** ist `endTime <= startTime` (z. B. 23:00 → 01:00), wird `endTime` auf den
  **Folgetag** gelegt (+1 Tag), bevor gesendet wird. So passieren Late-Night-Slots die
  Server-Validierung.

**Zerlegung beim Laden (ISO → Tag/Zeit):** gespeicherte `startTime`/`endTime` werden lokal in
`day` (`YYYY-MM-DD`), `startClock` (`HH:mm`), `endClock` (`HH:mm`) zerlegt. Der Ende-Tag wird
nicht separat gehalten; er ergibt sich aus der Overnight-Regel beim Zurückschreiben.

**Helper-Funktionen** (im Builder oder ausgelagert nach `src/lib/`, mit Unit-Tests):
- `localDayKey(date): string` → `YYYY-MM-DD` in lokaler Zeit.
- `localClock(date): string` → `HH:mm` in lokaler Zeit.
- `combineDayClock(day, clock): Date` → lokaler Tag + Uhrzeit → Date.
- `eventDays(startDate, endDate, extraDays[]): {value,label}[]` → sortierte, deduplizierte
  Tagesliste inkl. Altdaten-Tage.
- `resolveEndDate(startISO, day, endClock): Date | null` → wendet die Overnight-Regel an.

Diese reinen Funktionen sind der Kern und werden mit `node:test`/`tsx` getestet (siehe Tests).

## Teil 2 — Drag-and-Drop-Sortierung

**UI:**
- Zeilen werden über `@dnd-kit/sortable` in einer `SortableContext` gerendert (Strategie:
  `verticalListSortingStrategy`).
- Jede Zeile bekommt ein **Drag-Handle** (`⠿`) links; nur das Handle startet den Drag
  (`listeners` am Handle), damit Selects/Inputs weiter normal bedienbar sind.
- Reihenfolge im Editor = nach `sortOrder` (der Builder sortiert die geladenen Rows
  clientseitig nach `sortOrder`, nicht nach `startTime`, damit die manuelle Ordnung maßgeblich ist).
- Keyboard-Sortierung via `KeyboardSensor` (dnd-kit Default) für Barrierefreiheit.

**Persistenz:**
- Beim Drop: lokale Reihenfolge via `arrayMove` aktualisieren, `sortOrder` 0..n neu vergeben
  (optimistic update), dann Batch-Request senden.
- **Neuer Endpoint:** `PUT /api/admin/events/[id]/appearances/reorder`
  - Body: `{ ids: string[] }` — die Appearance-IDs in gewünschter Reihenfolge.
  - Auth: `authTenant()` wie die übrigen Routen.
  - Validierung: Event gehört zum Tenant; **alle** übergebenen IDs gehören zu diesem Event
    (Query `appearance.findMany({ where: { eventId, id: { in: ids } } })`, Count-Abgleich).
    Bei Mismatch → 400, keine Teil-Updates.
  - Update: `prisma.$transaction(ids.map((id, i) => prisma.appearance.update({ where: { id }, data: { sortOrder: i } })))`.
  - Response: 204 (oder aktualisierte Liste).
- Schlägt der Request fehl → `reload()` (Server-Wahrheit wiederherstellen) + Fehlermeldung.

## Betroffene Dateien

- `package.json` — `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` hinzufügen.
- `src/components/admin/events/TimetableBuilder.tsx` — Row-UI (Tag+Zeit statt datetime-local),
  DnD-Wrapper, Drag-Handle, Reorder-Persistenz, clientseitige Sortierung nach `sortOrder`.
- `src/app/api/admin/events/[id]/appearances/reorder/route.ts` — **neu**, Batch-Reorder-PUT.
- `src/lib/timetable-datetime.ts` (o. ä.) — **neu**, reine Datum/Zeit-Helfer (testbar).
- `src/lib/__tests__/timetable-datetime.test.ts` — **neu**, Unit-Tests der Helfer.

## Tests

`node:test` via `tsx` (Projekt-Konvention):

- `localDayKey` / `localClock`: bekannte Date → erwartete Strings (lokale TZ).
- `combineDayClock`: Tag + Uhrzeit → korrektes Date.
- `resolveEndDate` Overnight: Start 23:00, Ende 01:00 → Ende am Folgetag; Start 20:00,
  Ende 21:00 → gleicher Tag; leeres Ende → `null`.
- `eventDays`: 07.–08.08. → zwei Tage; `endDate` null → ein Tag; Altdaten-Tag außerhalb →
  wird eingefügt und sortiert; Deduplizierung.
- Reorder-Route: manuell/Integration nicht zwingend automatisiert — Kernlogik ist die
  Transaktion; die Helfer tragen die Testlast. (Optional: Validierungsfall „fremde ID“ prüfen,
  falls leicht machbar.)

## Risiken / Edge Cases

- **Zeitzone:** alle Zerlegungen/Rekombinationen konsequent lokal (wie bestehendes
  `toLocalInput`), sonst Tagesverschiebung. Helfer kapseln das.
- **Altdaten** ohne echte Uhrzeit (Mitternacht): Zeitfelder zeigen `00:00`; unkritisch.
- **Overnight ohne Datum-Wechsel im UI:** Nutzer sieht nur Uhrzeiten; die +1-Tag-Regel ist
  implizit. Akzeptiert für den Festival-Use-Case; ggf. später sichtbarer Hinweis.
- **Drag vs. Feld-Interaktion:** Handle-only-Drag verhindert versehentliches Ziehen beim
  Editieren.

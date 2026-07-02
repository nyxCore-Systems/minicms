# Letter to Myself — SEO Wave 2b Handoff

**Kontext:** Wave 1 (Rebrand-Regressionen, JsonLd-XSS-Escape, dynamische Sitemap,
canonical) und Wave 2a (SiteSettings.socialLinks + contactAddress, MusicFestival-
JSON-LD auf /, LocalBusiness-Helper, SPEAKABLE_SELECTORS) sind gemerged.
Wave 2b sind drei kleine, klar umrissene Reste.

## Offene Tasks (2b)

1. **speakable an buildEventJsonLd** — `src/lib/seo.ts`: Funktion
   `buildEventJsonLd` lesen (NIE gelesen — Signatur unbekannt, nicht raten!),
   im Return-Objekt `speakable: SPEAKABLE_SELECTORS` ergänzen (Export existiert
   bereits aus 2a). In `src/app/(public)/events/[slug]/page.tsx` den
   Subtitle-/Excerpt-Absatz mit `data-speakable` markieren.
2. **LocalBusiness auf /kontakt + /impressum** — `getLocalBusinessJsonLd()`
   existiert bereits in seo.ts (2a). Einbau in
   `src/app/(public)/[...slug]/page.tsx`. ACHTUNG: read_file auf diesen Pfad
   wurde vom Path-Traversal-Guard blockiert (`..` im Verzeichnisnamen) —
   Datei lokal lesen oder Pfad-Escaping klären. Pattern: currentPath aus
   params.slug joinen, bei /kontakt|/impressum den Getter awaiten,
   `{localBusinessLd && <JsonLd data={localBusinessLd} />}` neben bestehendes
   JSON-LD setzen.
3. **Admin-UI für socialLinks + contactAddress** — NICHT /admin/system (das ist
   eine Cache/Ops-Konsole, verifiziert). Settings-Editor vermutlich
   /admin/setup — erst lesen. API-Seite ist fertig (PUT /api/admin/settings
   nimmt beide Felder zod-validiert an). UI minimal: textarea (eine URL pro
   Zeile) + 9 Adressfelder. Interim läuft Pflege über Prisma Studio.

## Pain Log (CRITICAL)
- `npm run lint` unbenutzbar (interaktiver Wizard) → `npx tsc --noEmit` + build
- Prisma CLI liest `.env`, nicht `.env.local`
- seo.ts enthält ungelesene Funktionen (buildEventJsonLd, buildArtistJsonLd?)
  → Datei nie als Ganzes ersetzen, nur Sektionen
- Deprecated `websiteJsonLd`/`organizationJsonLd` Re-Exports in seo.ts:
  in Wave 3 entfernen, sobald kein Import mehr existiert (grep!)
- CKB-Text-Search für dieses Repo unzuverlässig (Insights-Index-Gap) —
  Datei-Reads sind die einzige Wahrheit

## Danach (Wave 3, kein Code)
Wikidata-Eintrag anlegen → Q-ID in socialLinks als sameAs zurückverlinken;
Google Business Profile; NAP-Audit; 10 regionale Zitations-Portale;
Presse-Outreach. Wave 4: robots-AI-Bot-Policy, llms.txt, INP-Audit,
VideoObject für festival-filme.

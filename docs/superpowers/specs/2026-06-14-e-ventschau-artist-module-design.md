# Künstler-Modul (Artist Module) — Design Spec

- **Datum:** 2026-06-14
- **Projekt:** e-Ventschau (minicms-Skeleton), `/Users/oliverbaer/Projects/minicms`
- **Status:** Spec 1 von geplant 2 (Künstler → Events/Timetable)
- **Reviews eingearbeitet:** Athena (Architektur/Pattern-Reuse), Harmonia (UX/Component-API/A11y), Nemesis (Security), Ipcha Mistabra (Pre-Mortem)

---

## 1. Kontext & Ziel

e-Ventschau ist eine ehrenamtlich (~20 Personen) betriebene Benefiz-Festival-Seite auf einem multi-tenant Next.js-15 / Prisma-6 (Neon) / NextAuth-4 Skeleton. Ziel von Spec 1: ein **Künstler-Modul**, das Bands/Acts mit vollständigem Profil, öffentlicher Detailseite, Medien-Galerie, wiederverwendbaren Cards und Admin-CRUD darstellt — und sich in die bestehende Slider-/Banner-Maschine einklinkt.

**Build-Reihenfolge:** Künstler zuerst, weil das spätere Events-Modul Künstler referenziert.

## 2. Scope

**In Scope (Spec 1):**
- `Artist`-Datenmodell (tenant-scoped), `ArtistMedia` (Galerie)
- Öffentliche Routen `/kuenstler` (Index) + `/kuenstler/[slug]` (Detail)
- Komponenten `ArtistCard`, `ArtistGallery`, `SocialLinks`
- Admin-CRUD `/admin/artists` (+ `/new`, `/[id]`) + REST-API
- Slider-Integration: `SliderItemType.ARTIST`
- Seed der 7 Line-up-2026-Bands; Header-Menü; Sitemap
- Pro-Künstler-SEO + JSON-LD (`MusicGroup`)

**Out of Scope (Backlog, eigene Specs):** Ticketing/Zahlungen, Newsletter/ESP, Besucher-Analytics/Demografie, Social-Follower-Sync, Reviews/Bewertungen, Buchung/Honorar.

**Harte Scope-Regel (Ipcha):** Deferred-Features bekommen **keinen Schema-Fußabdruck**. Es werden keine Ticket-Links, Mailing-Tags oder Follower-Zahlen in `tags[]`/`Json?`-Felder „zwischengeparkt". Wer ein Feld für ein deferred-Feature will, bekommt ein eigenes Spec — kein generischer Overflow.

## 3. Architektur & Ansatz

**Gewählt:** Dediziertes `Artist`-Modell, das das erprobte `Vendor`-Muster spiegelt (Profil + Detailseite + Cards + Admin-CRUD + Slider-Hook), aber mit korrekter Semantik und ohne die Vendor-Altlasten (s. §9, globaler Slug-Bug).

**Verworfen:**
- *Vendor generisch wiederverwenden* — falsche Semantik (`VendorCategory`, „Händler"-Begriffe), verschmutzt beide Module.
- *Generische „Entity"-Abstraktion für Artist+Event* — Over-Engineering (YAGNI); Event ist strukturell zu anders (Datum, Timetable, Bühne).
- *Generische Slider-`ref{type,id}`-Indirektion statt Enum* (Ipcha-Vorschlag) — bewusst abgelehnt: `SliderItemType` ist ein etablierter Enum mit expliziten FK-Spalten (`pageId/productId/vendorId/mediaId`). `ARTIST` + `artistId` anzufügen folgt der bestehenden Konvention; die Indirektion liefe gegen den Grain und wäre der größere, riskantere Umbau.

## 4. Datenmodell (Prisma)

```prisma
model Artist {
  id              String   @id @default(cuid())
  tenantId        String
  slug            String                       // Präsentation, nicht Identität
  name            String
  origin          String?                      // Herkunft, z. B. "Dänemark"
  genres          String[]                     // Tags (dekorativ in Spec 1)
  heroImage       String?                      // Cloudinary-URL (Host-validiert)
  excerpt         String?  @db.Text            // Kurzbeschreibung (Plaintext)
  bio             String?  @db.Text            // MARKDOWN (aus Plate via plateToMarkdown)
  bioJson         Json?                         // Plate-Value für Re-Edit (wie Page.contentJson)
  editorMode      String?                       // Konsistenz mit Page-Editor
  website         String?                       // https-only (validiert)
  socials         Json?                         // [{platform, url}] — https-only (validiert)
  metaTitle       String?
  metaDescription String?  @db.Text
  isActive        Boolean  @default(true)
  isFeatured      Boolean  @default(false)
  isPublished     Boolean  @default(false)      // Default-Draft
  sortOrder       Int      @default(0)
  createdById     String?                       // Edit-Attribution (Ipcha)
  updatedById     String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  tenant      Tenant        @relation(fields: [tenantId], references: [id])
  media       ArtistMedia[]
  sliderItems SliderItem[]
  // appearances ArtistAppearance[]   ← Forward-Seam für Spec 2, NICHT in Spec 1 gebaut

  @@unique([tenantId, slug])           // KEIN globaler @unique (Vendor-Bug nicht erben)
  @@index([tenantId])
  @@index([genres])
}

model ArtistMedia {
  id        String  @id @default(cuid())
  artistId  String
  kind      String                       // "image" | "youtube" | "vimeo"
  mediaId   String?                       // image: Ref auf Media (Cloudinary-Upload)
  imageUrl  String?                       // image: validierte res.cloudinary.com-URL
  videoId   String?                       // video: NUR die ID (nie Roh-URL) — validiert
  altText   String?                       // a11y; image ohne altText -> alt=""
  caption   String?
  sortOrder Int     @default(0)

  artist Artist @relation(fields: [artistId], references: [id], onDelete: Cascade)
  media  Media? @relation(fields: [mediaId], references: [id], onDelete: SetNull)

  @@index([artistId])
}
```

**Begleitänderungen:**
- `enum SliderItemType { PAGE PRODUCT VENDOR MEDIA ARTIST }`
- `SliderItem.artistId String?` + `artist Artist? @relation(... onDelete: SetNull)` (spiegelt `productId`)
- Rückrelationen: `Tenant.artists Artist[]`, `Media.artistMedia ArtistMedia[]`

**Bio-Speicherung (Security-kritisch, §9):** `bio` ist **Markdown**, gerendert über die bestehende `MarkdownContent`-Komponente (react-markdown v9, **kein** `rehype-raw`, kein `dangerouslySetInnerHTML`). `bioJson` hält den Plate-Value für verlustfreies Re-Editing — exakt wie `Page.content` + `Page.contentJson`. **Es wird niemals gerendertes HTML gespeichert.**

**Rolle als Kante, nicht Attribut (Ipcha):** „Headliner/Support" ist eine Eigenschaft eines *Auftritts*, nicht des Künstlers. Daher kommt kein `role`/`isHeadliner` auf `Artist`. Spec 2 führt `ArtistAppearance` (artistId + eventId + role + optional per-Auftritt-Notiz) ein. Artist bleibt die **stabile Identität** — ein Act, der mehrere Jahre spielt, ist *eine* Zeile, Varianten pro Edition liegen am Auftritt.

## 5. Öffentliche Oberfläche

### Routen
- **`/kuenstler`** — Index. Grid veröffentlichter, aktiver Künstler. `export const dynamic = 'force-dynamic'`. Deterministische Sortierung: `isFeatured DESC, sortOrder ASC, name ASC`. Empty-State: „Noch keine Künstler:innen veröffentlicht." (kein leeres Grid).
- **`/kuenstler/[slug]`** — Detail. Genau ein `<h1>` (Name), Sektionen als `<h2>`. Hero-Foto (mit Scrim hinter Overlay-Text), Genre-Tags (dekorativ), Bio (über `MarkdownContent`), `SocialLinks`, `ArtistGallery`, „Auftritte"-Sektion. Unveröffentlicht/unbekannt → `notFound()`.
- **„Auftritte"-Sektion:** wird **nur gerendert, wenn Daten existieren**. Vor Spec 2 entweder ganz weglassen oder eine einzelne gedämpfte Zeile „Termine folgen in Kürze." — niemals ein leeres `<section>` mit Heading (Heading-Outline/Screenreader).

### Komponenten (Harmonia-Prop-Tabellen)

**ArtistCard** — *Job: einen Künstler als verlinkte Zusammenfassung in beliebigem Listenkontext zeigen.*
| Prop | Typ | Default |
|---|---|---|
| `artist` | `ArtistSummary` (name, slug, genres[], heroImage, excerpt, featured) | — |
| `variant` | `'grid' \| 'list' \| 'carousel'` | `'grid'` |
| `priority` | `boolean` (LCP-Image) | `false` |
| `className` | `string` | — |

Single-`variant`-Enum (keine Boolean-Geschwister wie `isCarousel`), gemeinsamer presentational Core, Karte als Ganzes verlinkt (`<a>`), Name als `<h3>`. **Featured = Text-Label, nicht nur Farbe.** Carousel-spezifisches (Slide-ARIA) liegt bei Swiper/`ArtistGallery`, nicht in der Card → Prop-Explosion vermieden.

**ArtistGallery** — *Job: Bilder + Video-Embeds eines Künstlers barrierearm mit Zoom/Playback zeigen.*
| Prop | Typ | Default |
|---|---|---|
| `items` | `GalleryItem[]` (`{kind:'image'\|'youtube'\|'vimeo', src/videoId, altText?, caption?}`) | `[]` |
| `columns` | `2 \| 3 \| 4` | `3` |
| `enableLightbox` | `boolean` | `true` |

Empty → nichts rendern. Lightbox = fokus-getrappter `role="dialog"` `aria-modal="true"`, Esc schließt, Fokus kehrt zum auslösenden Thumbnail zurück, Pfeiltasten navigieren. Carousel/Slider über **Swiper (bereits Dependency, `@12`) mit aktiviertem `a11y`-Modul** statt handgebaut. Video-`<iframe>` bekommt `title`.

**SocialLinks** — *Job: wiederholbare externe Profillinks barrierearm rendern.*
| Prop | Typ | Default |
|---|---|---|
| `links` | `{platform, url, label?}[]` | `[]` |
| `size` | `'sm' \| 'md'` | `'md'` |
| `variant` | `'icon' \| 'labeled'` | `'icon'` |

Jeder Link: `aria-label` = Plattformname, `target="_blank"` + `rel="noopener noreferrer nofollow"`. Leeres Array → nichts rendern (kein leeres `<ul>`).

### SEO
`generateMetadata` aus Artist-Meta-Feldern; `JsonLd` mit `MusicGroup` (Name, Genre, Bild, sameAs = Social-URLs).

### Daten-Lib
`src/lib/artists.ts`: `getPublishedArtists()`, `getPublishedArtistBySlug(slug)` (→ `null` bei Draft/unbekannt), `getArtistsForAdmin()`. Alle tenant-scoped über `getTenant()`.

## 6. Admin-Oberfläche

- **`/admin/artists`** — Liste (Tabelle): Toggles aktiv/featured/published, Sortierung, Bearbeiten/Löschen. **`/new`**, **`/[id]`** gespiegelt von `/admin/vendors`.
- **Formular:** Name, Slug (auto aus Name, editierbar, validiert), Genres (Tag-Input), Herkunft, Hero-Foto (Media-Picker), Kurzbeschreibung, **Bio (PlateEditor)**, **Social-Links** (wiederholbar Plattform+URL), **Galerie-Manager** (Media-Picker multi + „YouTube/Vimeo-Link hinzufügen", der zu ID geparst wird), SEO-Felder, Draft/Publish-Toggle.
- **Sidebar:** Nav-Eintrag „Künstler".

### API-Contract
- `src/app/api/admin/artists/route.ts` — `GET` (Liste, tenant-scoped) · `POST` (anlegen)
- `src/app/api/admin/artists/[id]/route.ts` — `GET` · `PUT` · `DELETE`
- Auth: jeder Handler ruft die Session/Token-Prüfung auf und verlangt `['ADMIN','SUPER_ADMIN'].includes(token.role)` **vor** jedem DB-Zugriff (verbatim wie `vendors/route.ts`).
- `tenantId` **immer** aus `getTenant()` ableiten, **nie** aus dem Request-Body.
- `[id]`-Handler: `findUnique({where:{id}})` → ablehnen, wenn `tenantId !== tenant.id` (IDOR-Schutz, wie `vendors/[id]/route.ts`).
- **Feld-Allowlist** bei `POST`/`PUT` (kein `...body`-Spread): nur definierte schreibbare Felder; `id`/`tenantId`/Timestamps nie aus Client.

## 7. Slider-Integration

`ARTIST` end-to-end: Admin-Slider-Editor kann Künstler als Slide wählen (`SliderItem.artistId`), `filterMode: auto` kann Künstler nach `genres`/featured ziehen, öffentliches Rendering zeigt Artist-Slide (Bild + Name + Link auf `/kuenstler/[slug]`). Impressions/Klicks laufen über das bestehende generische `SliderImpression`-Tracking — **kein** dediziertes `ArtistClick`-Tracking in Spec 1.

## 8. Seed & Daten

Die 7 Line-up-2026-Bands (stehen als Array in `src/app/(public)/page.tsx`) werden als echte `Artist`-Records geseedet (Name, Herkunft, Genres, `isPublished: true`, `isFeatured: true` für Top-Acts, Hero-Foto-Platzhalter). Homepage-Line-up verlinkt dann auf `/kuenstler/[slug]`. Header-Menü „Künstler" im Seed.

## 9. Security-Controls (Nemesis — verpflichtend)

| # | Schwere | CWE | Control |
|---|---|---|---|
| 1 | CRITICAL | CWE-79 | **Kein gerendertes HTML speichern/rendern.** Bio bleibt Markdown, gerendert via bestehende `MarkdownContent` (react-markdown, kein `rehype-raw`, kein `dangerouslySetInnerHTML`). Keine `sanitize-html`-Dependency nötig. |
| 2 | HIGH | CWE-1021/79 | Video-Embeds nur als **ID**: Render ausschließlich `https://www.youtube-nocookie.com/embed/{id}` (`^[A-Za-z0-9_-]{11}$`) bzw. `https://player.vimeo.com/video/{id}` (`^\d+$`). Roh-URL niemals in `<iframe src>`. |
| 3 | HIGH | CWE-79/601 | `socials`/`website`: Scheme-Allowlist **nur `https:`** (optional `mailto:`), relative/`//`/Credentials ablehnen. Render mit `rel="noopener noreferrer nofollow" target="_blank"`. |
| 4 | HIGH | CWE-639 | Tenant-Scoping auf `[id]`-Routen: `findUnique` → reject bei `tenantId`-Mismatch. |
| 5 | HIGH | CWE-862 | Rollen-Allowlist-Check (`ADMIN`/`SUPER_ADMIN`) vor jedem DB-Zugriff. |
| 6 | MEDIUM | CWE-706 | `@@unique([tenantId, slug])` + scoped Uniqueness-Check (`tenantId_slug`). **Vendors globalen `@unique`-Slug-Bug nicht erben.** |
| 7 | MEDIUM | CWE-20 | Slug-Validierung `^[a-z0-9]+(?:-[a-z0-9]+)*$`, Längen-Cap, `.`/`/`/`%` ablehnen; Auto-Suffix bei Kollision. |
| 8 | MEDIUM | CWE-915 | Mass-Assignment: explizite Feld-Allowlist auf `POST`/`PUT` (s. §6). |
| 9 | LOW | CWE-918 | `heroImage`/Galerie-Bild-URLs gegen `res.cloudinary.com` validieren; Bilder über `next/image` (nicht bare `<img>`). |

## 10. UX/Accessibility-Anforderungen (Harmonia — verpflichtend)

- `prefers-reduced-motion: reduce`: Carousel-Autoplay aus, `group-hover:scale`/Transitions per globaler CSS-Regel gated (heute nur JS in `ScrollAnimation.tsx`).
- Kontrast-Check (WCAG AA 4.5:1): Genre-Tag-Pills (`text-brand-accent` = Rot `#a90707` auf Glas), `text-brand-text-muted`-Captions, Hero-Overlay-Text → solider Scrim hinter Text auf Foto.
- Alt-Text-Policy: `altText` pro Galerie-Bild (Fallback Artist-Name + Index), Hero-`alt` = Artist-Name, Video-`iframe` `title`. Rein dekorative Bilder `alt=""`.
- Genre-Tags **Spec 1 dekorativ** (nicht-interaktive `<span>`, keine Fake-Affordance). Filter-View `/kuenstler?genre=` ist Phase 2.
- Mobile-first: Grid `grid-cols-1` → `md:grid-cols-3`; Carousel degradiert zu swipebarer Einzelspalte mit sichtbarer Pagination.

## 11. Pre-Mortem-Mitigationen (Ipcha — angenommen/abgelehnt)

**Angenommen (in Design eingearbeitet):** Plate-JSON statt HTML (§4/§9 #1); Rolle als Kante (§4); Artist = stabile Identität, keine Jahres-Duplikate (§4); kein deferred-Schema-Overflow (§2); Edit-Attribution `createdById`/`updatedById` (§4).

**Als Ops-Risiko vermerkt, nicht in Spec 1 gebaut:**
- *Geteilte Admin-Creds / fehlende Edit-Historie:* Attribution-Felder sind drin; volle Per-User-Accounts + Artist-Versionierung (à la `PageVersion`) ist ein eigenes Folge-Thema. **Empfehlung:** geteilte Demo-Logins vor Go-Live ersetzen.
- *Cloudinary/Neon-Free-Tier-Limits bei Lineup-Announcement-Traffic + Galerie:* vor Launch grob hochrechnen (z. B. 50 Künstler × 20 Galerie-Bilder + Announcement-Spike).
- *Bus-Faktor 1 beim Vendor/Slider-Muster:* Spec + dieser Doc dienen der Wissensweitergabe; Code kommentieren wo Muster gespiegelt wird.

**Abgelehnt:** Slider-`ref{type,id}`-Indirektion (§3).

## 12. Migration, Fehlerfälle, Verifikation

- **Migration:** Schema erweitern → `npm run build` (`prisma generate`) → `npm run db:push`. ⚠️ Prisma liest `.env` (nicht `.env.local`).
- **Fehlerfälle:** unpublished/unbekannter Slug → `notFound()`; Admin ohne gültiges Token/Rolle → 401/403; Slug eindeutig pro Tenant (DB-Constraint + Auto-Suffix); ungültige Social-/Video-Eingaben → Validierungsfehler im Admin-Formular vor Speicherung.
- **Verifikation (kein Test-Framework):** `npm run build` grün; `npm run lint`; Smoke-Test `/kuenstler` + `/kuenstler/[slug]` (200, Draft → 404); ein Admin-CRUD-Roundtrip (anlegen → Bio/Galerie/Socials → veröffentlichen → öffentlich sichtbar → Slider zeigt Künstler); manueller a11y-Check (Tastatur durch Lightbox/Carousel, Heading-Outline).

## 13. Offene Punkte / Annahmen

- Index-Route heißt `/kuenstler` (vs. `/lineup`/`/bands`) — Annahme bestätigt, deutschsprachig konsistent.
- Galerie-Video unterstützt YouTube **und** Vimeo (beide ID-validiert).
- Hero-Fotos für die Seed-Bands sind zunächst Platzhalter (echte Assets folgen via Media-Upload).

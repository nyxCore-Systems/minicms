# Ideas

## Product & Feature Ideas

### Content & SEO
- **Auto-translate content** — Use AI to generate English/French versions of all pages, expanding market reach
- **Content scheduling** — Allow editors to schedule publish/unpublish dates for seasonal content
- **SEO A/B testing** — Generate multiple meta titles/descriptions per page, rotate them, measure CTR
- **Internal linking suggestions** — AI analyzes content and suggests cross-links between pages (e.g., link "Damaststahl" mention in herstellung to material page)
- **Content freshness alerts** — Auto-notify editors when pages haven't been updated in 90+ days
- **Reading time estimates** — Calculate and display estimated reading time on knowledge pages
- **Table of contents** — Auto-generate TOC from markdown headings for long-form content (new `:::toc` directive)

### Analytics & Insights
- **Heatmaps** — Track click positions per page to understand user interaction patterns
- **Conversion funnel** — Track page visit -> CTA form view -> form submission -> lead contacted
- **Search console integration** — Import Google Search Console data (impressions, clicks, positions) into the SEO dashboard
- **Keyword rank tracking** — Use the existing `SeoKeyword` model to periodically check Google rankings
- **Real-time dashboard** — WebSocket-based live visitor count and current page activity
- **Exit intent detection** — Track where users leave and offer targeted CTAs

### E-Commerce & Monetization
- **Product catalog** — Structured product pages with specs (blade length, steel type, HRC, weight, price)
- **Price comparison** — Show same knife across multiple partner dealers with price comparison
- **Affiliate link tracking** — Track click-throughs to partner shops with attribution
- **Vendor storefront pages** — Give each vendor a branded sub-page with their full catalog
- **Newsletter system** — Email capture with drip campaigns for knife knowledge content
- **Review/rating system** — User reviews for products with star ratings and verified purchase badges

### Community & Engagement
- **Knife knowledge quiz** — Interactive quiz ("Which knife type are you?") generating shareable results
- **Comparison tool** — Side-by-side knife comparison (steel, hardness, edge retention, price)
- **Knife glossary** — Searchable A-Z glossary of knife terminology
- **User collections** — Let visitors save favorite knives to a personal wishlist
- **Social sharing** — One-click share cards with knife images optimized for Instagram/Pinterest

### Technical
- **Image optimization** — Auto-generate WebP/AVIF variants, lazy loading, blur placeholders via Cloudinary transforms
- **PWA support** — Service worker for offline reading of knowledge articles
- **RSS feed** — Auto-generated from published content pages for feed readers
- **Webhook system** — Notify external services (Slack, email) on new leads, content updates, vendor signups
- **API rate limiting** — Add rate limiting to public endpoints (tracking, leads, menu)
- **Edge caching** — Use Vercel Edge Config or Redis for menu/settings caching instead of in-memory

---

## Design Ideas

- **Dark mode toggle** — Use existing `SiteSettings.darkMode` to add a user-facing toggle (currently admin-only)
- **Animated knife illustrations** — SVG animations of knife forging process on the herstellung page
- **Parallax hero backgrounds** — Subtle parallax scrolling on background images
- **Micro-interactions** — Hover animations on product cards, smooth page transitions
- **Print stylesheet** — Optimized print layout for knowledge articles

---

## Content Ideas

- **Knife care guides** — Seasonal maintenance tips (winter storage, humidity)
- **Chef interview series** — Profiles of professional chefs and their knife preferences
- **Steel comparison charts** — Interactive comparison of popular knife steels (VG-10, AUS-8, CPM-S35VN)
- **Video content** — Embedded sharpening tutorials, forge visits, unboxing videos
- **Buyer's guide** — "How to choose your first chef's knife" with decision flowchart
- **Regional knife traditions** — Articles on Solingen, Seki City, Thiers knife-making heritage

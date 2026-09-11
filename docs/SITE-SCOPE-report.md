# WKND Site Scope Report

**Source site:** `https://wknd.site/us/en` (WKND — Adobe demo adventure/travel site)
**Target:** `ramuvaram/capstone` on AEM Edge Delivery Services, Document Authoring (da.live) content source
**Live:** `https://main--capstone--ramuvaram.aem.live/us/en`
**Generated:** 2026-09-11

This report inventories the templates, block variants, and pages that define the migration scope. Source of truth: `tools/importer/page-templates.json`, the `blocks/` directory, and the imported content under `content/us/en/`.

---

## 1. Summary

| Metric | Count |
|--------|------:|
| Page templates | 6 |
| Custom block variants (WKND) | 8 |
| Unique pages migrated | 26 |
| Locales | 1 (`us/en`) |

---

## 2. Templates

Six templates were identified from the source URLs. Each row lists the blocks that template composes and how many pages use it.

| Template | URL pattern | Pages | Block variants used |
|----------|-------------|------:|---------------------|
| **home** | `/us/en` | 1 | carousel-hero, columns-featured, cards-article, hero-banner |
| **adventures** (detail) | `/us/en/adventures/*` | 16 | carousel-gallery, tabs-detail |
| **adventures-2** (listing) | `/us/en/adventures` | 1 | hero-banner, tabs-detail |
| **faqs** | `/us/en/faqs` | 1 | accordion-faq |
| **about-us** | `/us/en/about-us`, `/us/en/magazine` | 2 | cards-contributor, columns-featured, cards-article |
| **magazine** (article) | `/us/en/magazine/*` | 5 | *(default content only — no blocks)* |

> Note: `/us/en/magazine` (the magazine landing page) was analyzed under the `about-us` template cluster because it shares the same contributor/featured/article-cards layout; the magazine **article** pages are their own template.

---

## 3. Block Variants

Eight custom WKND block variants were generated for the migration (each has `.js`, `.css`, `metadata.json`, `README.md`). These are the blocks that carry WKND-specific structure/design.

| Block variant | Base | Used by template(s) | Purpose |
|---------------|------|---------------------|---------|
| **carousel-hero** | carousel | home | Full-bleed hero carousel with white overlay content card |
| **columns-featured** | columns | home, about-us | "Featured Article" two-column spotlight |
| **cards-article** | cards | home, about-us | Article/adventure teaser card grid |
| **cards-contributor** | cards | about-us | Team/contributor profile cards |
| **hero-banner** | hero | home, adventures-2 | Single-image banner with heading + CTA |
| **carousel-gallery** | carousel | adventures (detail) | Image gallery carousel on adventure pages |
| **tabs-detail** | tabs | adventures, adventures-2 | Adventure spec table + tabbed detail (with nested card grid) |
| **accordion-faq** | accordion | faqs | Expandable FAQ accordion |

**Vanilla/boilerplate blocks retained** (not WKND-specific, no `metadata.json`): `cards`, `columns`, `columns-details`, `hero`, `tabs-content`, `widget`, plus the framework blocks `header`, `footer`, `fragment`.

---

## 4. Pages

All 26 migrated pages, by template.

### home (1)
- `/us/en`

### adventures — detail (16)
- `/us/en/adventures/bali-surf-camp`
- `/us/en/adventures/beervana-portland`
- `/us/en/adventures/climbing-new-zealand`
- `/us/en/adventures/colorado-rock-climbing`
- `/us/en/adventures/cycling-southern-utah`
- `/us/en/adventures/cycling-tuscany`
- `/us/en/adventures/downhill-skiing-wyoming`
- `/us/en/adventures/gastronomic-marais-tour`
- `/us/en/adventures/napa-wine-tasting`
- `/us/en/adventures/riverside-camping-australia`
- `/us/en/adventures/ski-touring-mont-blanc`
- `/us/en/adventures/surf-camp-costa-rica`
- `/us/en/adventures/tahoe-skiing`
- `/us/en/adventures/west-coast-cycling`
- `/us/en/adventures/whistler-mountain-biking`
- `/us/en/adventures/yosemite-backpacking`

### adventures-2 — listing (1)
- `/us/en/adventures`

### faqs (1)
- `/us/en/faqs`

### about-us (2)
- `/us/en/about-us`
- `/us/en/magazine` (landing)

### magazine — article (5)
- `/us/en/magazine/arctic-surfing`
- `/us/en/magazine/guide-la-skateparks`
- `/us/en/magazine/san-diego-surf`
- `/us/en/magazine/ski-touring`
- `/us/en/magazine/western-australia`

---

## 5. Supporting infrastructure (in scope, out of the page count)

- **Navigation & footer:** `/nav`, `/footer` fragments (rendered by the `header`/`footer` blocks, matched to wknd.site).
- **Query index:** `/query-index.json` — generated via a `default` index definition (config service), 8 columns: `path, title, description, image, category, locale, activity, lastModified`.
- **Brand tokens:** `styles/brand.css` (Asar headings, Source Sans Pro body, `--brand-color #ffea00`).

---

## 6. Known open item

Documented separately in `docs/SUPPORT-render-issue.md`: the DA→EDS render pipeline intermittently emitted empty markdown for nested detail subtrees. As of 2026-09-11 all pages (including all 5 magazine articles and the adventure detail pages) render correctly on the live tier.

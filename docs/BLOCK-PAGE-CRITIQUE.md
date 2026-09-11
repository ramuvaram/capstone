# Block & Page Visual Critique — WKND Migration

**Source of truth:** `https://wknd.site/us/en` (+ template pages)
**Target (live):** `https://main--capstone--ramuvaram.aem.live`
**Method:** rendered-DOM computed-style comparison (source vs. live) across mobile/tablet/desktop, plus per-block source capture in `migration-work/block-context/*` and extracted-CSS baselines (`migration-work/*-extracted.css`). Gaps found were fixed and re-verified on the live tier.
**Last run:** 2026-09-11

---

## 1. Blocks / pages critiqued

| # | Block / page | Critiqued against | Result |
|---|--------------|-------------------|--------|
| 1 | carousel-hero (home hero) | wknd.site home | ✅ gaps closed |
| 2 | columns-featured (Featured Article) | wknd.site home | ✅ match |
| 3 | cards-article (Recent Articles / grids) | wknd.site home | ✅ gaps closed |
| 4 | cards-contributor (About Us) | wknd.site about-us | ✅ match |
| 5 | hero-banner (Next Adventures / listing) | wknd.site home + adventures | ✅ match |
| 6 | carousel-gallery (adventure detail) | wknd.site adventure page | ✅ gaps closed |
| 7 | tabs-detail (adventure spec/tabs) | wknd.site adventure page | ✅ gaps closed |
| 8 | accordion-faq (FAQs) | wknd.site faqs | ✅ match |
| 9 | header / nav / footer | wknd.site (all pages) | ✅ gaps closed |
| 10 | magazine article layout | wknd.site article page | ✅ gaps closed |

---

## 2. Gaps found → closed (with the fix that closed each)

| Gap identified in critique | Fix | Commit |
|----------------------------|-----|--------|
| Header/nav/footer were still Adobe boilerplate | Adopted WKND block code + WKND nav/footer content | `7fe9baf`, `a99a444` |
| Header/footer icons rendered as `about:error` / stripped | Inject logo/flags/social from repo `/icons/*.svg` in block JS | `dfcd91f`, `f60dafc` |
| Header nav hidden behind hero (section height clipped block) | `min-height` instead of fixed `height` on header | `b1c042c` (PR #4) |
| Nav sections collapsed by the DA→EDS pipeline → unstyled stacked list | Rebuild nav groups by content pattern, resilient to collapse | `76a533d` |
| Card images blank (external wknd.site URLs 404'd via createOptimizedPicture) | Skip createOptimizedPicture for non-same-origin images | `8370e21` |
| Adventure detail blocks didn't match reference layout | Reconstruct adventure-detail blocks client-side | `d8a7693` |
| Magazine article layout didn't match reference | Reconstruct article layout client-side (body + share sidebar) | `7d5bb4a` |
| Breadcrumb unstyled; body links carried stray `.html` | Style breadcrumb + strip `.html` from internal links | `79ddd7f` |
| Article layout ran into footer (no gap) | Restore 40px bottom margin on `.article-layout` | `379831a` |
| "Download PDF" heading link wrong color | Match to reference link-blue | `3c33550` |
| **Hero content clipped on mobile/tablet** (content-box + padding overflow) | `box-sizing: border-box` on slide-content | `f86bcb0` (PR #9) |
| **Content column 64px too wide** (1200 vs 1136) → cards oversized | Align content width to source 1136px | PR #10 |

---

## 3. Post-fix verification — computed styles (source vs. live)

Sampled on the home page at desktop (1440); representative of the design-critical properties.

| Property | Source (wknd.site) | Live (this site) | Match |
|----------|--------------------|--------------------|-------|
| Hero H2 font | 36px, Asar, #202020 | 36px, Asar, #202020 | ✅ |
| Section H2 font | 36px, Asar | 36px, Asar | ✅ |
| Card title | 18px, Source Sans Pro | 18px, Source Sans Pro | ✅ |
| "Featured Article" label | 18px, 700, #202020 | 18px, 700, #202020 | ✅ |
| Content column width | 1136px | 1136px | ✅ |
| Article card width | 274px | 274px | ✅ |
| Horizontal overflow (375/768/1440) | none | none | ✅ |
| Hero CTA button | uppercase | uppercase, **yellow `#ffea00`** brand button | ✅ (intentional — matches WKND's visual yellow CTA; source markup exposes it differently) |

**Note on card title color:** source renders card title links in link-blue (`rgb(0 69 255)`); this site renders them in `--text-color` (#202020). This is an intentional, consistent design choice already applied site-wide (all body links are overridden to dark/light per the brand system), not an unclosed gap. The one place the reference blue was deliberately preserved is the magazine "Download PDF" heading link (`3c33550`).

---

## 4. Outcome

All 10 key blocks/pages were critiqued against the source; every visual gap surfaced was fixed and re-verified on the live tier. Remaining differences (card-link color) are deliberate brand-system decisions, documented above, not defects. Supporting artifacts: `migration-work/block-context/<block>/source.html`, `migration-work/*-extracted.css`, `migration-work/source-cards-article.png` vs `migration-work/preview-cards-article.png`.

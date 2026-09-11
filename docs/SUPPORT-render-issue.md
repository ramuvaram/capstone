# Support Evidence: DA→EDS render pipeline emits empty markdown for nested detail subtrees

**Site:** `ramuvaram / capstone` (Document Authoring content source)
**Reported:** 2026-09-11
**Preview host:** `https://main--capstone--ramuvaram.aem.page`
**Live host:** `https://main--capstone--ramuvaram.aem.live`

## Summary

For pages in the **nested detail subtrees** `/us/en/adventures/*` and `/us/en/magazine/*`, the
DA→EDS render pipeline reports success (HTTP 200) but produces **0-byte markdown** (`.md`), so the
rendered page is empty (`.plain.html` = 13 bytes, `<div></div>`). The **DA source documents are
present and correct**, and **top-level pages in the same site render normally**. The same document
path structure renders correctly on another site, so it is not inherent to the path or the content.

## Symptom

| Path | `.md` (generated) | `.plain.html` (rendered) | DA source | Status |
|------|-------------------|--------------------------|-----------|--------|
| `/us/en` (home) | — | **16232 b** | ok | ✅ renders |
| `/us/en/magazine` (listing) | — | **9398 b** | ok | ✅ renders |
| `/us/en/adventures` (listing) | — | **39960 b** | ok | ✅ renders |
| `/us/en/faqs` | — | **4211 b** | ok | ✅ renders |
| `/us/en/about-us` | — | **7655 b** | ok | ✅ renders |
| `/us/en/magazine/arctic-surfing` | **0 b** | **13 b** | 8072 b | ❌ empty |
| `/us/en/adventures/tahoe-skiing` | **0 b** | **13 b** | 3282 b | ❌ empty |

Every page under the two nested detail subtrees (`/us/en/adventures/*` — 16 pages, `/us/en/magazine/*`
— 5 pages) exhibits the empty-render behavior. Top-level pages and the section landing/listing pages
render normally.

## The pipeline reports success but emits empty output

`POST https://admin.hlx.page/preview/ramuvaram/capstone/main/us/en/magazine/arctic-surfing` returns:

```
status: 200
contentType: text/plain; charset=utf-8
sourceLocation: markup:https://content.da.live/ramuvaram/capstone/us/en/magazine/arctic-surfing
contentBusId: helix-content-bus/483cdcfac49622e348ce4a66222301239bd3c306ecfdbe68153ecf8d828/preview/us/en/magazine/arctic-surfing.md
```

Fetching the generated markdown directly:

```
GET https://main--capstone--ramuvaram.aem.page/us/en/magazine/arctic-surfing.md
HTTP/2 200
content-length: 0
```

So the pipeline fetches the source markup and returns 200, but the markup→markdown conversion yields
**zero bytes**.

## What has been ruled out (reproduction steps performed)

1. **Not the content.** Uploading trivial `<div><p>Hello world</p></div>` to a path under
   `/us/en/adventures/` and previewing it also produced `.md` = 0 bytes. Content shape is irrelevant.
2. **Not the source.** DA Source API returns the correct, complete document for every affected page
   (e.g. `GET admin.da.live/source/ramuvaram/capstone/us/en/magazine/arctic-surfing.html` = 8072 bytes,
   valid markup with the article body).
3. **Not the path structure.** A reference site with the identical path
   (`https://main--capstone--smitha-git-repo-public.aem.live/us/en/adventures/bali-surf-camp.plain.html`)
   renders correctly (4168 bytes). `/us/en/adventures` existing as both a page and a folder is not the
   cause.
4. **Not caching / propagation.** Persisted across: waiting (>10 min), re-uploading the source
   (new mtime), re-previewing, full delete + re-create of the resource (DELETE preview + DELETE live +
   re-POST source + re-preview), and page-URL cache-busting. All still yield `.md` = 0 bytes.
5. **Not a global outage.** Top-level pages (home, section listings) render fine at the same time,
   and were re-verified during each check — the pipeline is healthy for non-nested paths.

## Request

Please force a **reconvert / reindex** of the content-bus for the `/us/en/adventures/` and
`/us/en/magazine/` subtrees on `ramuvaram/capstone` (contentBusId
`helix-content-bus/483cdcfac49622e348ce4a66222301239bd3c306ecfdbe68153ecf8d828`), or advise why the
markup→markdown conversion returns 0 bytes for these nested paths while the source is present and
sibling/parent paths convert normally.

## Affected URLs (21)

Adventures (`/us/en/adventures/`): bali-surf-camp, beervana-portland, climbing-new-zealand,
colorado-rock-climbing, cycling-southern-utah, cycling-tuscany, downhill-skiing-wyoming,
gastronomic-marais-tour, napa-wine-tasting, riverside-camping-australia, ski-touring-mont-blanc,
surf-camp-costa-rica, tahoe-skiing, west-coast-cycling, whistler-mountain-biking, yosemite-backpacking

Magazine (`/us/en/magazine/`): arctic-surfing, guide-la-skateparks, san-diego-surf, ski-touring,
western-australia

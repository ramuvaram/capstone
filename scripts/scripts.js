import {
  loadHeader,
  loadFooter,
  decorateIcons,
  decorateSections,
  decorateBlocks,
  decorateTemplateAndTheme,
  waitForFirstImage,
  loadSection,
  loadSections,
  loadCSS,
  buildBlock,
  readBlockConfig,
  toClassName,
} from './aem.js';

/**
 * Applies "Section Metadata" blocks to their parent section as classes / data
 * attributes, then removes the block. The vendored aem.js decorateSections does
 * not handle this, so we do it here after sections are decorated.
 * @param {Element} main The main element
 */
function decorateSectionMetadata(main) {
  main.querySelectorAll('.section .section-metadata').forEach((sectionMeta) => {
    const section = sectionMeta.closest('.section');
    if (!section) return;
    const meta = readBlockConfig(sectionMeta);
    Object.keys(meta).forEach((key) => {
      if (key === 'style') {
        const styles = meta.style
          .split(',')
          .map((style) => toClassName(style.trim()))
          .filter((style) => style);
        styles.forEach((style) => section.classList.add(style));
      } else {
        section.dataset[toClassName(key)] = meta[key];
      }
    });
    sectionMeta.parentNode.remove();
  });
}

if (window.trustedTypes && window.trustedTypes.createPolicy) {
  const innerTT = window.trustedTypes.createPolicy('tt-inner', {
    createHTML: (s) => s, // avoid stack overflow
  });

  window.trustedTypes.createPolicy('default', {
    createHTML: (input, type, sink) => {
      let processedInput = input;
      if (/srcdoc\s*=/i.test(processedInput)) {
        const doc = new DOMParser().parseFromString(innerTT.createHTML(processedInput), 'text/html');
        doc.querySelectorAll('iframe[srcdoc]').forEach((el) => el.removeAttribute('srcdoc'));
        processedInput = doc.body.innerHTML;
      }
      if (sink.includes('createContextualFragment') || sink.includes('Document write')) {
        const doc = new DOMParser().parseFromString(innerTT.createHTML(processedInput), 'text/html');
        doc.querySelectorAll('script').forEach((el) => el.remove());
        processedInput = doc.body.innerHTML;
      }
      return processedInput;
    },
    createScriptURL: (input) => input,
    createScript: (input) => input,
  });
}

/**
 * load fonts.css and set a session storage flag
 */
async function loadFonts() {
  await loadCSS(`${window.hlx.codeBasePath}/styles/fonts.css`);
  try {
    if (!window.location.hostname.includes('localhost')) sessionStorage.setItem('fonts-loaded', 'true');
  } catch (e) {
    // do nothing
  }
}

/**
 * Turns `/widgets/...` links into widget blocks.
 * @param {Element} main The container element
 */
function buildWidgetAutoBlocks(main) {
  const widgetLinks = [...main.querySelectorAll('a[href*="/widgets/"]')];
  widgetLinks.forEach((link) => {
    if (link.closest('.widget')) return;
    const newLink = link.cloneNode(true);
    const widgetBlock = buildBlock('widget', { elems: [newLink] });
    const p = link.closest('p');
    if (
      p
      && p.querySelectorAll('a').length === 1
      && p.querySelector('a') === link
      && p.textContent.trim() === link.textContent.trim()
    ) {
      p.replaceWith(widgetBlock);
    } else {
      link.replaceWith(widgetBlock);
    }
  });
}

/**
 * Builds all synthetic blocks in a container element.
 * @param {Element} main The container element
 */
function buildAutoBlocks(main) {
  try {
    // auto load `*/fragments/*` references
    const fragments = [...main.querySelectorAll('a[href*="/fragments/"]')].filter((f) => !f.closest('.fragment'));
    if (fragments.length > 0) {
      // eslint-disable-next-line import/no-cycle
      import('../blocks/fragment/fragment.js').then(({ loadFragment }) => {
        fragments.forEach(async (fragment) => {
          try {
            const { pathname } = new URL(fragment.href);
            const frag = await loadFragment(pathname);
            fragment.parentElement.replaceWith(...frag.children);
          } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Fragment loading failed', error);
          }
        });
      });
    }
    buildWidgetAutoBlocks(main);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Auto Blocking failed', error);
  }
}

/**
 * Decorates formatted links to style them as buttons.
 * @param {HTMLElement} main The main container element
 */
function decorateButtons(main) {
  main.querySelectorAll('p a[href]').forEach((a) => {
    a.title = a.title || a.textContent;
    const p = a.closest('p');
    const text = a.textContent.trim();

    // quick structural checks
    if (a.querySelector('img') || p.textContent.trim() !== text) return;

    // skip URL display links
    try {
      if (new URL(a.href).href === new URL(text, window.location).href) return;
    } catch { /* continue */ }

    // require authored formatting for buttonization
    const strong = a.closest('strong');
    const em = a.closest('em');
    if (!strong && !em) {
      // No authored bold/italic. WKND authors standalone CTAs (e.g. "Download
      // PDF") as plain links that still render as yellow buttons. Buttonize
      // an isolated lone-link paragraph in default content only — skip
      // block-scoped CTAs (blocks style their own) and grouped lone-link
      // paragraphs (e.g. the byline's stacked Facebook/Twitter/Instagram
      // links, which decorateArticleByline turns into icons instead).
      const inDefault = p.closest('.default-content-wrapper');
      const isLoneLinkP = (el) => el && el.tagName === 'P'
        && el.children.length === 1 && el.firstElementChild.tagName === 'A'
        && el.textContent.trim() === el.firstElementChild.textContent.trim();
      const grouped = isLoneLinkP(p.previousElementSibling) || isLoneLinkP(p.nextElementSibling);
      if (inDefault && !grouped) {
        p.className = 'button-wrapper';
        a.className = 'button cta';
      }
      return;
    }

    p.className = 'button-wrapper';
    a.className = 'button';
    if (strong && em) { // high-impact call-to-action
      a.classList.add('accent');
      const outer = strong.contains(em) ? strong : em;
      outer.replaceWith(a);
    } else if (strong) {
      a.classList.add('primary');
      strong.replaceWith(a);
    } else {
      a.classList.add('secondary');
      em.replaceWith(a);
    }
  });
}

/**
 * Some authored/migrated content (e.g. content scraped straight from the
 * legacy site) keeps internal links with a .html extension, which 404 on EDS
 * (it serves extensionless URLs). Strip .html from same-site paths; leave
 * external links and in-page anchors untouched. Mirrors the same fix already
 * applied to the nav fragment in blocks/header/header.js.
 * @param {Element} main The main element
 */
function stripHtmlExtensions(main) {
  main.querySelectorAll('a[href]').forEach((a) => {
    const href = a.getAttribute('href');
    if (href && href.startsWith('/') && href.endsWith('.html')) {
      a.setAttribute('href', href.replace(/\.html$/, ''));
    }
  });
}

// WKND adventure detail pages (e.g. /us/en/adventures/bali-surf-camp) are
// authored from a fixed content-fragment model: a spec list (Activity/
// Adventure Type/Trip Length/Group Size/Difficulty/Price) and three tabs
// (Overview/Itinerary/What to Bring). On at least one page that content
// reached the browser as flat prose instead of block markup (no
// carousel-gallery/columns-details/tabs-content divs at all — compare
// this page's .plain.html against the same page on the reference
// implementation). rebuildAdventureDetail() below reconstructs the blocks
// client-side so the page still renders like the reference site; it's a
// no-op (and cheap to check) on any page that isn't in this broken shape,
// including this same page once/if the authored content is repaired.
const ADVENTURE_STAT_LABELS = ['Activity', 'Adventure Type', 'Trip Length', 'Group Size', 'Difficulty', 'Price'];
const ADVENTURE_TAB_LABELS = ['Overview', 'Itinerary', 'What to Bring'];

// Both the adventure-detail and magazine-article flattened pages leak the
// page's own Title/Description content-fragment fields into the body as
// trailing Label/Value <p> pairs — shared across both reconstructions below.
const LEAKED_METADATA_LABELS = ['Title', 'Description'];

/**
 * Find the adventure spec <ul> — every <li> is exactly a Label/Value <p> pair
 * whose label is one of the known content-fragment field names.
 * @param {Element} main
 * @returns {Element|undefined}
 */
function findAdventureStatsList(main) {
  return [...main.querySelectorAll('ul')].find((ul) => {
    const items = [...ul.children].filter((c) => c.tagName === 'LI');
    return items.length > 0 && items.every((li) => {
      const ps = li.querySelectorAll(':scope > p');
      return ps.length === 2 && ADVENTURE_STAT_LABELS.includes(ps[0].textContent.trim());
    });
  });
}

/**
 * Convert the flat spec <ul> into a columns-details block (one row per
 * label/value pair) so blocks/columns-details can style it.
 * @param {Element} ul
 */
function buildColumnsDetails(ul) {
  const block = document.createElement('div');
  block.className = 'columns-details';
  [...ul.children].forEach((li) => {
    const row = document.createElement('div');
    li.querySelectorAll(':scope > p').forEach((p) => {
      const cell = document.createElement('div');
      cell.append(p); // moves the <p>, no need to clone
      row.append(cell);
    });
    block.append(row);
  });
  ul.replaceWith(block);
}

/**
 * Wrap the lead image (the <p><picture> immediately before the H1) as a
 * single-slide carousel-gallery block, matching how the reference site
 * authors the hero image.
 * @param {Element} h1
 */
function buildCarouselGallery(h1) {
  if (!h1) return;
  let node = h1.previousElementSibling;
  let heroP;
  while (node) {
    if (node.tagName === 'P' && node.querySelector(':scope > picture')) {
      heroP = node;
      break;
    }
    node = node.previousElementSibling;
  }
  if (!heroP) return;

  const block = document.createElement('div');
  block.className = 'carousel-gallery';
  const row = document.createElement('div');
  const imageCol = document.createElement('div');
  imageCol.append(heroP.querySelector('picture'));
  row.append(imageCol, document.createElement('div'));
  block.append(row);
  heroP.replaceWith(block);
}

/**
 * The migrated content repeats the page title as an <h3> (hidden by
 * blocks/tabs-content/tabs-content.css inside each tab panel in the reference
 * source); here it instead landed as a stray heading outside any panel.
 * Since it's decorative-only and always hidden, just drop it.
 * @param {Element} main
 * @param {Element} h1
 */
function removeDuplicateTitleHeading(main, h1) {
  if (!h1) return;
  const h1Text = h1.textContent.trim();
  main.querySelectorAll('h3').forEach((h3) => {
    if (h3.textContent.trim() === h1Text) h3.remove();
  });
}

/**
 * Group the Overview/Itinerary/What to Bring marker paragraphs and the
 * content following each of them into a tabs-content block.
 * @param {Element} container The flat content's direct parent
 */
function buildTabsContent(container) {
  const isMetadataMarker = (el) => el.tagName === 'P'
    && LEAKED_METADATA_LABELS.includes(el.textContent.trim());

  const markers = [...container.children].filter(
    (el) => el.tagName === 'P' && ADVENTURE_TAB_LABELS.includes(el.textContent.trim()),
  );
  if (!markers.length) return;

  const block = document.createElement('div');
  block.className = 'tabs-content';

  markers.forEach((marker) => {
    const row = document.createElement('div');
    const labelCell = document.createElement('div');
    labelCell.append(marker.cloneNode(true));
    const contentCell = document.createElement('div');

    let node = marker.nextElementSibling;
    while (node && !markers.includes(node) && !isMetadataMarker(node)) {
      const next = node.nextElementSibling;
      contentCell.append(node);
      node = next;
    }
    row.append(labelCell, contentCell);
    block.append(row);
  });

  markers[0].replaceWith(block);
  markers.slice(1).forEach((m) => m.remove());
}

/**
 * Drop the leaked Title/Description content-fragment fields (see
 * LEAKED_METADATA_LABELS) — they duplicate copy already on the page and the
 * reference site doesn't render them either.
 * @param {Element} container
 */
function removeLeakedMetadata(container) {
  [...container.children]
    .filter((el) => el.tagName === 'P' && LEAKED_METADATA_LABELS.includes(el.textContent.trim()))
    .forEach((marker) => {
      const value = marker.nextElementSibling;
      marker.remove();
      if (value) value.remove();
    });
}

/**
 * Entry point: detect the flattened adventure-detail shape and rebuild the
 * carousel-gallery/columns-details/tabs-content blocks from it.
 * @param {Element} main The main element
 */
function rebuildAdventureDetail(main) {
  const statsList = findAdventureStatsList(main);
  if (!statsList) return; // already block-structured (or not an adventure page)

  const container = statsList.parentElement;
  const h1 = container.querySelector('h1') || main.querySelector('h1');

  removeDuplicateTitleHeading(container, h1);
  buildCarouselGallery(h1);
  buildColumnsDetails(statsList);
  buildTabsContent(container);
  removeLeakedMetadata(container);
}

// WKND magazine articles (e.g. /us/en/magazine/guide-la-skateparks) follow the
// same fixed content model as the reference site: lead image, breadcrumb,
// H1 + "By <author>" byline + body copy, an author bio (avatar + name/role +
// social links), and a "Share This Story" sidebar (PDF download + related
// articles). On at least this one page that content reached the browser
// flattened into a single section instead of split into the reference site's
// five (compare this page's .plain.html against the reference). The
// functions below reconstruct the same section split and layout client-side;
// they're a no-op on any page that isn't in this exact flattened shape.
const MAGAZINE_ARTICLE_PATH_RE = /\/magazine\/[^/]+/;

/**
 * @param {Element} main
 * @returns {boolean} true if `main` looks like an unsectioned magazine article
 */
function isFlatMagazineArticle(main) {
  if (main.children.length !== 1) return false; // already sectioned
  if (!MAGAZINE_ARTICLE_PATH_RE.test(window.location.pathname)) return false;
  const container = main.firstElementChild;
  const h1 = container.querySelector(':scope > h1');
  const byline = container.querySelector(':scope > h4');
  return !!(h1 && byline && /^by\s+/i.test(byline.textContent.trim()));
}

/**
 * Move `elements` (already removed from their old parent isn't required —
 * append() relocates them) into a new section appended to `main`. Sections
 * are built in document order, so appending each in turn preserves layout
 * order.
 * @param {Element} main
 * @param {Element[]} elements
 * @returns {Element|null} the new section, or null if `elements` was empty
 */
function makeSection(main, elements) {
  if (!elements.length) return null;
  const section = document.createElement('div');
  elements.forEach((el) => section.append(el));
  main.append(section);
  return section;
}

/**
 * Split the flattened article into the reference site's five sections: lead
 * image, breadcrumb, article body, author byline, share/download sidebar —
 * so decorateSections/decorateBlocks process them exactly as if the backend
 * had sent them this way, and tag the byline/share sections for
 * decorateMagazineLayout() (deferred until after loadSections).
 * @param {Element} main The main element
 */
function rebuildMagazineArticle(main) {
  if (!isFlatMagazineArticle(main)) return;
  const container = main.firstElementChild;
  const h1 = container.querySelector(':scope > h1');

  removeDuplicateTitleHeading(container, h1);
  removeLeakedMetadata(container);

  const ol = container.querySelector(':scope > ol');
  const beforeCrumb = ol
    ? [...container.children].slice(0, [...container.children].indexOf(ol))
    : [];
  makeSection(main, beforeCrumb); // lead image (and anything else before the breadcrumb)
  makeSection(main, ol ? [ol] : []); // breadcrumb

  // Byline section starts at a <p> containing only a <picture>, immediately
  // followed by an <h2> (the author name) — the avatar + name/role pattern.
  const bylineImg = [...container.children].find((el) => el.tagName === 'P'
    && el.children.length === 1 && el.firstElementChild.tagName === 'PICTURE'
    && el.nextElementSibling?.tagName === 'H2');
  // Share section starts at the first remaining <h5> ("Share This Story").
  const shareHeading = container.querySelector(':scope > h5');

  const remaining = [...container.children];
  const bylineIdx = bylineImg ? remaining.indexOf(bylineImg) : -1;
  const shareIdx = shareHeading ? remaining.indexOf(shareHeading) : remaining.length;
  const articleEnd = bylineIdx === -1 ? shareIdx : bylineIdx;

  makeSection(main, remaining.slice(0, articleEnd)); // article body
  const bylineSection = makeSection(main, remaining.slice(articleEnd, shareIdx));
  const shareSection = makeSection(main, remaining.slice(shareIdx));

  if (bylineSection) bylineSection.dataset.magazineByline = 'true';
  if (shareSection) shareSection.dataset.magazineShare = 'true';

  container.remove(); // now empty; the sections above replace it
}

// Trailing publication date embedded in a share-list link, e.g.
// "San Diego Surf Spots Thursday, 9 Jul 2020".
const SHARE_DATE_RE = /\s+((?:Sun|Mon|Tues|Wednes|Thurs|Fri|Satur)day,\s+\d{1,2}\s+\w+\s+\d{4})$/;

/**
 * Style the "Share This Story" sidebar's related-article list to match the
 * source: each item is the article title with its publication date on a
 * separate, muted line below (the content packs both into one link's text).
 * @param {Element} shareSection
 */
function decorateShareStory(shareSection) {
  const wrap = shareSection.querySelector('.default-content-wrapper') || shareSection;
  wrap.classList.add('share-story');
  wrap.querySelectorAll('li > a[href]').forEach((a) => {
    const m = a.textContent.match(SHARE_DATE_RE);
    if (!m) return;
    const [, dateText] = m;
    a.textContent = a.textContent.slice(0, m.index).trim();
    const date = document.createElement('span');
    date.className = 'share-story-date';
    date.textContent = dateText;
    a.after(date);
  });
}

// Brand-logo SVGs for the byline social links (drawn via currentColor so CSS
// controls the colour).
/* eslint-disable max-len */
const SOCIAL_ICONS = {
  facebook: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.14 8.44 9.94v-7.03H7.9v-2.9h2.54V9.85c0-2.51 1.49-3.9 3.78-3.9 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.87h2.78l-.44 2.9h-2.34V22c4.78-.8 8.44-4.94 8.44-9.94Z"/></svg>',
  twitter: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M22 5.9c-.7.32-1.5.53-2.3.63.83-.5 1.46-1.28 1.76-2.22-.78.46-1.63.8-2.55.98A4.02 4.02 0 0 0 12 8.98c0 .31.04.62.1.9A11.4 11.4 0 0 1 3.9 4.6a4.02 4.02 0 0 0 1.24 5.37c-.65-.02-1.26-.2-1.8-.5v.05c0 1.95 1.4 3.58 3.24 3.95-.34.1-.7.14-1.06.14-.26 0-.51-.02-.76-.07a4.03 4.03 0 0 0 3.76 2.8A8.08 8.08 0 0 1 2 18.06 11.38 11.38 0 0 0 8.17 19.9c7.4 0 11.46-6.14 11.46-11.46l-.01-.52A8.2 8.2 0 0 0 22 5.9Z"/></svg>',
  instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4.5"/><circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none"/></svg>',
};
/* eslint-enable max-len */

/**
 * Lay out the author byline: the avatar picture and name/role sit on the
 * left, and the Facebook/Twitter/Instagram links become a single row of
 * brand-logo icons in a dark box on the right (rather than a vertical stack
 * of text links).
 * @param {Element} bylineSection
 */
function decorateArticleByline(bylineSection) {
  const wrap = bylineSection.querySelector('.default-content-wrapper') || bylineSection;
  wrap.classList.add('article-byline');

  const socialParas = [...wrap.querySelectorAll(':scope > p')].filter((p) => {
    const a = p.querySelector(':scope > a[href]');
    return a && p.children.length === 1 && p.textContent.trim() === a.textContent.trim();
  });
  if (socialParas.length >= 2) {
    const social = document.createElement('div');
    social.className = 'article-byline-social';
    socialParas[0].before(social);
    socialParas.forEach((p) => {
      const a = p.querySelector('a[href]');
      const label = a.textContent.trim();
      a.setAttribute('aria-label', label);
      const icon = SOCIAL_ICONS[label.toLowerCase()];
      if (icon) a.innerHTML = icon; // replace text with the brand glyph
      social.append(a);
      p.remove();
    });
  }

  // Group the name (h2) and role line(s) into one text block so they stack
  // vertically beside the avatar (name above role).
  const name = wrap.querySelector(':scope > h2');
  if (name) {
    const text = document.createElement('div');
    text.className = 'article-byline-text';
    name.before(text);
    const stop = wrap.querySelector('.article-byline-social');
    let node = text.nextElementSibling;
    while (node && node !== stop) {
      const next = node.nextElementSibling;
      if (node.tagName === 'H2' || node.tagName === 'P') text.append(node);
      node = next;
    }
  }
}

/**
 * Regroup the (by now decorated) magazine-article sections built by
 * rebuildMagazineArticle() into a two-column layout — article body on the
 * left, "Share This Story" sidebar on the right — matching the reference
 * site. Deferred until after loadSections so blocks/sections decorate
 * normally first; a no-op if rebuildMagazineArticle() didn't run.
 * @param {Element} main The main element
 */
function decorateMagazineLayout(main) {
  const shareSection = main.querySelector('[data-magazine-share]');
  if (!shareSection || shareSection.closest('.article-layout')) return;
  const bylineSection = main.querySelector('[data-magazine-byline]');

  const sections = [...main.querySelectorAll(':scope > .section')];
  const shareIdx = sections.indexOf(shareSection);
  // article column = everything between the lead image/breadcrumb (the first
  // up-to-2 sections) and the share section.
  const start = Math.min(2, shareIdx);
  const columnSections = sections.slice(start, shareIdx);
  if (!columnSections.length) return;

  const grid = document.createElement('div');
  grid.className = 'article-layout';
  const articleColumn = document.createElement('div');
  articleColumn.className = 'article-column';

  columnSections[0].before(grid);
  columnSections.forEach((s) => articleColumn.append(s));
  grid.append(articleColumn, shareSection);

  decorateShareStory(shareSection);
  if (bylineSection) decorateArticleByline(bylineSection);
}

/**
 * Detect the leading breadcrumb list (a short <ol> near the top of the page
 * whose items are links plus a trailing current-page label) and tag it so CSS
 * can render it as a proper horizontal breadcrumb instead of a numbered list.
 * @param {Element} main The main element
 */
function decorateBreadcrumb(main) {
  const sections = [...main.children];
  main.querySelectorAll('ol').forEach((ol) => {
    if (ol.classList.contains('breadcrumb')) return;
    const items = [...ol.children];
    // Breadcrumb heuristic: a short list (2–5 items) whose first item is a link,
    // sitting in one of the first two top-level sections (not a mid-article
    // ordered list).
    const section = ol.closest('main > div');
    const isEarly = section && sections.indexOf(section) <= 1;
    const looksLikeCrumb = items.length >= 2 && items.length <= 5
      && items[0].querySelector('a');
    if (isEarly && looksLikeCrumb) ol.classList.add('breadcrumb');
  });
}

/**
 * Infer an article category ("magazine" | "adventures") from the links inside
 * a static listing block, so the dynamic index query can be pointed at the
 * same collection the authored cards came from.
 * @param {Element} el
 * @returns {string}
 */
function inferCategory(el) {
  const counts = { magazine: 0, adventures: 0 };
  el.querySelectorAll('a[href]').forEach((a) => {
    const m = a.getAttribute('href').match(/\/(magazine|adventures)\//);
    if (m) counts[m[1]] += 1;
  });
  if (counts.magazine === 0 && counts.adventures === 0) return '';
  return counts.adventures > counts.magazine ? 'adventures' : 'magazine';
}

/**
 * Tag the site's static `.cards-article` grids (homepage teasers, magazine
 * "All Articles") so they can be enhanced from `query-index.json` later (see
 * enhanceDynamicListings). This only records intent via data attributes — it
 * never alters or removes the authored markup, so the static, fully-styled
 * cards keep working as the fallback if the index is unavailable (e.g. not
 * yet configured for this site — see scripts/articles.js) or JS fails.
 *
 * The curated single-teaser spotlight (`.columns-featured` "Featured
 * Article") is left as authored — it's an editorial pick, not "newest
 * article" — but its linked article is recorded so the dynamic grid in the
 * same category can exclude it (avoiding a duplicate, as in the authored
 * design). The category is inferred from the existing links, and results are
 * scoped to the current page's locale.
 * @param {Element} main
 */
function decorateDynamicListings(main) {
  const path = window.location.pathname.replace(/\.html$/, '').replace(/\/$/, '');
  const parts = path.split('/').filter(Boolean);
  const locale = parts.length >= 2 ? `${parts[0]}/${parts[1]}` : '';
  // Dedicated listing pages (…/magazine, …/adventures) show the whole
  // collection; teaser grids elsewhere (e.g. the homepage) keep the authored
  // card count as a limit so they stay compact.
  const isListingPage = /\/(magazine|adventures)$/.test(path);

  const spotlightPaths = {};
  main.querySelectorAll('.columns-featured').forEach((spot) => {
    const category = inferCategory(spot);
    const href = spot.querySelector(`a[href*="/${category}/"]`)?.getAttribute('href');
    if (category && href) {
      spotlightPaths[category] = href.replace(/\.html?$/, '').replace(/\/$/, '');
    }
  });

  main.querySelectorAll('.cards-article').forEach((grid) => {
    const category = inferCategory(grid);
    if (!category) return;
    grid.dataset.dynamicCategory = category;
    if (locale) grid.dataset.dynamicLocale = locale;
    const authoredCount = grid.querySelectorAll(':scope > div').length;
    if (!isListingPage && authoredCount) grid.dataset.dynamicLimit = String(authoredCount);
    if (!isListingPage && spotlightPaths[category]) {
      grid.dataset.dynamicExclude = spotlightPaths[category];
    }
  });
}

/**
 * Enhance the tagged `.cards-article` grids from the query index, in place,
 * after the static blocks have already decorated. Runs below the fold
 * (loadLazy) so the hero/LCP render is never gated on the index fetch. If the
 * index is empty/unavailable (e.g. not yet configured for this site), every
 * grid is left exactly as authored — the static cards remain the fallback and
 * nothing is emptied.
 * @param {Element} main
 */
async function enhanceDynamicListings(main) {
  const grids = [...main.querySelectorAll('[data-dynamic-category]')];
  if (!grids.length) return;

  const { fetchArticles, selectArticles, buildArticleCardItem } = await import('./articles.js');
  const { createOptimizedPicture } = await import('./aem.js');
  const articles = await fetchArticles();
  if (!articles.length) return; // no index yet — keep the authored fallback

  // Eager images: these grids are primary page content, and matching the
  // authored layout matters more than deferring below-fold decode.
  const makePicture = (src, alt) => createOptimizedPicture(src, alt, true, [{ width: '750' }]);

  grids.forEach((grid) => {
    const { dynamicCategory: category, dynamicLocale: locale = '' } = grid.dataset;
    const limit = parseInt(grid.dataset.dynamicLimit, 10);
    const exclude = grid.dataset.dynamicExclude;
    const selected = selectArticles(articles, {
      category, locale, exclude, limit: Number.isNaN(limit) ? Infinity : limit,
    });
    if (!selected.length) return; // nothing indexed for this scope — keep static

    const ul = document.createElement('ul');
    selected.forEach((a) => ul.append(buildArticleCardItem(a, makePicture)));
    grid.textContent = '';
    grid.append(ul);
  });
}

/**
 * Decorates the main element.
 * @param {Element} main The main element
 */
// eslint-disable-next-line import/prefer-default-export
export function decorateMain(main) {
  decorateIcons(main);
  buildAutoBlocks(main);
  rebuildAdventureDetail(main);
  rebuildMagazineArticle(main);
  decorateDynamicListings(main);
  decorateSections(main);
  decorateSectionMetadata(main);
  decorateBlocks(main);
  decorateButtons(main);
  decorateBreadcrumb(main);
  stripHtmlExtensions(main);
}

/**
 * Loads everything needed to get to LCP.
 * @param {Element} doc The container element
 */
async function loadEager(doc) {
  document.documentElement.lang = 'en';
  decorateTemplateAndTheme();
  const main = doc.querySelector('main');
  if (main) {
    decorateMain(main);
    document.body.classList.add('appear');
    await loadSection(main.querySelector('.section'), waitForFirstImage);
  }

  try {
    /* if desktop (proxy for fast connection) or fonts already loaded, load fonts.css */
    if (window.innerWidth >= 900 || sessionStorage.getItem('fonts-loaded')) {
      loadFonts();
    }
  } catch (e) {
    // do nothing
  }
}

/**
 * Regroup the (by now decorated) adventure-detail blocks built by
 * rebuildAdventureDetail() into a two-column layout — spec/share sidebar on
 * the left, tabs on the right — matching the reference site. Deferred until
 * after loadSections so the blocks decorate normally in their original
 * sections first; a no-op if rebuildAdventureDetail() didn't run.
 * @param {Element} main The main element
 */
function decorateAdventureLayout(main) {
  const detailsBlock = main.querySelector('.columns-details');
  const tabsBlock = main.querySelector('.tabs-content');
  if (!detailsBlock || !tabsBlock || detailsBlock.closest('.adventure-layout')) return;

  const detailsWrap = detailsBlock.parentElement;
  const tabsWrap = tabsBlock.parentElement;
  const shareHeading = [...main.querySelectorAll('h5')]
    .find((h) => /share this/i.test(h.textContent || ''));
  const shareWrap = shareHeading?.parentElement;

  const grid = document.createElement('div');
  grid.className = 'adventure-layout';
  const left = document.createElement('div');
  left.className = 'adventure-details-col';
  const right = document.createElement('div');
  right.className = 'adventure-main-col';

  detailsWrap.before(grid);
  left.append(detailsBlock);
  if (shareHeading) left.append(shareHeading);
  right.append(tabsBlock);
  grid.append(left, right);

  // the wrapper divs decorateSections created for these are now empty
  [detailsWrap, tabsWrap, shareWrap].forEach((wrap) => {
    if (wrap && !wrap.children.length) wrap.remove();
  });
}

/**
 * Loads everything that doesn't need to be delayed.
 * @param {Element} doc The container element
 */
async function loadLazy(doc) {
  loadHeader(doc.querySelector('body > header'));

  const main = doc.querySelector('main');
  await loadSections(main);
  decorateAdventureLayout(main);
  decorateMagazineLayout(main);
  enhanceDynamicListings(main);

  const { hash } = window.location;
  const element = hash ? doc.getElementById(hash.substring(1)) : false;
  if (hash && element) element.scrollIntoView();

  loadFooter(doc.querySelector('body > footer'));

  loadCSS(`${window.hlx.codeBasePath}/styles/lazy-styles.css`);
  loadFonts();
}

/**
 * Loads everything that happens a lot later,
 * without impacting the user experience.
 */
function loadDelayed() {
  import('./consent-check.js');
  // load anything that can be postponed to the latest here
}

async function loadPage() {
  await loadEager(document);
  await loadLazy(document);
  loadDelayed();
}

loadPage();

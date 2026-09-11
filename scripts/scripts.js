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
    if (!strong && !em) return;

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
const ADVENTURE_METADATA_LABELS = ['Title', 'Description'];

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
    && ADVENTURE_METADATA_LABELS.includes(el.textContent.trim());

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
 * The migrated content leaves the page's own Title/Description
 * content-fragment fields in the body (as trailing Label/Value <p> pairs) —
 * they duplicate the H1/Overview copy already on the page and the reference
 * site doesn't render them either, so drop them.
 * @param {Element} container
 */
function removeLeakedMetadata(container) {
  [...container.children]
    .filter((el) => el.tagName === 'P' && ADVENTURE_METADATA_LABELS.includes(el.textContent.trim()))
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
 * Decorates the main element.
 * @param {Element} main The main element
 */
// eslint-disable-next-line import/prefer-default-export
export function decorateMain(main) {
  decorateIcons(main);
  buildAutoBlocks(main);
  rebuildAdventureDetail(main);
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

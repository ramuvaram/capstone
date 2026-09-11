/**
 * Shared helpers for the dynamic article listings.
 *
 * Edge Delivery Services can serve a `query-index.json` built by an indexer
 * configured for the site (see https://www.aem.live/docs/indexing) — this repo
 * doesn't have one configured yet, so every function here degrades to a no-op
 * (empty index) rather than breaking the page; the static, authored cards
 * remain the fallback. Once an index is available, the dynamic listings in
 * scripts.js will start enhancing automatically with no further code changes.
 */

const INDEX_PATH = '/query-index.json';
let indexPromise;

// Content sections treated as indexable article collections — mirrors the
// site's own URL structure (/<locale>/<category>/<slug>), not any index
// property. A basic index configured through the Index Admin Tool only has
// what it can pull from meta tags (title/description/image/etc.) — there's
// no `category`/`locale` meta tag authored on any page — so those two fields
// are derived from each row's `path` here instead, the same way the static
// (authored) listings are already categorized via inferCategory() in
// scripts.js. This means the dynamic listings work with the plainest
// possible index config; no extra metadata authoring required.
const CATEGORIES = ['magazine', 'adventures'];

/**
 * Fill in `category`/`locale` from `path` when the index doesn't supply them.
 * The index also includes the category *listing* pages themselves
 * (…/magazine, …/adventures — indexed like any other published page, with
 * category left blank on the raw row). A path's category segment only
 * counts if something follows it (…/magazine/<slug>) — otherwise it's the
 * listing page, not an article, and must stay uncategorized so it doesn't
 * get pulled into its own dynamic grid as a fake "article" card.
 */
function deriveCategoryAndLocale(article) {
  if (article.category && article.locale) return article;
  const segments = article.path.split('/').filter(Boolean);
  const catIdx = segments.findIndex((s) => CATEGORIES.includes(s));
  const isArticlePath = catIdx >= 0 && catIdx < segments.length - 1;
  const category = article.category || (isArticlePath ? segments[catIdx] : '');
  const locale = article.locale || (catIdx > 0 ? segments.slice(0, catIdx).join('/') : '');
  return { ...article, category, locale };
}

/**
 * Indexing reflects whatever is currently *published* — a page whose content
 * was fixed on preview but never republished still indexes with a blank
 * title/description and `image` falling back to a sitewide placeholder that
 * doesn't itself exist as a file (a 404, which then trips Lighthouse's
 * errors-in-console audit once a grid tries to render it). Treat a blank
 * title as "not really indexed yet" and skip the row entirely, rather than
 * rendering an empty card or requesting a broken image — the static
 * (authored) cards remain the fallback for anything excluded this way.
 * @param {object} article an index row
 * @returns {boolean}
 */
function isPublished(article) {
  return !!(article.title && article.title.trim());
}

/** Fetch and cache the query index for the lifetime of the page. */
export async function fetchArticles() {
  if (!indexPromise) {
    indexPromise = fetch(INDEX_PATH)
      .then((resp) => (resp.ok ? resp.json() : { data: [] }))
      .then((json) => (json.data || []).map(deriveCategoryAndLocale).filter(isPublished))
      .catch(() => []);
  }
  return indexPromise;
}

/** The current page path, normalised the same way index paths are stored. */
export function currentPath() {
  return window.location.pathname.replace(/\.html$/, '').replace(/\/$/, '');
}

/**
 * The locale prefix (lang/country, e.g. "us/en") of the current page, or ''
 * at the site root. Works for the locale home ("/us/en") and any deeper page
 * ("/us/en/magazine/…") since the locale is always the first two segments.
 */
export function currentLocale() {
  const segments = currentPath().split('/').filter(Boolean);
  return segments.length >= 2 ? `${segments[0]}/${segments[1]}` : '';
}

/**
 * Filter, offset and limit the index.
 * @param {Array} articles the raw index rows
 * @param {object} opts { category, locale, offset, limit, exclude }
 */
export function selectArticles(articles, opts = {}) {
  const {
    category, locale, offset = 0, limit = Infinity, exclude,
  } = opts;
  return articles
    .filter((a) => (!category || a.category === category)
      && (!locale || a.locale === locale)
      && (!exclude || a.path !== exclude))
    .slice(offset, offset + limit);
}

/**
 * Build one article card as the row structure blocks/cards-article expects
 * post-decoration: an image cell, and a body cell whose single <p> holds the
 * title link followed by a description <span> (see cards-article.js, which
 * promotes the title <a> and wraps the trailing description text node the
 * same way for authored cards — matched here so enhanced and authored cards
 * are indistinguishable).
 * @param {object} article an index row
 * @param {(src: string, alt: string) => Element|null} makePicture
 *        image factory (createOptimizedPicture, injected to avoid importing
 *        aem.js here so this module stays framework-light)
 */
export function buildArticleCardItem(article, makePicture) {
  const li = document.createElement('li');

  const imageCell = document.createElement('div');
  imageCell.className = 'cards-article-card-image';
  if (article.image && makePicture) {
    const picture = makePicture(article.image, article.title || '');
    if (picture) imageCell.append(picture);
  }

  const bodyCell = document.createElement('div');
  bodyCell.className = 'cards-article-card-body';
  const p = document.createElement('p');
  const link = document.createElement('a');
  link.href = article.path;
  link.textContent = article.title || article.path;
  p.append(link);
  if (article.description) {
    const span = document.createElement('span');
    span.className = 'cards-article-card-description';
    span.textContent = article.description;
    p.append(span);
  }
  bodyCell.append(p);

  li.append(imageCell, bodyCell);
  return li;
}

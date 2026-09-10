// WKND footer: dark bar with logo + footer nav, "Follow Us" social icons, and
// copyright/legal copy. Content-first: all copy/links/images live in
// /content/footer.plain.html; this module reads that DOM and lays it out.

/**
 * Fetch the footer fragment (metadata-independent dual-fetch): the root path
 * (/footer.plain.html) resolves on both production (DA/EDS) and local `aem up`,
 * so try it first to avoid a guaranteed 404 (which logs a console error and
 * dings the Lighthouse best-practices score). Fall back to /content for any
 * setup that only serves there.
 */
async function fetchFooter() {
  let resp = await fetch('/footer.plain.html');
  if (!resp.ok) resp = await fetch('/content/footer.plain.html');
  if (!resp.ok) return null;
  const html = await resp.text();
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  // Relative image paths in the fragment (images/foo.svg) would resolve against
  // the current page URL; rewrite to a root-absolute path so they load on any page.
  tmp.querySelectorAll('img[src]').forEach((img) => {
    const src = img.getAttribute('src');
    if (src && !/^(https?:)?\//.test(src) && !src.startsWith('data:')) {
      img.setAttribute('src', `/${src.replace(/^\.?\/*/, '')}`);
    }
  });
  // Internal links authored with a .html extension 404 on EDS (extensionless
  // URLs); strip .html from same-site paths. Leave external and anchor links.
  tmp.querySelectorAll('a[href]').forEach((a) => {
    const href = a.getAttribute('href');
    if (href && href.startsWith('/') && href.endsWith('.html')) {
      a.setAttribute('href', href.replace(/\.html$/, ''));
    }
  });
  return tmp;
}

export default async function decorate(block) {
  const frag = await fetchFooter();
  block.textContent = '';
  if (!frag) return;

  const sections = [...frag.querySelectorAll(':scope > div')];
  const footer = document.createElement('div');
  footer.className = 'footer-inner';

  // Top row: brand + footer nav (left) and Follow Us + social icons (right),
  // laid out on a single row like the source.
  const top = document.createElement('div');
  top.className = 'footer-top';

  // Section 0: brand + footer nav
  if (sections[0]) {
    const brandNav = document.createElement('div');
    brandNav.className = 'footer-brand-nav';
    brandNav.append(...sections[0].childNodes);
    top.append(brandNav);
  }

  // Section 1: Follow Us + social icons
  if (sections[1]) {
    const social = document.createElement('div');
    social.className = 'footer-social';
    social.append(...sections[1].childNodes);
    top.append(social);
  }

  footer.append(top);

  // Section 2: copyright + legal copy (full-width row below)
  if (sections[2]) {
    const legal = document.createElement('div');
    legal.className = 'footer-legal';
    legal.append(...sections[2].childNodes);
    footer.append(legal);
  }

  block.append(footer);
}

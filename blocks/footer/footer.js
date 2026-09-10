// WKND footer: dark bar with logo + footer nav, "Follow Us" social icons, and
// copyright/legal copy. Content-first: reads /footer.plain.html when it has
// content, but falls back to a built-in WKND footer so it always renders even
// if the content fragment is unavailable/empty.

/**
 * Fetch the footer fragment (metadata-independent dual-fetch): the root path
 * (/footer.plain.html) resolves on both production (DA/EDS) and local `aem up`,
 * so try it first. Falls back to /content for setups that only serve there.
 * Returns null if neither resolves or the fragment has no real content.
 */
async function fetchFooter() {
  let resp = await fetch('/footer.plain.html');
  if (!resp.ok) resp = await fetch('/content/footer.plain.html');
  if (!resp.ok) return null;
  const html = await resp.text();
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  // Treat an empty/whitespace-only fragment as "no content" so the fallback runs.
  if (!tmp.querySelector('a, p, ul, h1, h2, h3, h4, h5, h6')) return null;
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

/**
 * Build the WKND footer entirely in JS, sourcing images from the repo /icons/
 * folder (served directly, no media pipeline). Used both as the fallback and to
 * inject the logo/social icons that authored content can't reliably carry.
 */
function buildDefaultFooter() {
  const tmp = document.createElement('div');
  tmp.innerHTML = `
    <div>
      <p><a href="/us/en"><img src="/icons/wknd-logo-footer.svg" alt="WKND Logo" width="239" height="89"></a></p>
      <ul>
        <li><a href="/us/en/magazine">Magazine</a></li>
        <li><a href="/us/en/adventures">Adventures</a></li>
        <li><a href="/us/en/faqs">FAQs</a></li>
        <li><a href="/us/en/about-us">About Us</a></li>
      </ul>
    </div>
    <div>
      <h4>Follow Us</h4>
      <ul>
        <li><a href="#facebookwknd" aria-label="Facebook"><img src="/icons/social-facebook.svg" alt="Facebook" width="24" height="24"></a></li>
        <li><a href="#twitterwknd" aria-label="Twitter"><img src="/icons/social-twitter.svg" alt="Twitter" width="24" height="24"></a></li>
        <li><a href="#instagramwknd" aria-label="Instagram"><img src="/icons/social-instagram.svg" alt="Instagram" width="24" height="24"></a></li>
      </ul>
    </div>
    <div>
      <p>&copy; 2019, WKND Site.</p>
      <p>WKND is a fictitious adventure and travel website created by Adobe to demonstrate how anyone can use Adobe Experience Manager to build a beautiful, feature-rich website over a single weekend. This site is built entirely with Adobe Experience Manager <a href="https://docs.adobe.com/content/help/en/experience-manager-core-components/using/introduction.html">Core Components</a> and <a href="https://github.com/adobe/aem-project-archetype">Archetype</a> that are available as open source code to the public. The entire <a href="https://github.com/adobe/aem-guides-wknd/">site source code</a> is available as open source as well and is accompanied with a <a href="https://docs.adobe.com/content/help/en/experience-manager-learn/getting-started-wknd-tutorial-develop/overview.html">detailed tutorial</a> on how to recreate the site.</p>
      <p>Many of the beautiful images in the WKND site are available for purchase via <a href="https://stock.adobe.com/">Adobe Stock</a>.</p>
    </div>`;
  return tmp;
}

export default async function decorate(block) {
  const frag = (await fetchFooter()) || buildDefaultFooter();
  block.textContent = '';

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

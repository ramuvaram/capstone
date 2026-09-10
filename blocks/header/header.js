// WKND header: dark utility bar (tools) over a white main bar (brand + nav + search).
// Content-first: all copy/links/images live in /content/nav.plain.html; this module
// reads that DOM and builds layout + interactive controls (search, locale toggle).

const isDesktop = window.matchMedia('(min-width: 900px)');

/**
 * Fetch the nav fragment (metadata-independent dual-fetch): the root path
 * (/nav.plain.html) resolves on both production (DA/EDS) and local `aem up`,
 * so try it first to avoid a guaranteed 404 (which logs a console error and
 * dings the Lighthouse best-practices score). Fall back to /content for any
 * setup that only serves there.
 */
async function fetchNav() {
  let resp = await fetch('/nav.plain.html');
  if (!resp.ok) resp = await fetch('/content/nav.plain.html');
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
  // Internal links authored with a .html extension 404 on EDS (which serves
  // extensionless URLs); strip .html from same-site paths. Leave external
  // (https://) links and in-page anchors (#…) untouched.
  tmp.querySelectorAll('a[href]').forEach((a) => {
    const href = a.getAttribute('href');
    if (href && href.startsWith('/') && href.endsWith('.html')) {
      a.setAttribute('href', href.replace(/\.html$/, ''));
    }
  });
  return tmp;
}

/**
 * Build the Sign In modal (dark panel, yellow-underlined title, username +
 * password fields, forgot-password link, yellow SIGN IN button) and wire up
 * open/close (button click, overlay click, Escape) with basic focus handling.
 * @returns {(e?: Event) => void} an open handler to attach to the Sign In link
 */
function createSignInModal() {
  const overlay = document.createElement('div');
  overlay.className = 'nav-signin-overlay';
  overlay.hidden = true;
  overlay.innerHTML = `
    <div class="nav-signin-modal" role="dialog" aria-modal="true" aria-labelledby="nav-signin-title">
      <button type="button" class="nav-signin-close" aria-label="Close sign in">&times;</button>
      <h2 id="nav-signin-title" class="nav-signin-heading">Sign In</h2>
      <h3 class="nav-signin-welcome">Welcome Back</h3>
      <form class="nav-signin-form">
        <label class="nav-signin-field">
          <span class="sr-only">Username</span>
          <input type="text" name="username" placeholder="USERNAME" autocomplete="username">
        </label>
        <label class="nav-signin-field">
          <span class="sr-only">Password</span>
          <input type="password" name="password" placeholder="PASSWORD" autocomplete="current-password">
        </label>
        <a class="nav-signin-forgot" href="#forgot-password">Forgot your password?</a>
        <button type="submit" class="nav-signin-submit">Sign In</button>
      </form>
    </div>`;

  const close = () => {
    overlay.hidden = true;
    document.body.style.overflowY = '';
  };
  const open = (e) => {
    if (e) e.preventDefault();
    overlay.hidden = false;
    document.body.style.overflowY = 'hidden';
    overlay.querySelector('input')?.focus();
  };

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay || e.target.closest('.nav-signin-close')) close();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !overlay.hidden) close();
  });
  // Demo form: no backend — just prevent navigation.
  overlay.querySelector('.nav-signin-form').addEventListener('submit', (e) => e.preventDefault());

  document.body.append(overlay);
  return open;
}

/** Toggle the mobile menu open/closed. */
function toggleMenu(nav, expanded) {
  const button = nav.querySelector('.nav-hamburger button');
  const open = expanded ?? nav.getAttribute('aria-expanded') !== 'true';
  nav.setAttribute('aria-expanded', open ? 'true' : 'false');
  document.body.style.overflowY = open && !isDesktop.matches ? 'hidden' : '';
  if (button) {
    // Expose the open/closed state on the control itself for assistive tech.
    button.setAttribute('aria-expanded', open ? 'true' : 'false');
    button.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  }
}

/** Build the search control (structure lives in JS per the nav contract). */
function buildSearch() {
  const wrapper = document.createElement('div');
  wrapper.className = 'nav-search';
  const form = document.createElement('form');
  form.setAttribute('role', 'search');
  form.className = 'nav-search-form';
  form.addEventListener('submit', (e) => e.preventDefault());
  const label = document.createElement('span');
  label.className = 'nav-search-icon';
  label.setAttribute('aria-hidden', 'true');
  const input = document.createElement('input');
  input.type = 'search';
  input.placeholder = 'SEARCH';
  input.setAttribute('aria-label', 'Search');
  input.className = 'nav-search-input';
  form.append(label, input);
  wrapper.append(form);
  return wrapper;
}

export default async function decorate(block) {
  const frag = await fetchNav();
  block.textContent = '';
  if (!frag) return;

  const sections = [...frag.querySelectorAll(':scope > div')];
  const brandContent = sections[0];
  const linksContent = sections[1];
  const toolsContent = sections[2];

  const wrapper = document.createElement('div');
  wrapper.className = 'nav-wrapper';

  // --- Utility bar (row 0): tools — Sign In + locale selector ---
  // Kept as a sibling of <nav> (its own dark bar) rather than a child, so the
  // dark background is the direct backdrop of the light utility text.
  if (toolsContent) {
    const utility = document.createElement('div');
    utility.className = 'nav-utility';
    const inner = document.createElement('div');
    inner.className = 'nav-utility-inner';

    // The locale entries live in the tools <ul>; extract before processing links.
    const localeList = toolsContent.querySelector('ul');

    // Direct <p> anchors: Sign In, and the locale toggle (has a flag <img>).
    toolsContent.querySelectorAll(':scope > p > a').forEach((a) => {
      const img = a.querySelector('img');
      if (img && localeList) {
        // Locale selector: a toggle button + a dropdown built from the <ul>.
        const locale = document.createElement('div');
        locale.className = 'nav-locale';

        // The language code (e.g. "en-US") is authored as a text node in the
        // parent <p>, alongside the flag <img> — not inside the <a>. Read the
        // whole paragraph so the label isn't empty.
        const label = (a.closest('p')?.textContent || a.textContent).trim();
        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'nav-locale-toggle';
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-haspopup', 'true');
        toggle.setAttribute('aria-label', `Toggle Language ${label}`);
        // Render the flag as an inline image (properly aligned) + code + chevron.
        toggle.innerHTML = `<img class="nav-locale-flag" src="${img.getAttribute('src')}" alt="" width="25" height="25">`
          + `<span class="nav-locale-label">${label}</span>`
          + '<span class="nav-locale-chevron" aria-hidden="true"></span>';

        const dropdown = localeList.cloneNode(true);
        dropdown.className = 'nav-locale-dropdown';
        dropdown.hidden = true;

        // Normalize each country row to a predictable structure so CSS can lay
        // it out reliably: a small flag, the country name, and the language
        // links. Authored markup mixes the flag <picture> and the country name
        // text inside a single <p>, which breaks a grid built for a bare <img>.
        dropdown.querySelectorAll(':scope > li').forEach((row) => {
          const flagImg = row.querySelector('img');
          const links = row.querySelector('ul');
          // Country name = the row's text minus the language-link text.
          const linkText = links ? links.textContent : '';
          let name = row.textContent.replace(linkText, '').trim();
          name = name.replace(/\s+/g, ' ');

          const flag = document.createElement('img');
          flag.className = 'nav-locale-flag';
          if (flagImg) {
            flag.src = flagImg.getAttribute('src');
            flag.width = 24;
            flag.height = 24;
          }
          flag.alt = '';

          const country = document.createElement('span');
          country.className = 'nav-locale-country';
          country.textContent = name;

          row.textContent = '';
          if (flagImg) row.append(flag);
          row.append(country);
          if (links) row.append(links);
        });

        // Mark the active language link (matches the current toggle label).
        const activeCode = label.toLowerCase();
        dropdown.querySelectorAll('a').forEach((link) => {
          if (link.textContent.trim().toLowerCase() === activeCode) {
            link.classList.add('nav-locale-active');
          }
        });

        toggle.addEventListener('click', (e) => {
          e.stopPropagation();
          const open = toggle.getAttribute('aria-expanded') !== 'true';
          toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
          dropdown.hidden = !open;
        });

        locale.append(toggle, dropdown);
        inner.append(locale);
      } else {
        // Sign In: a plain link that opens the sign-in modal.
        const link = a.cloneNode(true);
        link.classList.add('nav-signin');
        const openModal = createSignInModal();
        link.addEventListener('click', openModal);
        inner.append(link);
      }
    });

    utility.append(inner);
    wrapper.append(utility);
  }

  // Main bar (row 1): <nav> directly holds brand, hamburger, the nav <ul>,
  // and the search — a flat structure so the primary <ul> is a direct child of
  // <nav> (top-level nav items are detectable as first-class links/triggers).
  const nav = document.createElement('nav');
  nav.id = 'nav';
  nav.className = 'nav-main-inner';
  nav.setAttribute('aria-expanded', isDesktop.matches ? 'true' : 'false');

  // Brand / logo
  const brand = document.createElement('div');
  brand.className = 'nav-brand';
  if (brandContent) brand.append(...brandContent.childNodes);
  nav.append(brand);

  // Hamburger (mobile)
  const hamburger = document.createElement('div');
  hamburger.className = 'nav-hamburger';
  hamburger.innerHTML = `<button type="button" aria-controls="nav" aria-expanded="false" aria-label="Open navigation">
      <span class="nav-hamburger-icon"></span>
    </button>`;
  hamburger.addEventListener('click', () => toggleMenu(nav));
  nav.append(hamburger);

  // Nav links: the <ul> is appended directly to <nav>.
  if (linksContent) {
    const ul = linksContent.querySelector('ul');
    if (ul) {
      const list = ul.cloneNode(true);
      list.classList.add('nav-sections');
      // The "Home" root item is hidden on desktop and shown on mobile (matches
      // source): mark the item whose link points at the site root.
      const homeItem = [...list.querySelectorAll('li')].find((li) => {
        const a = li.querySelector('a');
        return a && /\/us\/en(\.html)?$/.test(a.getAttribute('href') || '');
      });
      if (homeItem) homeItem.classList.add('nav-home-item');
      nav.append(list);
    }
  }

  // Search
  nav.append(buildSearch());

  // Resize handling: reset state when crossing the breakpoint.
  isDesktop.addEventListener('change', () => {
    nav.setAttribute('aria-expanded', isDesktop.matches ? 'true' : 'false');
    document.body.style.overflowY = '';
    const button = nav.querySelector('.nav-hamburger button');
    if (button) {
      button.setAttribute('aria-expanded', 'false');
      button.setAttribute('aria-label', 'Open navigation');
    }
  });

  // Close the locale dropdown when clicking outside it.
  document.addEventListener('click', (e) => {
    const toggle = wrapper.querySelector('.nav-locale-toggle');
    const dropdown = wrapper.querySelector('.nav-locale-dropdown');
    if (!toggle || !dropdown || dropdown.hidden) return;
    if (!e.target.closest('.nav-locale')) {
      toggle.setAttribute('aria-expanded', 'false');
      dropdown.hidden = true;
    }
  });

  wrapper.append(nav);
  block.append(wrapper);
}

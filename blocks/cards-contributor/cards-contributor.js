import { createOptimizedPicture } from '../../scripts/aem.js';

const PLATFORMS = ['facebook', 'twitter', 'instagram'];

function platformFor(text) {
  const t = (text || '').trim().toLowerCase();
  return PLATFORMS.find((p) => t.includes(p)) || null;
}

export default function decorate(block) {
  /* change to ul, li */
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    while (row.firstElementChild) li.append(row.firstElementChild);
    [...li.children].forEach((div) => {
      if (div.children.length === 1 && div.querySelector('picture')) div.className = 'cards-contributor-card-image';
      else div.className = 'cards-contributor-card-body';
    });

    /* the role sits below the name as an h5, which skips h4 in the heading
       outline; it's a subtitle, not a heading — demote it to a paragraph */
    li.querySelectorAll('.cards-contributor-card-body h5').forEach((h5) => {
      const role = document.createElement('p');
      role.className = 'cards-contributor-role';
      role.append(...h5.childNodes);
      h5.replaceWith(role);
    });

    /* group the social links (each authored as its own <p><a>) into an icon bar */
    const body = li.querySelector('.cards-contributor-card-body');
    if (body) {
      const socialParas = [...body.querySelectorAll(':scope > p')].filter((p) => {
        const a = p.querySelector('a');
        return a && platformFor(a.textContent);
      });
      if (socialParas.length) {
        const social = document.createElement('div');
        social.className = 'cards-contributor-social';
        socialParas.forEach((p) => {
          const a = p.querySelector('a');
          const platform = platformFor(a.textContent);
          a.className = 'cards-contributor-social-link';
          a.dataset.platform = platform;
          a.setAttribute('aria-label', a.textContent.trim());
          a.textContent = '';
          social.append(a);
          p.remove();
        });
        body.append(social);
      }
    }

    ul.append(li);
  });
  ul.querySelectorAll('picture > img').forEach((img) => {
    // Only optimize same-origin (DA/EDS) images — createOptimizedPicture appends
    // ?width/format/optimize params the origin must serve. Imported content still
    // points at the source site (wknd.site), which 404s on those params, so leave
    // external images untouched.
    let sameOrigin = false;
    try {
      sameOrigin = new URL(img.src, window.location.href).origin === window.location.origin;
    } catch { sameOrigin = false; }
    if (sameOrigin) {
      const optimizedPic = createOptimizedPicture(img.src, img.alt, false, [{ width: '500' }]);
      img.closest('picture').replaceWith(optimizedPic);
    }
  });
  block.textContent = '';
  block.append(ul);
}

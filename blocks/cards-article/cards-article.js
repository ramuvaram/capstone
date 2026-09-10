import { createOptimizedPicture } from '../../scripts/aem.js';

export default function decorate(block) {
  /* change to ul, li */
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    while (row.firstElementChild) li.append(row.firstElementChild);
    [...li.children].forEach((div) => {
      if (div.children.length === 1 && div.querySelector('picture')) {
        div.className = 'cards-article-card-image';
      } else {
        div.className = 'cards-article-card-body';
        // Source markup keeps the title link and the one-line description as
        // separate elements. EDS leaves the description as a bare text node
        // after the title <a>; wrap it so it can be clamped to a single line.
        div.querySelectorAll('p').forEach((p) => {
          [...p.childNodes]
            .filter((n) => n.nodeType === Node.TEXT_NODE && n.textContent.trim())
            .forEach((textNode) => {
              const span = document.createElement('span');
              span.className = 'cards-article-card-description';
              textNode.replaceWith(span);
              span.append(textNode);
            });
        });
      }
    });
    ul.append(li);
  });
  ul.querySelectorAll('picture > img').forEach((img) => {
    // createOptimizedPicture only works for same-origin (DA/EDS) assets — it
    // appends ?width/format/optimize params the origin must support. The imported
    // content still references the source site (wknd.site), which 404s on those
    // params, so only optimize same-origin images; leave external ones as-is.
    let sameOrigin = false;
    try {
      sameOrigin = new URL(img.src, window.location.href).origin === window.location.origin;
    } catch { sameOrigin = false; }
    if (sameOrigin) {
      const optimizedPic = createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]);
      img.closest('picture').replaceWith(optimizedPic);
    }
  });
  block.textContent = '';
  block.append(ul);
}

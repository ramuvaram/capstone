/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-contributor. Base: cards.
 * Source: https://wknd.site/us/en/about-us.html
 *         (.experiencefragment.cmp-experience-fragment--contributor)
 * Generated: 2026-09-09
 *
 * Library convention (cards): 2 columns, multiple rows. Row 1 = block name.
 * Each subsequent row = one card: cell 1 = portrait image (mandatory),
 * cell 2 = text body (name/title heading + role + social-link CTAs).
 *
 * GROUPING: Each contributor is its own <section> sibling in the main grid.
 * On the about-us page there are 7 contributors, split into two visual groups by
 * a "WKND Guides" heading (4 contributors, heading, then 3 contributors). We want
 * ONE cards-contributor block per contiguous run of contributor sections so the
 * page ends up with two card grids and the "WKND Guides" heading survives between
 * them.
 *
 * The import script invokes this parser once per matched element and skips any
 * element that has already been detached (parentNode === null). So:
 *  - If the previous element sibling is also a contributor section, this section is
 *    NOT the run leader -> return without doing anything. The run leader will absorb
 *    (remove) it; by the time the script re-invokes on it, it is detached and skipped.
 *  - If it IS the run leader (previous sibling is not a contributor), gather this
 *    section plus all following consecutive contributor siblings, build ONE block,
 *    replace the leader with the block, and remove the consumed following sections.
 */

// A contributor section is <section class="experiencefragment cmp-experience-fragment--contributor ...">
function isContributorSection(node) {
  return !!node
    && node.nodeType === 1
    && node.classList
    && node.classList.contains('experiencefragment')
    && node.classList.contains('cmp-experience-fragment--contributor');
}

// Build a single card row [image, bodyCell] from one contributor <section>.
function buildCardRow(section, document) {
  // Portrait image (first cell, mandatory per cards convention).
  const img = section.querySelector('.cmp-image img, img');

  // Text body (second cell): name heading + role + social links.
  const bodyCell = [];

  // Titles: first .cmp-title__text is the name, a second one (if any) is the role.
  const titles = Array.from(section.querySelectorAll('.cmp-title__text'));
  const nameEl = titles[0];
  const roleEl = titles[1];
  if (nameEl) bodyCell.push(nameEl);
  if (roleEl) bodyCell.push(roleEl);

  // Social links: anchors inside .cmp-button. Rebuild as clean labeled links using
  // the href and a label derived from the icon modifier (facebook -> Facebook, etc.).
  const anchors = Array.from(section.querySelectorAll('a.cmp-button'));
  const seen = new Set();
  anchors.forEach((anchor) => {
    const href = anchor.getAttribute('href');
    if (!href || seen.has(anchor)) return;
    seen.add(anchor);

    // Derive label from the icon modifier class, e.g. cmp-button__icon--facebook.
    let label = '';
    const icon = anchor.querySelector('[class*="cmp-button__icon--"]');
    if (icon) {
      const match = Array.from(icon.classList).find((c) => c.startsWith('cmp-button__icon--'));
      if (match) {
        const key = match.replace('cmp-button__icon--', '');
        label = key.charAt(0).toUpperCase() + key.slice(1);
      }
    }
    // Fall back to the button's own text label if no icon modifier was found.
    if (!label) {
      const txt = anchor.querySelector('.cmp-button__text');
      label = (txt ? txt.textContent : anchor.textContent || '').trim();
    }

    const link = document.createElement('a');
    link.setAttribute('href', href);
    link.textContent = label || href;
    // Wrap each social link in its own <p> so block-level separation is preserved.
    // Several contributors reuse the same href for all three buttons (e.g. all
    // "#jacob-wester" or "#"), and adjacent inline anchors with an identical href
    // would otherwise be merged into a single link by the markdown converter.
    const wrapper = document.createElement('p');
    wrapper.append(link);
    bodyCell.push(wrapper);
  });

  return [img || '', bodyCell];
}

export default function parse(element, { document }) {
  // Not the run leader: a preceding contributor sibling owns this run. Leave it in
  // place; the leader removes it and the script skips it once detached.
  if (isContributorSection(element.previousElementSibling)) {
    return;
  }

  // Run leader: gather this section + all following consecutive contributor siblings.
  const run = [element];
  let next = element.nextElementSibling;
  while (isContributorSection(next)) {
    run.push(next);
    next = next.nextElementSibling;
  }

  const cells = [];
  run.forEach((section) => {
    const row = buildCardRow(section, document);
    // Only include cards that carry content.
    if (row[0] || (Array.isArray(row[1]) && row[1].length)) {
      cells.push(row);
    }
  });

  // Empty-block guard.
  if (!cells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-contributor', cells });

  // Replace the leader with the block, then remove the consumed following sections.
  element.replaceWith(block);
  run.slice(1).forEach((section) => section.remove());
}

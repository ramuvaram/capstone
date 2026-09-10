/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-article. Base: cards.
 * Source: https://wknd.site/us/en.html (.image-list.list)
 * Generated: 2026-09-09
 *
 * Library convention (cards): 2 columns, multiple rows. Row 1 = block name.
 * Each subsequent row = one card:
 *   cell 1 = image (mandatory), cell 2 = text (title + description + optional CTA).
 * There are two instances of this block on the page; this parser runs per element.
 */
export default function parse(element, { document }) {
  const items = Array.from(element.querySelectorAll('.cmp-image-list__item, li'));

  const cells = [];

  items.forEach((item) => {
    // Image cell: the actual <img>, discarding link/wrapper chrome and <meta>.
    const img = item.querySelector('.cmp-image-list__item-image img, .cmp-image img, img');

    // Text cell contents.
    const textCell = [];

    // Title: keep it as the link so the card remains clickable when present.
    const titleLink = item.querySelector('a.cmp-image-list__item-title-link');
    const titleSpan = item.querySelector('.cmp-image-list__item-title, h1, h2, h3, h4');
    if (titleLink) {
      textCell.push(titleLink);
    } else if (titleSpan) {
      textCell.push(titleSpan);
    }

    const description = item.querySelector('.cmp-image-list__item-description, [class*="description"], p');
    if (description) textCell.push(description);

    if (img || textCell.length) {
      cells.push([img || '', textCell]);
    }
  });

  // Empty-block guard.
  if (!cells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-article', cells });
  element.replaceWith(block);
}

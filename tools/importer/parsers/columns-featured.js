/* eslint-disable */
/* global WebImporter */
/**
 * Parser for columns-featured. Base: columns.
 * Source: https://wknd.site/us/en.html (.teaser.cmp-teaser--featured)
 * Generated: 2026-09-09
 *
 * Library convention (columns): first row = block name, second row defines the
 * column layout. Here the featured teaser is two columns:
 *   cell 1 = image, cell 2 = text (eyebrow + heading + description + CTA).
 */
export default function parse(element, { document }) {
  // Image column: the actual <img>, discarding wrapper chrome/<meta>.
  const img = element.querySelector('.cmp-teaser__image img, .cmp-image img, img');

  // Text column contents.
  const textCell = [];

  const eyebrow = element.querySelector('.cmp-teaser__pretitle, [class*="pretitle"], [class*="eyebrow"]');
  if (eyebrow) textCell.push(eyebrow);

  // Note: avoid a broad [class*="title"] fallback here — it also matches the
  // pretitle/eyebrow, which appears earlier in the DOM and would shadow the h2.
  const heading = element.querySelector('.cmp-teaser__title, h1, h2, h3');
  if (heading) textCell.push(heading);

  const description = element.querySelector('.cmp-teaser__description, [class*="description"], p:not([class*="pretitle"])');
  if (description) textCell.push(description);

  const ctaLinks = Array.from(
    element.querySelectorAll('.cmp-teaser__action-link, .cmp-teaser__action-container a, a.button'),
  );
  ctaLinks.forEach((cta) => textCell.push(cta));

  // Empty-block guard.
  if (!img && !textCell.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [[img || '', textCell]];

  const block = WebImporter.Blocks.createBlock(document, { name: 'columns-featured', cells });
  element.replaceWith(block);
}

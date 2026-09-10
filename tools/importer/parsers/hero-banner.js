/* eslint-disable */
/* global WebImporter */
/**
 * Parser for hero-banner. Base: hero.
 * Source: https://wknd.site/us/en.html (.teaser.cmp-teaser--imagebottom)
 * Generated: 2026-09-09
 *
 * Library convention (hero): 1 column, 3 rows.
 * Row 1 = block name. Row 2 = background image (optional). Row 3 = text content
 * (heading + subheading/paragraph + CTA). Each content row is a single cell.
 */
export default function parse(element, { document }) {
  // Background image: the actual <img>, discarding wrapper chrome/<meta>.
  const bgImage = element.querySelector('.cmp-teaser__image img, .cmp-image img, img');

  // Text content for row 3.
  const contentCell = [];

  const heading = element.querySelector('.cmp-teaser__title, h1, h2, h3');
  if (heading) contentCell.push(heading);

  const description = element.querySelector('.cmp-teaser__description, [class*="description"], p');
  if (description) contentCell.push(description);

  const ctaLinks = Array.from(
    element.querySelectorAll('.cmp-teaser__action-link, .cmp-teaser__action-container a, a.button'),
  );
  ctaLinks.forEach((cta) => contentCell.push(cta));

  // Empty-block guard.
  if (!bgImage && !contentCell.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [];
  // Row 2: background image (single cell), only if present.
  if (bgImage) cells.push([bgImage]);
  // Row 3: text content (single cell holding all elements).
  cells.push([contentCell]);

  const block = WebImporter.Blocks.createBlock(document, { name: 'hero-banner', cells });
  element.replaceWith(block);
}

/* eslint-disable */
/* global WebImporter */
/**
 * Parser for carousel-hero. Base: carousel.
 * Source: https://wknd.site/us/en.html (.carousel.cmp-carousel--hero)
 * Generated: 2026-09-09
 *
 * Library convention (carousel): 2 columns, multiple rows.
 * Row 1: block name. Each subsequent row = one slide:
 *   cell 1 = image (mandatory), cell 2 = text content (title + description + CTA).
 */
export default function parse(element, { document }) {
  // Each slide is a carousel item; fall back to teaser wrappers if markup varies.
  let slides = Array.from(element.querySelectorAll('.cmp-carousel__item'));
  if (!slides.length) {
    slides = Array.from(element.querySelectorAll('.teaser, [class*="teaser"]'));
  }

  const cells = [];

  slides.forEach((slide) => {
    // Image cell: pull the actual <img>, discarding wrapper chrome/<meta>.
    const img = slide.querySelector('.cmp-teaser__image img, .cmp-image img, img');

    // Text cell contents.
    const textCell = [];
    const title = slide.querySelector('.cmp-teaser__title, h1, h2, h3, [class*="title"]');
    if (title) textCell.push(title);

    const description = slide.querySelector('.cmp-teaser__description, [class*="description"], p');
    if (description) textCell.push(description);

    const ctaLinks = Array.from(
      slide.querySelectorAll('.cmp-teaser__action-link, .cmp-teaser__action-container a, a.button'),
    );
    ctaLinks.forEach((cta) => textCell.push(cta));

    // Only emit a slide row when it has real content.
    if (img || textCell.length) {
      cells.push([img || '', textCell]);
    }
  });

  // Empty-block guard: nothing extractable → unwrap in place.
  if (!cells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'carousel-hero', cells });
  element.replaceWith(block);
}

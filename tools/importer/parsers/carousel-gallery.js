/* eslint-disable */
/* global WebImporter */
/**
 * Parser for carousel-gallery. Base: carousel.
 * Source: https://wknd.site/us/en/adventures/bali-surf-camp.html (.carousel.cmp-carousel--mini)
 * Generated: 2026-09-09
 *
 * Library convention (carousel): 2 columns, multiple rows.
 * Row 1: block name. Each subsequent row = one slide:
 *   cell 1 = image (mandatory), cell 2 = optional text content.
 * This is an image-only rotating gallery (no text overlay), so each slide row
 * contains a single image cell and no text cell.
 */
export default function parse(element, { document }) {
  // Each slide is a carousel item; fall back to image wrappers if markup varies.
  let slides = Array.from(element.querySelectorAll('.cmp-carousel__item'));
  if (!slides.length) {
    slides = Array.from(element.querySelectorAll('.image, .cmp-image'));
  }

  const cells = [];

  slides.forEach((slide) => {
    // Image cell: pull the actual <img>, discarding wrapper chrome/<meta>.
    const img = slide.querySelector('.cmp-image img, .image img, img');
    // Image-only gallery: one image per slide row, no text cell.
    if (img) {
      cells.push([img]);
    }
  });

  // Empty-block guard: nothing extractable → unwrap in place.
  if (!cells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'carousel-gallery', cells });
  element.replaceWith(block);
}

/* eslint-disable */
/* global WebImporter */
/**
 * Parser for accordion-faq. Base: accordion.
 * Source: https://wknd.site/us/en/faqs.html (.accordion.panelcontainer)
 * Generated: 2026-09-09
 *
 * Library convention (accordion): 2 columns, multiple rows.
 * Row 1: block name. Each subsequent row = one accordion item:
 *   cell 1 = title/question (mandatory), cell 2 = body content (mandatory).
 *
 * Source shape (AEM CMP accordion):
 *   .cmp-accordion__item
 *     h3.cmp-accordion__header > button > span.cmp-accordion__title  → question text
 *     .cmp-accordion__panel > … > .cmp-text                          → answer body
 *       (paragraphs, lists, headings; may include empty &nbsp; nodes)
 */
export default function parse(element, { document }) {
  const items = Array.from(element.querySelectorAll('.cmp-accordion__item'));

  const cells = [];

  items.forEach((item) => {
    // Question: plain text from the accordion title span.
    const titleEl = item.querySelector('.cmp-accordion__title, .cmp-accordion__button, .cmp-accordion__header');
    const question = titleEl ? (titleEl.textContent || '').trim() : '';

    // Answer: rich content from the panel. Prefer the inner text component,
    // fall back to the panel itself if the markup varies.
    const panel = item.querySelector('.cmp-accordion__panel');
    const contentSource = (panel && panel.querySelector('.cmp-text')) || panel;

    const contentCell = [];
    if (contentSource) {
      const nodes = Array.from(
        contentSource.querySelectorAll('p, ul, ol, img, h1, h2, h3, h4, h5, h6, blockquote'),
      );
      nodes.forEach((node) => {
        // Skip empty spacer nodes (e.g. <h3>&nbsp;</h3>, empty <p>) that carry no meaning.
        const hasText = (node.textContent || '').replace(/ /g, ' ').trim().length > 0;
        const hasMedia = !!node.querySelector('img');
        if (!hasText && !hasMedia && node.tagName !== 'IMG') return;
        contentCell.push(node);
      });
    }

    // Only emit a row when we have a question and some answer content.
    if (question && contentCell.length) {
      cells.push([question, contentCell]);
    }
  });

  // Empty-block guard: nothing extractable → unwrap in place.
  if (!cells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'accordion-faq', cells });
  element.replaceWith(block);
}

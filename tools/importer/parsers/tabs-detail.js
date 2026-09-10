/* eslint-disable */
/* global WebImporter */
/**
 * Parser for tabs-detail. Base: tabs.
 * Sources:
 *   - https://wknd.site/us/en/adventures/bali-surf-camp.html (.tabs.panelcontainer) — detail page
 *   - https://wknd.site/us/en/adventures.html (.tabs.panelcontainer) — listing page
 * Generated: 2026-09-09
 *
 * Library convention (tabs): 2 columns, multiple rows.
 * Row 1: block name. Each subsequent row = one tab:
 *   cell 1 = tab label (mandatory), cell 2 = tab panel content (mandatory).
 *
 * Two panel shapes are supported:
 *   1. Content-fragment rich text (detail page): paragraphs, lists, images,
 *      headings live under .cmp-contentfragment__elements. Collected as a
 *      rich-content node collection (existing behavior — preserved).
 *   2. Adventure card grid (listing page): panel contains an .image-list.list
 *      with .cmp-image-list__item cards. Represented as a NESTED cards-article
 *      block table so each tab panel renders the adventure card grid.
 */

/**
 * Build a nested cards-article block table from an image-list card grid.
 * Mirrors tools/importer/parsers/cards-article.js: one row per card =
 * [image, title(link) + description]. Returns the block element, or null
 * when no cards are present.
 */
function buildCardsArticleBlock(grid, document) {
  const items = Array.from(grid.querySelectorAll('.cmp-image-list__item, li'));
  const cardCells = [];

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
      cardCells.push([img || '', textCell]);
    }
  });

  if (!cardCells.length) return null;

  return WebImporter.Blocks.createBlock(document, { name: 'cards-article', cells: cardCells });
}

export default function parse(element, { document }) {
  // Tab labels and their corresponding panels.
  const tabs = Array.from(element.querySelectorAll('.cmp-tabs__tab'));
  const panels = Array.from(element.querySelectorAll('.cmp-tabs__tabpanel'));

  const cells = [];

  tabs.forEach((tab, index) => {
    const panel = panels[index];
    if (!panel) return;

    // Label cell: plain text of the tab.
    const labelText = (tab.textContent || '').trim();

    // Detect panel content type. Card/image-list grid → nested cards-article.
    const grid = panel.querySelector('.image-list.list, .cmp-image-list');

    if (grid) {
      // Shape 2 (listing page): adventure card grid → nested cards-article block.
      const cardsBlock = buildCardsArticleBlock(grid, document);
      if (labelText && cardsBlock) {
        cells.push([labelText, cardsBlock]);
      }
      return;
    }

    // Shape 1 (detail page): content-fragment rich text — existing behavior.
    const contentSource = panel.querySelector('.cmp-contentfragment__elements')
      || panel.querySelector('.contentfragment')
      || panel;

    // Collect meaningful content nodes (paragraphs, lists, images, headings),
    // skipping empty AEM grid scaffolding wrappers.
    const contentCell = [];
    const nodes = Array.from(
      contentSource.querySelectorAll('p, ul, ol, img, h1, h2, h3, h4, h5, h6'),
    );
    nodes.forEach((node) => {
      // Skip empty paragraphs.
      if ((node.tagName === 'P') && !node.textContent.trim() && !node.querySelector('img')) {
        return;
      }
      contentCell.push(node);
    });

    // Only emit a tab row when we have a label and some content.
    if (labelText && contentCell.length) {
      cells.push([labelText, contentCell]);
    }
  });

  // Empty-block guard: nothing extractable → unwrap in place.
  if (!cells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'tabs-detail', cells });
  element.replaceWith(block);
}

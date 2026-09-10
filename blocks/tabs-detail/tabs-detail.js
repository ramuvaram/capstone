// eslint-disable-next-line import/no-unresolved
import { toClassName, decorateBlock, loadBlock } from '../../scripts/aem.js';

/**
 * A block nested inside a tab panel arrives as a raw <table> (EDS only converts
 * top-level block tables to divs server-side). Convert each nested table into the
 * EDS block <div> structure, then decorate + load it so its own JS/CSS run.
 * @param {Element} panel The tab panel that may contain nested block tables
 */
async function decorateNestedBlocks(panel) {
  const tables = panel.querySelectorAll('table');
  await Promise.all([...tables].map(async (table) => {
    const headerText = table.querySelector('thead th, thead td')?.textContent || '';
    const blockName = toClassName(headerText.trim());
    if (!blockName) return;

    const blockEl = document.createElement('div');
    blockEl.classList.add(blockName);
    table.querySelectorAll('tbody > tr').forEach((tr) => {
      const rowEl = document.createElement('div');
      [...tr.children].forEach((cell) => {
        const cellEl = document.createElement('div');
        cellEl.append(...cell.childNodes);
        rowEl.append(cellEl);
      });
      blockEl.append(rowEl);
    });

    // wrap so decorateBlock's `-wrapper`/`-container` class logic has a parent
    const wrapper = document.createElement('div');
    wrapper.append(blockEl);
    table.replaceWith(wrapper);

    decorateBlock(blockEl);
    await loadBlock(blockEl);
  }));
}

export default async function decorate(block) {
  // build tablist
  const tablist = document.createElement('div');
  tablist.className = 'tabs-detail-list';
  tablist.setAttribute('role', 'tablist');

  // decorate tabs and tabpanels
  const tabs = [...block.children].map((child) => child.firstElementChild);
  tabs.forEach((tab, i) => {
    const id = toClassName(tab.textContent);

    // decorate tabpanel
    const tabpanel = block.children[i];
    tabpanel.className = 'tabs-detail-panel';
    tabpanel.id = `tabpanel-${id}`;
    tabpanel.setAttribute('aria-hidden', !!i);
    tabpanel.setAttribute('aria-labelledby', `tab-${id}`);
    tabpanel.setAttribute('role', 'tabpanel');

    // build tab button
    const button = document.createElement('button');
    button.className = 'tabs-detail-tab';
    button.id = `tab-${id}`;
    button.innerHTML = tab.innerHTML;

    button.setAttribute('aria-controls', `tabpanel-${id}`);
    button.setAttribute('aria-selected', !i);
    button.setAttribute('role', 'tab');
    button.setAttribute('type', 'button');
    button.addEventListener('click', () => {
      block.querySelectorAll('[role=tabpanel]').forEach((panel) => {
        panel.setAttribute('aria-hidden', true);
      });
      tablist.querySelectorAll('button').forEach((btn) => {
        btn.setAttribute('aria-selected', false);
      });
      tabpanel.setAttribute('aria-hidden', false);
      button.setAttribute('aria-selected', true);
    });
    tablist.append(button);
    tab.remove();
  });

  block.prepend(tablist);

  // decorate any blocks nested inside tab panels (e.g. a cards-article grid)
  await Promise.all(
    [...block.querySelectorAll('.tabs-detail-panel')].map((panel) => decorateNestedBlocks(panel)),
  );
}

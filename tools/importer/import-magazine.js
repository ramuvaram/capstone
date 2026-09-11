/* eslint-disable */
/* global WebImporter */

// TRANSFORMER IMPORTS (no block parsers — magazine articles are all default content)
import cleanupTransformer from './transformers/wknd-cleanup.js';
import sectionsTransformer from './transformers/wknd-sections.js';

// PAGE TEMPLATE CONFIGURATION - Embedded from page-templates.json
const PAGE_TEMPLATE = {
  name: 'magazine',
  description: 'WKND magazine article detail: lead image, title + byline + rich body, author credit, and a share/related-stories sidebar. All default content, no blocks.',
  urls: [
    'https://wknd.site/us/en/magazine/arctic-surfing.html',
    'https://wknd.site/us/en/magazine/guide-la-skateparks.html',
    'https://wknd.site/us/en/magazine/san-diego-surf.html',
    'https://wknd.site/us/en/magazine/ski-touring.html',
    'https://wknd.site/us/en/magazine/western-australia.html',
  ],
  blocks: [],
  sections: [
    {
      id: 's1', name: 'Lead image', selector: ['.image.aem-GridColumn'], style: null, blocks: [], defaultContent: ['.image.aem-GridColumn'],
    },
    {
      id: 's2', name: 'Breadcrumb', selector: ['.breadcrumb.aem-GridColumn'], style: null, blocks: [], defaultContent: ['.breadcrumb.aem-GridColumn'],
    },
    {
      id: 's3', name: 'Article body', selector: ['main.container.responsivegrid.cmp-layout-container--fixed'], style: null, blocks: [], defaultContent: ['.cmp-title__text', '.cmp-text'],
    },
    {
      id: 's4', name: 'Author byline', selector: ['.experiencefragment'], style: null, blocks: [], defaultContent: ['.experiencefragment'],
    },
    {
      id: 's5', name: 'Share and related stories', selector: ['aside.cmp-layoutcontainer--sidebar', '.cmp-layoutcontainer--sidebar'], style: null, blocks: [], defaultContent: ['.cmp-title__text'],
    },
  ],
};

// No parsers — this template has no blocks.
const parsers = {};

// TRANSFORMER REGISTRY
const transformers = [
  cleanupTransformer,
  ...(PAGE_TEMPLATE.sections && PAGE_TEMPLATE.sections.length > 1 ? [sectionsTransformer] : []),
];

/**
 * Execute all page transformers for a specific hook
 */
function executeTransformers(hookName, element, payload) {
  const enhancedPayload = {
    ...payload,
    template: PAGE_TEMPLATE,
  };

  transformers.forEach((transformerFn) => {
    try {
      transformerFn.call(null, hookName, element, enhancedPayload);
    } catch (e) {
      console.error(`Transformer failed at ${hookName}:`, e);
    }
  });
}

/**
 * Find all blocks on the page based on the embedded template configuration
 */
function findBlocksOnPage(document, template) {
  const pageBlocks = [];
  template.blocks.forEach((blockDef) => {
    blockDef.instances.forEach((selector) => {
      document.querySelectorAll(selector).forEach((element) => {
        pageBlocks.push({
          name: blockDef.name, selector, element, section: blockDef.section || null,
        });
      });
    });
  });
  return pageBlocks;
}

// EXPORT DEFAULT CONFIGURATION
export default {
  transform: (payload) => {
    const { document, url, params } = payload;

    const main = document.body;

    // 1. beforeTransform (initial cleanup)
    executeTransformers('beforeTransform', main, payload);

    // 2. Find + parse blocks (none for magazine, but keep the shape uniform)
    const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);
    pageBlocks.forEach((block) => {
      if (!block.element.parentNode) return;
      const parser = parsers[block.name];
      if (parser) {
        try {
          parser(block.element, { document, url, params });
        } catch (e) {
          console.error(`Failed to parse ${block.name} (${block.selector}):`, e);
        }
      }
    });

    // 3. afterTransform (final cleanup + section breaks/metadata)
    executeTransformers('afterTransform', main, payload);

    // 4. WebImporter built-in rules
    const hr = document.createElement('hr');
    main.appendChild(hr);
    WebImporter.rules.createMetadata(main, document);
    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

    // 5. Generate sanitized path (map root URL to /index)
    const rawPath = new URL(params.originalURL).pathname
      .replace(/\/$/, '')
      .replace(/\.html?$/, '');
    const path = WebImporter.FileUtils.sanitizePath(rawPath === '' ? '/index' : rawPath);

    return [{
      element: main,
      path,
      report: {
        title: document.title,
        template: PAGE_TEMPLATE.name,
        blocks: pageBlocks.map((b) => b.name),
      },
    }];
  },
};

/* eslint-disable */
var CustomImportScript = (() => {
  var __defProp = Object.defineProperty;
  var __defProps = Object.defineProperties;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // tools/importer/import-adventures-2.js
  var import_adventures_2_exports = {};
  __export(import_adventures_2_exports, {
    default: () => import_adventures_2_default
  });

  // tools/importer/parsers/hero-banner.js
  function parse(element, { document: document2 }) {
    const bgImage = element.querySelector(".cmp-teaser__image img, .cmp-image img, img");
    const contentCell = [];
    const heading = element.querySelector(".cmp-teaser__title, h1, h2, h3");
    if (heading) contentCell.push(heading);
    const description = element.querySelector('.cmp-teaser__description, [class*="description"], p');
    if (description) contentCell.push(description);
    const ctaLinks = Array.from(
      element.querySelectorAll(".cmp-teaser__action-link, .cmp-teaser__action-container a, a.button")
    );
    ctaLinks.forEach((cta) => contentCell.push(cta));
    if (!bgImage && !contentCell.length) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const cells = [];
    if (bgImage) cells.push([bgImage]);
    cells.push([contentCell]);
    const block = WebImporter.Blocks.createBlock(document2, { name: "hero-banner", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/tabs-detail.js
  function buildCardsArticleBlock(grid, document2) {
    const items = Array.from(grid.querySelectorAll(".cmp-image-list__item, li"));
    const cardCells = [];
    items.forEach((item) => {
      const img = item.querySelector(".cmp-image-list__item-image img, .cmp-image img, img");
      const textCell = [];
      const titleLink = item.querySelector("a.cmp-image-list__item-title-link");
      const titleSpan = item.querySelector(".cmp-image-list__item-title, h1, h2, h3, h4");
      if (titleLink) {
        textCell.push(titleLink);
      } else if (titleSpan) {
        textCell.push(titleSpan);
      }
      const description = item.querySelector('.cmp-image-list__item-description, [class*="description"], p');
      if (description) textCell.push(description);
      if (img || textCell.length) {
        cardCells.push([img || "", textCell]);
      }
    });
    if (!cardCells.length) return null;
    return WebImporter.Blocks.createBlock(document2, { name: "cards-article", cells: cardCells });
  }
  function parse2(element, { document: document2 }) {
    const tabs = Array.from(element.querySelectorAll(".cmp-tabs__tab"));
    const panels = Array.from(element.querySelectorAll(".cmp-tabs__tabpanel"));
    const cells = [];
    tabs.forEach((tab, index) => {
      const panel = panels[index];
      if (!panel) return;
      const labelText = (tab.textContent || "").trim();
      const grid = panel.querySelector(".image-list.list, .cmp-image-list");
      if (grid) {
        const cardsBlock = buildCardsArticleBlock(grid, document2);
        if (labelText && cardsBlock) {
          cells.push([labelText, cardsBlock]);
        }
        return;
      }
      const contentSource = panel.querySelector(".cmp-contentfragment__elements") || panel.querySelector(".contentfragment") || panel;
      const contentCell = [];
      const nodes = Array.from(
        contentSource.querySelectorAll("p, ul, ol, img, h1, h2, h3, h4, h5, h6")
      );
      nodes.forEach((node) => {
        if (node.tagName === "P" && !node.textContent.trim() && !node.querySelector("img")) {
          return;
        }
        contentCell.push(node);
      });
      if (labelText && contentCell.length) {
        cells.push([labelText, contentCell]);
      }
    });
    if (!cells.length) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const block = WebImporter.Blocks.createBlock(document2, { name: "tabs-detail", cells });
    element.replaceWith(block);
  }

  // tools/importer/transformers/wknd-cleanup.js
  var TransformHook = { beforeTransform: "beforeTransform", afterTransform: "afterTransform" };
  function transform(hookName, element, payload) {
    if (hookName === TransformHook.beforeTransform) {
      WebImporter.DOMUtils.remove(element, [
        "#destination_publishing_iframe_wkndsite_0",
        "iframe"
      ]);
    }
    if (hookName === TransformHook.afterTransform) {
      WebImporter.DOMUtils.remove(element, [
        "header.experiencefragment.cmp-experiencefragment--header",
        "footer.experiencefragment.cmp-experiencefragment--footer",
        "#toggleNav",
        "#mobileNav"
      ]);
      element.querySelectorAll(".cmp-image meta, meta").forEach((el) => el.remove());
    }
  }

  // tools/importer/transformers/wknd-sections.js
  var SECTION_MARKER_ATTR = "data-excat-section-id";
  function querySection(root, selectors) {
    for (const sel of selectors) {
      const el = root.querySelector(sel);
      if (el) return el;
    }
    return null;
  }
  function transform2(hookName, element, payload) {
    const sections = payload.template && payload.template.sections || [];
    if (hookName === "beforeTransform") {
      for (let i = sections.length - 1; i >= 0; i -= 1) {
        const section = sections[i];
        if (i === 0 && !section.style) continue;
        const sectionEl = querySection(element, section.selector);
        if (!sectionEl) continue;
        const hr = document.createElement("hr");
        if (section.style) hr.setAttribute(SECTION_MARKER_ATTR, section.id);
        sectionEl.before(hr);
      }
    }
    if (hookName === "afterTransform") {
      for (let i = sections.length - 1; i >= 0; i -= 1) {
        const section = sections[i];
        if (!section.style) continue;
        const marker = element.querySelector(`[${SECTION_MARKER_ATTR}="${section.id}"]`);
        const anchor = marker || querySection(element, section.selector);
        if (!anchor) continue;
        const metadataBlock = WebImporter.Blocks.createBlock(document, {
          name: "Section Metadata",
          cells: { style: section.style }
        });
        anchor.after(metadataBlock);
        if (marker) {
          marker.removeAttribute(SECTION_MARKER_ATTR);
          if (i === 0) marker.remove();
        }
      }
    }
  }

  // tools/importer/import-adventures-2.js
  var PAGE_TEMPLATE = {
    name: "adventures-2",
    description: "WKND adventures listing page: hero promo banner and a tabbed category filter with adventure card grids.",
    urls: [
      "https://wknd.site/us/en/adventures.html"
    ],
    blocks: [
      {
        name: "hero-banner",
        instances: [".teaser.cmp-teaser--hero"]
      },
      {
        name: "tabs-detail",
        instances: [".tabs.panelcontainer"]
      }
    ],
    sections: [
      {
        id: "s1",
        name: "Hero",
        selector: [".teaser.cmp-teaser--hero"],
        style: null,
        blocks: ["hero-banner"],
        defaultContent: []
      },
      {
        id: "s2",
        name: "Current Adventures",
        selector: ["main.container.responsivegrid.cmp-layout-container--fixed"],
        style: null,
        blocks: ["tabs-detail"],
        defaultContent: [".title.cmp-title--underline"]
      }
    ]
  };
  var parsers = {
    "hero-banner": parse,
    "tabs-detail": parse2
  };
  var transformers = [
    transform,
    ...PAGE_TEMPLATE.sections && PAGE_TEMPLATE.sections.length > 1 ? [transform2] : []
  ];
  function executeTransformers(hookName, element, payload) {
    const enhancedPayload = __spreadProps(__spreadValues({}, payload), {
      template: PAGE_TEMPLATE
    });
    transformers.forEach((transformerFn) => {
      try {
        transformerFn.call(null, hookName, element, enhancedPayload);
      } catch (e) {
        console.error(`Transformer failed at ${hookName}:`, e);
      }
    });
  }
  function findBlocksOnPage(document2, template) {
    const pageBlocks = [];
    template.blocks.forEach((blockDef) => {
      blockDef.instances.forEach((selector) => {
        const elements = document2.querySelectorAll(selector);
        if (elements.length === 0) {
          console.warn(`Block "${blockDef.name}" selector not found: ${selector}`);
        }
        elements.forEach((element) => {
          pageBlocks.push({
            name: blockDef.name,
            selector,
            element,
            section: blockDef.section || null
          });
        });
      });
    });
    console.log(`Found ${pageBlocks.length} block instances on page`);
    return pageBlocks;
  }
  var import_adventures_2_default = {
    transform: (payload) => {
      const { document: document2, url, params } = payload;
      const main = document2.body;
      executeTransformers("beforeTransform", main, payload);
      const pageBlocks = findBlocksOnPage(document2, PAGE_TEMPLATE);
      pageBlocks.forEach((block) => {
        if (!block.element.parentNode) return;
        const parser = parsers[block.name];
        if (parser) {
          try {
            parser(block.element, { document: document2, url, params });
          } catch (e) {
            console.error(`Failed to parse ${block.name} (${block.selector}):`, e);
          }
        } else {
          console.warn(`No parser found for block: ${block.name}`);
        }
      });
      executeTransformers("afterTransform", main, payload);
      const hr = document2.createElement("hr");
      main.appendChild(hr);
      WebImporter.rules.createMetadata(main, document2);
      WebImporter.rules.transformBackgroundImages(main, document2);
      WebImporter.rules.adjustImageUrls(main, url, params.originalURL);
      const rawPath = new URL(params.originalURL).pathname.replace(/\/$/, "").replace(/\.html?$/, "");
      const path = WebImporter.FileUtils.sanitizePath(rawPath === "" ? "/index" : rawPath);
      return [{
        element: main,
        path,
        report: {
          title: document2.title,
          template: PAGE_TEMPLATE.name,
          blocks: pageBlocks.map((b) => b.name)
        }
      }];
    }
  };
  return __toCommonJS(import_adventures_2_exports);
})();

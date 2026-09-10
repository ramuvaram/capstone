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

  // tools/importer/import-about-us.js
  var import_about_us_exports = {};
  __export(import_about_us_exports, {
    default: () => import_about_us_default
  });

  // tools/importer/parsers/cards-contributor.js
  function isContributorSection(node) {
    return !!node && node.nodeType === 1 && node.classList && node.classList.contains("experiencefragment") && node.classList.contains("cmp-experience-fragment--contributor");
  }
  function buildCardRow(section, document2) {
    const img = section.querySelector(".cmp-image img, img");
    const bodyCell = [];
    const titles = Array.from(section.querySelectorAll(".cmp-title__text"));
    const nameEl = titles[0];
    const roleEl = titles[1];
    if (nameEl) bodyCell.push(nameEl);
    if (roleEl) bodyCell.push(roleEl);
    const anchors = Array.from(section.querySelectorAll("a.cmp-button"));
    const seen = /* @__PURE__ */ new Set();
    anchors.forEach((anchor) => {
      const href = anchor.getAttribute("href");
      if (!href || seen.has(anchor)) return;
      seen.add(anchor);
      let label = "";
      const icon = anchor.querySelector('[class*="cmp-button__icon--"]');
      if (icon) {
        const match = Array.from(icon.classList).find((c) => c.startsWith("cmp-button__icon--"));
        if (match) {
          const key = match.replace("cmp-button__icon--", "");
          label = key.charAt(0).toUpperCase() + key.slice(1);
        }
      }
      if (!label) {
        const txt = anchor.querySelector(".cmp-button__text");
        label = (txt ? txt.textContent : anchor.textContent || "").trim();
      }
      const link = document2.createElement("a");
      link.setAttribute("href", href);
      link.textContent = label || href;
      const wrapper = document2.createElement("p");
      wrapper.append(link);
      bodyCell.push(wrapper);
    });
    return [img || "", bodyCell];
  }
  function parse(element, { document: document2 }) {
    if (isContributorSection(element.previousElementSibling)) {
      return;
    }
    const run = [element];
    let next = element.nextElementSibling;
    while (isContributorSection(next)) {
      run.push(next);
      next = next.nextElementSibling;
    }
    const cells = [];
    run.forEach((section) => {
      const row = buildCardRow(section, document2);
      if (row[0] || Array.isArray(row[1]) && row[1].length) {
        cells.push(row);
      }
    });
    if (!cells.length) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const block = WebImporter.Blocks.createBlock(document2, { name: "cards-contributor", cells });
    element.replaceWith(block);
    run.slice(1).forEach((section) => section.remove());
  }

  // tools/importer/parsers/columns-featured.js
  function parse2(element, { document: document2 }) {
    const img = element.querySelector(".cmp-teaser__image img, .cmp-image img, img");
    const textCell = [];
    const eyebrow = element.querySelector('.cmp-teaser__pretitle, [class*="pretitle"], [class*="eyebrow"]');
    if (eyebrow) textCell.push(eyebrow);
    const heading = element.querySelector(".cmp-teaser__title, h1, h2, h3");
    if (heading) textCell.push(heading);
    const description = element.querySelector('.cmp-teaser__description, [class*="description"], p:not([class*="pretitle"])');
    if (description) textCell.push(description);
    const ctaLinks = Array.from(
      element.querySelectorAll(".cmp-teaser__action-link, .cmp-teaser__action-container a, a.button")
    );
    ctaLinks.forEach((cta) => textCell.push(cta));
    if (!img && !textCell.length) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const cells = [[img || "", textCell]];
    const block = WebImporter.Blocks.createBlock(document2, { name: "columns-featured", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/cards-article.js
  function parse3(element, { document: document2 }) {
    const items = Array.from(element.querySelectorAll(".cmp-image-list__item, li"));
    const cells = [];
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
        cells.push([img || "", textCell]);
      }
    });
    if (!cells.length) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const block = WebImporter.Blocks.createBlock(document2, { name: "cards-article", cells });
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

  // tools/importer/import-about-us.js
  var PAGE_TEMPLATE = {
    name: "about-us",
    description: "WKND about-us (contributor grids) and magazine listing (featured article + article grid).",
    urls: [
      "https://wknd.site/us/en/about-us.html",
      "https://wknd.site/us/en/magazine.html"
    ],
    blocks: [
      {
        name: "cards-contributor",
        instances: [".experiencefragment.cmp-experience-fragment--contributor"]
      },
      {
        name: "columns-featured",
        instances: [".teaser.cmp-teaser--featured"]
      },
      {
        name: "cards-article",
        instances: [".image-list.list"]
      }
    ],
    sections: [
      {
        id: "s1",
        name: "About / Contributors",
        selector: ["main.container.responsivegrid.cmp-layout-container--fixed"],
        style: null,
        blocks: ["cards-contributor"],
        defaultContent: [".title.cmp-title--underline"]
      }
    ]
  };
  var parsers = {
    "cards-contributor": parse,
    "columns-featured": parse2,
    "cards-article": parse3
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
  var import_about_us_default = {
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
  return __toCommonJS(import_about_us_exports);
})();

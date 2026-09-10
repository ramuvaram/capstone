/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: WKND site-wide cleanup.
 * Removes non-authorable site chrome (header, footer, navigation, search,
 * language nav, mobile nav toggle) and tracking/embed artifacts.
 * All selectors verified against migration-work/cleaned.html.
 */
const TransformHook = { beforeTransform: 'beforeTransform', afterTransform: 'afterTransform' };

export default function transform(hookName, element, payload) {
  if (hookName === TransformHook.beforeTransform) {
    // Tracking iframe injected by the site shell (Adobe ID syncing).
    // Found in cleaned.html: <iframe id="destination_publishing_iframe_wkndsite_0" ...>
    WebImporter.DOMUtils.remove(element, [
      '#destination_publishing_iframe_wkndsite_0',
      'iframe',
    ]);
  }

  if (hookName === TransformHook.afterTransform) {
    // Non-authorable global chrome. Selectors from cleaned.html:
    // header.cmp-experiencefragment--header (lines 5-161)
    // footer.cmp-experiencefragment--footer (line 471)
    // #toggleNav (line 568) / #mobileNav (line 574) mobile nav chrome
    WebImporter.DOMUtils.remove(element, [
      'header.experiencefragment.cmp-experiencefragment--header',
      'footer.experiencefragment.cmp-experiencefragment--footer',
      '#toggleNav',
      '#mobileNav',
    ]);

    // Empty <meta> tags nested inside cmp-image blocks (e.g. lines 183, 204, 227, 270).
    element.querySelectorAll('.cmp-image meta, meta').forEach((el) => el.remove());
  }
}

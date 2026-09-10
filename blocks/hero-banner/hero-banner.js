export default function decorate(block) {
  if (!block.querySelector(':scope > div:first-child picture')) {
    block.classList.add('no-image');
  }

  // wrap the text cell (heading + paragraph + CTA) in an overlay content card
  const rows = [...block.children];
  rows.forEach((row) => {
    [...row.children].forEach((cell) => {
      if (!cell.querySelector('picture') && cell.textContent.trim()) {
        cell.classList.add('hero-banner-content');
      }
    });
  });
}

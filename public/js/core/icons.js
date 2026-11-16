// Inline SVG icons from the sprite in /img/icons.svg (Lucide, ISC License).
export const icon = (name, cls = '') =>
  `<svg class="icon ${cls}" aria-hidden="true" focusable="false"><use href="/img/icons.svg#i-${name}"></use></svg>`;

'use client';

import { useEffect } from 'react';

/**
 * Copies each column header's text onto the matching cell as `data-label`.
 * On phones the stylesheet turns tables into stacked cards and prints that label beside every value,
 * so every admin table becomes readable without scrolling sideways and without editing each page.
 */
function label(root: ParentNode) {
  root.querySelectorAll('table').forEach((table) => {
    const heads = Array.from(table.querySelectorAll('thead th')).map((th) => (th.textContent ?? '').trim());
    if (heads.length === 0) return;
    table.querySelectorAll('tbody tr').forEach((tr) => {
      Array.from(tr.children).forEach((td, i) => {
        const text = heads[i] ?? '';
        if (td.getAttribute('data-label') !== text) td.setAttribute('data-label', text);
      });
    });
  });
}

export function TableLabels() {
  useEffect(() => {
    let frame = 0;
    const run = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => label(document));
    };
    run();
    const observer = new MutationObserver(run);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);
  return null;
}

'use client';

import { X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';

type RightDrawerProps = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** Wider drawer for dense forms (default 420). */
  width?: number | string;
  /** Optional id for aria-labelledby */
  labelledBy?: string;
};

/**
 * Standard Archer admin right slide-over for Add / View / Edit CRUD.
 * Keeps the list/page context visible behind a dimmed scrim (ADR-011 pattern).
 */
export function RightDrawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = 440,
  labelledBy = 'right-drawer-title',
}: RightDrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  const widthCss = typeof width === 'number' ? `${width}px` : width;

  return (
    <div
      className="fixed inset-0 z-[100] flex justify-end bg-black/40 backdrop-blur-[1px]"
      role="presentation"
      onClick={onClose}
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className="flex h-full w-full flex-col border-l border-[var(--border)] bg-[var(--surface)] shadow-2xl animate-in slide-in-from-right duration-200"
        style={{ maxWidth: widthCss }}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
          <div className="min-w-0">
            <h2 id={labelledBy} className="m-0 text-[1.05rem] font-semibold leading-tight text-[var(--text)]">
              {title}
            </h2>
            {subtitle ? (
              <div className="mt-1 text-xs text-[var(--muted)]">{subtitle}</div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="icon-btn shrink-0 text-[var(--muted)] hover:text-[var(--text)]"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {footer ? (
          <footer className="shrink-0 border-t border-[var(--border)] px-5 py-3">{footer}</footer>
        ) : null}
      </aside>
    </div>
  );
}

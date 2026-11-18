import type { ReadonlyURLSearchParams } from 'next/navigation';

type SearchParamsLike = URLSearchParams | ReadonlyURLSearchParams;

/**
 * Replace (or remove) the `id` query param without adding history entries.
 * Preserves other query params. No-ops when the URL already matches.
 */
export function replaceDrawerId(
  router: { replace: (href: string, options?: { scroll?: boolean }) => void },
  pathname: string,
  searchParams: SearchParamsLike,
  id: string | null,
): void {
  const params = new URLSearchParams(searchParams.toString());
  if (id) {
    if (params.get('id') === id) return;
    params.set('id', id);
  } else {
    if (!params.has('id')) return;
    params.delete('id');
  }
  const qs = params.toString();
  router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
}

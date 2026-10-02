// ---- The slice's page parameters, from the query (`?iso&hairgrid`) or, where a page cannot take a query (an
// embedded or shared build, which sets window.__ISO_BOOT), from the hash (`#iso&hairgrid`); `go` moves between them.
export const params = () => new URLSearchParams(location.search || location.hash.replace(/^#/, '') || (typeof window !== 'undefined' && window.__ISO_DEFAULT) || '');
export function go(q) { const s = q.toString().replace(/=(&|$)/g, '$1'); if (location.search) location.search = s; else { location.hash = s; location.reload(); } }

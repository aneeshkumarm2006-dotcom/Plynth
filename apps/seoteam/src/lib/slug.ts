// Client-side slug preview. Mirrors the server's slugify (api/_postInput.ts);
// the server is authoritative, this is just for the live editor field.
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

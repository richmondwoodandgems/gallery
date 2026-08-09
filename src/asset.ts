/** Manifest paths are stored relative so the site works at any base path. */
export function asset(relativePath: string): string {
  return `${import.meta.env.BASE_URL}${relativePath}`;
}

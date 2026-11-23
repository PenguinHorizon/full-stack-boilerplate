/** `%`, `_` and `\` are wildcards/escapes in LIKE; user search terms must not be. */
export function escapeLike(term: string): string {
  return term.replace(/[\\%_]/g, (char) => `\\${char}`);
}

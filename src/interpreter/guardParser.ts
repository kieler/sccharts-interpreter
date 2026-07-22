export function parseGuard(
  guard: string,
  variables: Map<string, unknown>,
): boolean {
  if (!guard || guard.trim() === "") return true;

  const keys = Array.from(variables.keys());
  const values = Array.from(variables.values());

  const fn = new Function(...keys, `return (${guard})`);
  return fn(...values);
}

export function parseGuard(
  guard: string,
  variables: Map<string, unknown>,
): boolean {
  if (!guard || guard.trim() === "") {
    return true;
  }

  const variablesSortedByLength = Array.from(variables.entries()).sort(
    (a, b) => b[0].length - a[0].length,
  );

  let epxression = guard;
  for (const [name, value] of variablesSortedByLength) {
    epxression = epxression.replaceAll(name, value as string);
  }

  return eval(epxression);
}

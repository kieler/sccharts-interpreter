function infixToAssignment(expr: string): string {
  // Turns something like A+=1 into A=A+1 for the eval() function
  return expr.replace(
    /([A-Za-z_]\w*)\s*([\+\-\*\/\%\&\|\^~\?]=)\s*(.*)/,
    (match, variable: string, op: string, rhs: string) => {
      const baseOp = op.slice(0, -1); // strip '='
      return `${variable}=${variable}${baseOp} ${rhs}`;
    },
  );
}

export function parseAction(
  action: string,
  variables: Map<string, unknown>,
): void {
  if (!action || action.trim() === "") {
    return;
  }
  action = action.trim();

  const actions = action.split(";");
  for (let part of actions) {
    part = part.replaceAll("++", "+=1");
    part = part.replaceAll("--", "-=1");
    part = infixToAssignment(part);

    let [variable, expression] = part.split("=");

    for (const [name, value] of Array.from(variables.entries()).sort(
      (a, b) => b[0].length - a[0].length,
    )) {
      expression = expression.replaceAll(name, value as string);
    }

    variables.set(variable.trim(), eval(expression));
  }
}

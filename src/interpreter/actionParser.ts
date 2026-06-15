type Token =
	| { type: "VAR"; name: string }
	| { type: "NUMBER"; value: number }
	| { type: "STRING"; value: string }
	| { type: "BOOL"; value: boolean }
	| { type: "EQ" }
	| { type: "SEMI" };

function tokenize(action: string): Token[] {
	const tokens: Token[] = [];
	let i = 0;

	while (i < action.length) {
		const char = action[i];

		// Skip whitespace
		if (/\s/.test(char)) {
			i++;
			continue;
		}

		// Equals sign
		if (char === "=") {
			tokens.push({ type: "EQ" });
			i++;
			continue;
		}

		// Semicolon
		if (char === ";") {
			tokens.push({ type: "SEMI" });
			i++;
			continue;
		}

		// String literal (double quotes)
		if (char === '"') {
			let value = "";
			i++; // skip opening quote
			while (i < action.length && action[i] !== '"') {
				value += action[i];
				i++;
			}
			i++; // skip closing quote
			tokens.push({ type: "STRING", value });
			continue;
		}

		// String literal (single quotes)
		if (char === "'") {
			let value = "";
			i++; // skip opening quote
			while (i < action.length && action[i] !== "'") {
				value += action[i];
				i++;
			}
			i++; // skip closing quote
			tokens.push({ type: "STRING", value });
			continue;
		}

		// Number literal (integer or float, positive or negative)
		if (char === "-" || /[0-9]/.test(char)) {
			let numStr = "";
			if (char === "-") {
				numStr += char;
				i++;
			}
			while (i < action.length && /[0-9]/.test(action[i])) {
				numStr += action[i];
				i++;
			}
			if (i < action.length && action[i] === ".") {
				numStr += ".";
				i++;
				while (i < action.length && /[0-9]/.test(action[i])) {
					numStr += action[i];
					i++;
				}
			}
			tokens.push({ type: "NUMBER", value: Number(numStr) });
			continue;
		}

		// Boolean literal - check for "true" or "false"
		if (/[a-zA-Z]/.test(char)) {
			let name = "";
			while (i < action.length && /[a-zA-Z0-9_]/.test(action[i])) {
				name += action[i];
				i++;
			}

			if (name === "true") {
				tokens.push({ type: "BOOL", value: true });
			} else if (name === "false") {
				tokens.push({ type: "BOOL", value: false });
			} else {
				tokens.push({ type: "VAR", name });
			}
			continue;
		}

		throw new Error(`Unexpected character in action expression: '${char}'`);
	}

	return tokens;
}

export function parseAction(
	action: string,
	variables: Map<string, unknown>,
): void {
	if (!action || action.trim() === "") {
		return;
	}

	const tokens = tokenize(action);
	let pos = 0;

	function peek(): Token | undefined {
		return tokens[pos];
	}

	function consume(): Token {
		const token = tokens[pos];
		if (!token) {
			throw new Error("Unexpected end of action expression");
		}
		pos++;
		return token;
	}

	// ActionExpr -> Assignment ( ';' Assignment )* | EOF
	function parseActionList() {
		parseAssignment();
		while (peek()) {
			const token = peek();
			if (!token || token.type !== "SEMI") break;
			consume();
			parseAssignment();
		}
	}

	// Assignment -> VAR '=' ValueExpr
	function parseAssignment() {
		const leftToken = consume();
		if (leftToken.type !== "VAR") {
			throw new Error(
				`Expected variable name, got '${JSON.stringify(leftToken)}'`,
			);
		}

		const eqToken = peek();
		if (!eqToken || eqToken.type !== "EQ") {
			throw new Error(`Expected '=' after variable '${leftToken.name}'`);
		}
		consume();

		const valueToken = consume();
		let value: unknown;

		switch (valueToken.type) {
			case "BOOL":
				value = valueToken.value;
				break;
			case "NUMBER":
				value = valueToken.value;
				break;
			case "STRING":
				value = valueToken.value;
				break;
			default:
				throw new Error(
					`Unexpected token in assignment: '${JSON.stringify(valueToken)}'`,
				);
		}

		variables.set(leftToken.name, value);
	}

	parseActionList();
}

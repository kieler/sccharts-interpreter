import type { Context } from "./types.js";
import { Severity } from "./types.js";

export interface Message {
  severity: Severity;
  text: string;
}

let messages: Message[] = [];

export function raise(
  context: Context,
  severity: Severity,
  text: string,
): void {
  messages.push({ severity, text });
  context.messages.push({ severity, text });

  const prefix = severity === Severity.Warning ? "[WARNING]" : "[ERROR]";
  const output = `${prefix}: ${text}`;

  if (context.errorMode === "warnings-only") {
    console.log(output.replace("[ERROR]", "[WARNING]"));
  } else if (severity === Severity.Error) {
    console.error(output);
    throw new Error(text);
  } else {
    console.log(output);
  }
}

export function getMessages(): Message[] {
  return messages;
}
export function clearMessages(): void {
  messages = [];
}

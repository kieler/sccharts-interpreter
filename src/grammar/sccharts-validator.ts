import type { ValidationAcceptor, ValidationChecks } from "langium";
import type { SCChartsAstType } from "./generated/ast.js";
import type { ScChartsServices } from "./sccharts-module.js";

/**
 * Register custom validation checks.
 */
export function registerValidationChecks(services: ScChartsServices) {
  const registry = services.validation.ValidationRegistry;
  const validator = services.validation.ScChartsValidator;
  const checks: ValidationChecks<SCChartsAstType> = {
    // Person: validator.checkPersonStartsWithCapital,
  };
  registry.register(checks, validator);
}

/**
 * Implementation of custom validations.
 */
export class ScChartsValidator {
  // checkPersonStartsWithCapital(person: Person, accept: ValidationAcceptor): void {
  //     if (person.name) {
  //         const firstChar = person.name.substring(0, 1);
  //         if (firstChar.toUpperCase() !== firstChar) {
  //             accept('warning', 'Person name should start with a capital.', { node: person, property: 'name' });
  //         }
  //     }
  // }
}

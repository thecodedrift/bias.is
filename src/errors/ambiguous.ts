import { UserError } from "./core.js";

export class AmbiguousBiasError extends UserError {
  constructor(bias: string, results: string[]) {
    super(
      `Bias ${bias} is ambiguous. We actually have ${results.join(", ")}. Try using /search first to get the exact string you need`
    );
  }
}

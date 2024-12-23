import { UserError } from "./core.js";

export class BiasNotFoundError extends UserError {
  constructor(bias: string) {
    if (bias.startsWith("<")) {
      super("Bias names can be added as-is without the < and > symbols");
    }

    super(`Bias ${bias} not found. Try doing /search first`);
  }
}
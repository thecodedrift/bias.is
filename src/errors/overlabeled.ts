import { UserError } from "./core.js";

export class TooManyLabelsError extends UserError {
  constructor(bias: string) {
    super(`You've got too many biases already! (I know, I wanted more too). You'll need to /reset to remove one before you can add ${bias}`);
  }
}

export class TooManyUlts extends UserError {
  constructor() {
    super(`I know it's hard to choose, but you can only have one ult. Use /reset to clear it first`);
  }
}
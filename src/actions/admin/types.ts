import type { ActionHandler } from "../action.js";

export type AdminActionHandler = ActionHandler<{
  arguments: string;
}>;

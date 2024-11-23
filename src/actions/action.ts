import { ChatMessage, Conversation } from "@skyware/bot";

export type ActionHandler<TOptions = unknown> = (
  message: ChatMessage,
  conversation: Conversation,
  options?: {
    getActions?: () => Action[]
  } & TOptions
) => Promise<void>;

export type Action = {
  match: RegExp;
  cmd: string;
  description: string;
  admin?: boolean;
  handler: ActionHandler;
};

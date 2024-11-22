import { ChatMessage, Conversation } from "@skyware/bot";

export type ActionHandler = (
  message: ChatMessage,
  conversation: Conversation,
  options?: {
    getActions?: () => Action[]
  }
) => Promise<void>;

export type Action = {
  match: RegExp;
  cmd: string;
  description: string;
  admin?: boolean;
  handler: ActionHandler;
};

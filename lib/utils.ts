import { UIMessage } from "ai";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const ABORTED = "User aborted";

const MAX_HISTORY_MESSAGES = 12;

// Redact screenshot base64 data from history to save tokens.
// Always applied — never skip based on last message role.
export const prunedMessages = (messages: UIMessage[]): UIMessage[] => {
  const trimmed =
    messages.length > MAX_HISTORY_MESSAGES
      ? messages.slice(-MAX_HISTORY_MESSAGES)
      : messages;

  return trimmed.map((message) => ({
    ...message,
    parts: message.parts?.map((part) => {
      if (
        part.type === "tool-invocation" &&
        part.toolInvocation.toolName === "computer" &&
        part.toolInvocation.args.action === "screenshot" &&
        part.toolInvocation.state === "result"
      ) {
        return {
          ...part,
          toolInvocation: {
            ...part.toolInvocation,
            result: { type: "text", text: "[screenshot — image data redacted to save tokens]" },
          },
        };
      }
      return part;
    }),
  }));
};

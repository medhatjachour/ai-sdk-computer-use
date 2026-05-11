import { createOpenAI } from "@ai-sdk/openai";
import { streamText, UIMessage } from "ai";
import { killDesktop } from "@/lib/sandbox/utils";
import { bashTool, computerTool } from "@/lib/sandbox/tool";
import { prunedMessages } from "@/lib/utils";

// Groq via its OpenAI-compatible endpoint (avoids ai-sdk version mismatch)
const groq = createOpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

// Allow streaming responses up to 5 minutes
export const maxDuration = 300;

export async function POST(req: Request) {
  const { messages, sandboxId }: { messages: UIMessage[]; sandboxId: string } =
    await req.json();
  try {
    const result = streamText({
      model: groq("meta-llama/llama-4-scout-17b-16e-instruct"),
      system:
        "You are an expert AI agent with full control of a Linux desktop computer. " +
        "You can see the screen, click, type, scroll, drag, and run shell commands — just like a human.\n\n" +
        "TOOLS:\n" +
        "- computer: screenshot | left_click | right_click | double_click | triple_click | middle_click | mouse_move | type | key | hold_key | scroll | left_click_drag | right_click_drag | cursor_position | wait\n" +
        "- bash: run any shell command\n\n" +
        "WORKFLOW:\n" +
        "1. Take a screenshot to see the current screen state.\n" +
        "2. Analyse carefully — identify elements and their pixel positions on the 1024×768 screen.\n" +
        "3. Act, then take another screenshot to verify the result.\n" +
        "4. If something fails, try an alternative approach (keyboard shortcut, bash command, different click target).\n" +
        "5. Repeat until the task is fully complete.\n" +
        "6. Write a final text summary of what you did. Never end on a tool call.\n\n" +
        "TIPS: Chrome is open. Click the address bar to navigate. Click a text field before typing. Use bash for file I/O and system info.",
      messages: prunedMessages(messages),
      tools: { computer: computerTool(sandboxId), bash: bashTool(sandboxId) },
      maxSteps: 25,
    });

    return result.toDataStreamResponse({
      getErrorMessage(error: unknown) {
        console.error(error);
        if (error instanceof Error) return error.message;
        return String(error);
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    await killDesktop(sandboxId);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

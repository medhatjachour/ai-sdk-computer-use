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
      model: groq("llama-3.1-8b-instant"),
      system:
        "You are a helpful assistant with access to a computer desktop. " +
        "Use the computer tool for GUI interactions (always take a screenshot first to see the screen). " +
        "Use the bash tool to run shell commands. Prefer bash when it is simpler. " +
        "Skip browser setup wizards and type URLs directly in the address bar. " +
        "After completing a task or gathering information with tools, ALWAYS write a clear text response summarising what you did and what you found. Do not end with a tool call.",
      messages: prunedMessages(messages),
      tools: { computer: computerTool(sandboxId), bash: bashTool(sandboxId) },
      maxSteps: 10,
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

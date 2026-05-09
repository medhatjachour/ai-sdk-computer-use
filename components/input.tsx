import { ArrowUp, Square } from "lucide-react";
import { Input as ShadcnInput } from "./ui/input";

interface InputProps {
  input: string;
  handleInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  isInitializing: boolean;
  isLoading: boolean;
  status: string;
  stop: () => void;
}

export const Input = ({
  input,
  handleInputChange,
  isInitializing,
  isLoading,
  status,
  stop,
}: InputProps) => {
  const isStreaming = status === "streaming" || status === "submitted";

  return (
    <div className="relative w-full">
      <ShadcnInput
        className="h-11 bg-zinc-50 border-zinc-200 rounded-xl pr-12 text-sm placeholder:text-zinc-400 focus-visible:ring-1 focus-visible:ring-zinc-400"
        value={input}
        autoFocus
        placeholder={isInitializing ? "Initializing desktop…" : "Ask the agent to do something…"}
        onChange={handleInputChange}
        disabled={isLoading || isInitializing}
      />
      {isStreaming ? (
        <button
          type="button"
          onClick={stop}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-full bg-zinc-900 hover:bg-zinc-700 transition-colors"
          title="Stop generation"
        >
          <Square className="h-3 w-3 text-white fill-white" />
        </button>
      ) : (
        <button
          type="submit"
          disabled={isLoading || !input.trim() || isInitializing}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-full bg-zinc-900 hover:bg-zinc-700 disabled:bg-zinc-200 disabled:cursor-not-allowed transition-colors"
          title="Send"
        >
          <ArrowUp className="h-3.5 w-3.5 text-white" />
        </button>
      )}
    </div>
  );
};


import { Globe, FileText, Twitter, Monitor } from "lucide-react";

const suggestions = [
  {
    text: "Latest Vercel blog post",
    prompt: "Go to vercel.com/blog and get the latest post",
    Icon: Globe,
  },
  {
    text: "Create a text file",
    prompt: "Open a text editor and create a new file called notes.txt and write 'we are so back!'",
    Icon: FileText,
  },
  {
    text: "Latest rauchg tweet",
    prompt: "Go to twitter.com/rauchg and get the latest tweet",
    Icon: Twitter,
  },
  {
    text: "What do you see?",
    prompt: "Capture a screenshot of the current screen and tell me what you see",
    Icon: Monitor,
  },
];

export const PromptSuggestions = ({
  submitPrompt,
  disabled,
}: {
  submitPrompt: (prompt: string) => void;
  disabled: boolean;
}) => {
  return (
    <div className="grid grid-cols-2 gap-2 w-full max-w-sm px-1">
      {suggestions.map(({ text, prompt, Icon }, index) => (
        <button
          key={index}
          onClick={() => submitPrompt(prompt)}
          disabled={disabled}
          className="flex items-start gap-2.5 p-3 text-left rounded-xl border border-zinc-100 hover:border-zinc-200 hover:bg-zinc-50 transition-colors group disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <div className="mt-0.5 w-6 h-6 flex items-center justify-center rounded-lg bg-zinc-100 group-hover:bg-zinc-200 transition-colors shrink-0">
            <Icon className="w-3 h-3 text-zinc-600" />
          </div>
          <span className="text-xs text-zinc-700 font-medium leading-tight">{text}</span>
        </button>
      ))}
    </div>
  );
};

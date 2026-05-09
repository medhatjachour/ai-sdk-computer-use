/**
 * Next.js instrumentation hook — runs before any route handler or server action.
 * Used to patch process.env.HOME for Windows compatibility with @vercel/sandbox,
 * which internally uses xdg-app-paths that requires HOME to be defined.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    if (!process.env.HOME) {
      process.env.HOME =
        process.env.USERPROFILE ??
        process.env.HOMEPATH ??
        "C:/Users/medha";
    }
  }
}

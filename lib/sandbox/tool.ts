import { tool } from "ai";
import { z } from "zod";
import { getDesktop } from "./utils";

const wait = async (seconds: number) => {
  await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
};

export const resolution = { x: 1024, y: 768 };

const DISPLAY_ENV = { DISPLAY: ":99" };

// Map key names to X11 keysym names used by xdotool
const keyMap: Record<string, string> = {
  Return: "Return",
  enter: "Return",
  tab: "Tab",
  space: "space",
  backspace: "BackSpace",
  delete: "Delete",
  escape: "Escape",
  up: "Up",
  down: "Down",
  left: "Left",
  right: "Right",
  home: "Home",
  end: "End",
  pageup: "Prior",
  pagedown: "Next",
  f1: "F1",
  f2: "F2",
  f3: "F3",
  f4: "F4",
  f5: "F5",
  f6: "F6",
  f7: "F7",
  f8: "F8",
  f9: "F9",
  f10: "F10",
  f11: "F11",
  f12: "F12",
  shift: "Shift_L",
  control: "Control_L",
  ctrl: "Control_L",
  alt: "Alt_L",
  super: "Super_L",
  meta: "Super_L",
};

function mapKey(key: string): string {
  // Handle modifier combos like "ctrl+c" — xdotool supports this natively
  if (key.includes("+")) {
    return key
      .split("+")
      .map((part) => keyMap[part.toLowerCase()] || part)
      .join("+");
  }
  return keyMap[key.toLowerCase()] || keyMap[key] || key;
}

export const computerTool = (sandboxId: string) =>
  tool({
    description:
      "Control the desktop computer using mouse, keyboard actions and screenshots. " +
      "Always take a screenshot first to see the current state of the screen.",
    parameters: z.object({
      action: z
        .string()
        .describe(
          "The action to perform. Supported: screenshot, left_click, right_click, middle_click, " +
          "double_click, triple_click, mouse_move, type, key, hold_key, scroll, " +
          "left_click_drag, right_click_drag, cursor_position, wait"
        ),
      coordinate: z
        .array(z.number())
        .nullable()
        .optional()
        .describe("Screen [x, y] coordinate for click/move actions, e.g. [512, 400]"),
      text: z
        .string()
        .nullable()
        .optional()
        .describe("Text to type or key name to press (e.g. 'Return', 'ctrl+c')"),
      duration: z
        .number()
        .nullable()
        .optional()
        .describe("Duration in seconds for wait action (max 2)"),
      scroll_direction: z
        .string()
        .nullable()
        .optional()
        .describe("Scroll direction: up, down, left, right"),
      scroll_amount: z
        .number()
        .nullable()
        .optional()
        .describe("Number of scroll clicks"),
      start_coordinate: z
        .array(z.number())
        .nullable()
        .optional()
        .describe("Start [x, y] for drag action, e.g. [100, 200]"),
    }),
    execute: async ({
      action,
      coordinate,
      text,
      duration,
      scroll_amount,
      scroll_direction,
      start_coordinate,
    }) => {
      const sandbox = await getDesktop(sandboxId);

      // Normalise aliases the model may send
      const actionAliases: Record<string, string> = {
        click: "left_click",
        tap: "left_click",
        move: "mouse_move",
        move_mouse: "mouse_move",
        drag: "left_click_drag",
        press: "key",
        press_key: "key",
        keypress: "key",
        input: "type",
        input_text: "type",
        write: "type",
        take_screenshot: "screenshot",
        capture: "screenshot",
        right_drag: "right_click_drag",
        get_cursor: "cursor_position",
        sleep: "wait",
        pause: "wait",
      };
      const normalizedAction = actionAliases[action] ?? action;

      switch (normalizedAction) {
        case "screenshot": {
          await sandbox.runCommand({
            cmd: "bash",
            args: [
              "-c",
              "import -window root -resize '800x600>' -quality 35 /tmp/screenshot.jpg 2>/dev/null || import -window root /tmp/screenshot.jpg",
            ],
            env: DISPLAY_ENV,
          });
          const buffer = await sandbox.readFileToBuffer({
            path: "/tmp/screenshot.jpg",
          });
          if (!buffer) throw new Error("Failed to capture screenshot — display may not be ready");
          return {
            type: "image" as const,
            data: buffer.toString("base64"),
          };
        }
        case "wait": {
          if (!duration) throw new Error("Duration required for wait action");
          const actualDuration = Math.min(duration, 2);
          await wait(actualDuration);
          return {
            type: "text" as const,
            text: `Waited for ${actualDuration} seconds`,
          };
        }
        case "left_click": {
          if (!coordinate)
            throw new Error("Coordinate required for left click action");
          const [x, y] = coordinate as [number, number];
          await sandbox.runCommand({
            cmd: "xdotool",
            args: ["mousemove", "--sync", String(x), String(y), "click", "1"],
            env: DISPLAY_ENV,
          });
          return { type: "text" as const, text: `Left clicked at ${x}, ${y}` };
        }
        case "double_click": {
          if (!coordinate)
            throw new Error("Coordinate required for double click action");
          const [x, y] = coordinate as [number, number];
          await sandbox.runCommand({
            cmd: "xdotool",
            args: [
              "mousemove",
              "--sync",
              String(x),
              String(y),
              "click",
              "--repeat",
              "2",
              "1",
            ],
            env: DISPLAY_ENV,
          });
          return {
            type: "text" as const,
            text: `Double clicked at ${x}, ${y}`,
          };
        }
        case "right_click": {
          if (!coordinate)
            throw new Error("Coordinate required for right click action");
          const [x, y] = coordinate as [number, number];
          await sandbox.runCommand({
            cmd: "xdotool",
            args: ["mousemove", "--sync", String(x), String(y), "click", "3"],
            env: DISPLAY_ENV,
          });
          return {
            type: "text" as const,
            text: `Right clicked at ${x}, ${y}`,
          };
        }
        case "mouse_move": {
          if (!coordinate)
            throw new Error("Coordinate required for mouse move action");
          const [x, y] = coordinate as [number, number];
          await sandbox.runCommand({
            cmd: "xdotool",
            args: ["mousemove", "--sync", String(x), String(y)],
            env: DISPLAY_ENV,
          });
          return { type: "text" as const, text: `Moved mouse to ${x}, ${y}` };
        }
        case "type": {
          if (!text) throw new Error("Text required for type action");
          await sandbox.runCommand({
            cmd: "xdotool",
            args: ["type", "--clearmodifiers", text],
            env: DISPLAY_ENV,
          });
          return { type: "text" as const, text: `Typed: ${text}` };
        }
        case "key": {
          if (!text) throw new Error("Key required for key action");
          const mappedKey = mapKey(text);
          await sandbox.runCommand({
            cmd: "xdotool",
            args: ["key", mappedKey],
            env: DISPLAY_ENV,
          });
          return { type: "text" as const, text: `Pressed key: ${text}` };
        }
        case "scroll": {
          if (!scroll_direction)
            throw new Error("Scroll direction required for scroll action");
          if (!scroll_amount)
            throw new Error("Scroll amount required for scroll action");
          // Button 4 = scroll up, button 5 = scroll down
          const button = scroll_direction === "up" ? "4" : "5";
          await sandbox.runCommand({
            cmd: "xdotool",
            args: ["click", "--repeat", String(scroll_amount), button],
            env: DISPLAY_ENV,
          });
          return {
            type: "text" as const,
            text: `Scrolled ${scroll_direction} by ${scroll_amount}`,
          };
        }
        case "left_click_drag": {
          if (!start_coordinate || !coordinate)
            throw new Error("Coordinates required for drag action");
          const [startX, startY] = start_coordinate as [number, number];
          const [endX, endY] = coordinate as [number, number];
          await sandbox.runCommand({
            cmd: "xdotool",
            args: [
              "mousemove",
              String(startX),
              String(startY),
              "mousedown",
              "1",
              "mousemove",
              "--sync",
              String(endX),
              String(endY),
              "mouseup",
              "1",
            ],
            env: DISPLAY_ENV,
          });
          return {
            type: "text" as const,
            text: `Dragged mouse from ${startX}, ${startY} to ${endX}, ${endY}`,
          };
        }
        case "middle_click": {
          if (!coordinate) throw new Error("Coordinate required for middle click action");
          const [x, y] = coordinate as [number, number];
          await sandbox.runCommand({
            cmd: "xdotool",
            args: ["mousemove", "--sync", String(x), String(y), "click", "2"],
            env: DISPLAY_ENV,
          });
          return { type: "text" as const, text: `Middle clicked at ${x}, ${y}` };
        }
        case "triple_click": {
          if (!coordinate) throw new Error("Coordinate required for triple click action");
          const [x, y] = coordinate as [number, number];
          await sandbox.runCommand({
            cmd: "xdotool",
            args: ["mousemove", "--sync", String(x), String(y), "click", "--repeat", "3", "1"],
            env: DISPLAY_ENV,
          });
          return { type: "text" as const, text: `Triple clicked at ${x}, ${y}` };
        }
        case "hold_key": {
          if (!text) throw new Error("Key required for hold_key action");
          const mappedKey = mapKey(text);
          const holdDuration = Math.min(duration ?? 1, 2);
          await sandbox.runCommand({
            cmd: "xdotool",
            args: ["keydown", mappedKey],
            env: DISPLAY_ENV,
          });
          await wait(holdDuration);
          await sandbox.runCommand({
            cmd: "xdotool",
            args: ["keyup", mappedKey],
            env: DISPLAY_ENV,
          });
          return { type: "text" as const, text: `Held key ${text} for ${holdDuration}s` };
        }
        case "right_click_drag": {
          if (!start_coordinate || !coordinate)
            throw new Error("Coordinates required for right drag action");
          const [startX, startY] = start_coordinate as [number, number];
          const [endX, endY] = coordinate as [number, number];
          await sandbox.runCommand({
            cmd: "xdotool",
            args: [
              "mousemove", String(startX), String(startY),
              "mousedown", "3",
              "mousemove", "--sync", String(endX), String(endY),
              "mouseup", "3",
            ],
            env: DISPLAY_ENV,
          });
          return { type: "text" as const, text: `Right-dragged from ${startX},${startY} to ${endX},${endY}` };
        }
        case "cursor_position": {
          const result = await sandbox.runCommand({
            cmd: "bash",
            args: ["-c", "xdotool getmouselocation --shell"],
            env: DISPLAY_ENV,
          });
          return { type: "text" as const, text: result.stdout ?? "Could not get cursor position" };
        }
        default:
          throw new Error(`Unsupported action: ${normalizedAction} (received: ${action})`);
      }
    },
  });

export const bashTool = (sandboxId?: string) =>
  tool({
    description: "Execute bash commands on the desktop Linux environment",
    parameters: z.object({
      command: z.string().describe("The bash command to execute"),
    }),
    execute: async ({ command }) => {
      const sandbox = await getDesktop(sandboxId);

      try {
        const result = await sandbox.runCommand({
          cmd: "bash",
          args: ["-c", command],
          env: DISPLAY_ENV,
        });
        const stdout = await result.stdout();
        return (
          stdout || "(Command executed successfully with no output)"
        );
      } catch (error) {
        console.error("Bash command failed:", error);
        if (error instanceof Error) {
          return `Error executing command: ${error.message}`;
        } else {
          return `Error executing command: ${String(error)}`;
        }
      }
    },
  });

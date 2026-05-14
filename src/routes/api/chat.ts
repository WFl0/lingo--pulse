import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway";
import { STYLE_PROMPTS, type ResponseStyle } from "@/lib/types";

type ChatRequestBody = {
  messages?: unknown;
  style?: ResponseStyle;
  grammarCorrection?: boolean;
};

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const { messages, style, grammarCorrection } =
          (await request.json()) as ChatRequestBody;

        if (!Array.isArray(messages)) {
          return new Response("Messages are required", { status: 400 });
        }

        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) {
          return new Response("Missing LOVABLE_API_KEY", { status: 500 });
        }

        const styleKey: ResponseStyle = style ?? "friendly";
        const styleText = STYLE_PROMPTS[styleKey] ?? STYLE_PROMPTS.friendly;

        const system = [
          "You are LINGO PULSE, a luxury AI conversation companion.",
          "You only speak English. Even if the user writes in another language, respond in clear, natural English.",
          "Be warm, intelligent, and human — like a thoughtful real person, not a robotic assistant.",
          "Engage in real dialogue: ask follow-up questions, share opinions, and gently push back when the user's reasoning could be sharper.",
          styleText,
          grammarCorrection
            ? "If the user's message contains spelling or grammar mistakes, OR awkward phrasing, gently correct them at the END of your reply in a small section formatted exactly like this:\n\n---\n**Polished version:** <the corrected/polished sentence>\n*Note:* <one short, kind explanation of what changed>\n\nOnly include this section when there is a real improvement to make. Never shame the user."
            : "",
        ]
          .filter(Boolean)
          .join("\n\n");

        const gateway = createLovableAiGatewayProvider(apiKey);
        const model = gateway("google/gemini-3-flash-preview");

        const result = streamText({
          model,
          system,
          messages: await convertToModelMessages(messages as UIMessage[]),
        });

        return result.toUIMessageStreamResponse({
          originalMessages: messages as UIMessage[],
        });
      },
    },
  },
});

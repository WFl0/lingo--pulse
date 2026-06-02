import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway";
import { STYLE_PROMPTS, type ResponseStyle } from "@/lib/types";
import { buildPersonaSystemPrompt, getPersona } from "@/lib/personas";

type ChatRequestBody = {
  messages?: unknown;
  style?: ResponseStyle;
  grammarCorrection?: boolean;
  personaId?: string;
};

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const { messages, style, grammarCorrection, personaId } =
          (await request.json()) as ChatRequestBody;

        if (!Array.isArray(messages)) {
          return new Response("Messages are required", { status: 400 });
        }

        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) {
          return new Response("Missing LOVABLE_API_KEY", { status: 500 });
        }

        const persona = getPersona(personaId);

        let system: string;
        if (persona) {
          system = [
            `You are LINGO PULSE, a warm, witty English tutor.`,
            `You are having a live conversation with ${persona.name} — ${persona.trait}.`,
            `${persona.shortName} is a Saudi English learner who sometimes makes small mistakes.`,
            "",
            "RULES:",
            "- Reply ONLY in clear, natural English. Stay friendly and human.",
            `- Address ${persona.shortName} by name sometimes. Match their energy.`,
            "- Keep replies SHORT: 1–3 sentences. Ask a short follow-up question to keep the chat flowing.",
            "- If their last message contains any spelling, grammar, or awkward phrasing, gently correct it at the END in this exact format:",
            "",
            "---",
            `**Polished version:** <${persona.shortName}'s sentence rewritten in clean natural English>`,
            "*Note:* <one short, kind explanation of what changed>",
            "",
            "- Only include the correction block when there's a real improvement. Skip it entirely if their English is already clean.",
            "- Never break character as the tutor. Never mention you are an AI model.",
          ].join("\n");
        } else {
          const styleKey: ResponseStyle = style ?? "friendly";
          const styleText = STYLE_PROMPTS[styleKey] ?? STYLE_PROMPTS.friendly;
          system = [
            "You are LINGO PULSE, a luxury AI conversation companion.",
            "Respond ONLY in clear, natural English — even if the user writes another language.",
            "Be warm, smart, and human. Sound like a thoughtful real person, never robotic.",
            "BE CONCISE: keep replies to 1–3 short sentences unless the user explicitly asks for detail.",
            "Ask a short follow-up question when it keeps the dialogue alive — never lecture.",
            styleText,
            grammarCorrection
              ? "If the user's message has spelling, grammar, OR awkward phrasing, gently correct it at the END of your reply in this exact format:\n\n---\n**Polished version:** <the corrected/polished sentence>\n*Note:* <one short kind explanation>\n\nOnly include this section when there is a real improvement. Never shame the user."
              : "",
          ]
            .filter(Boolean)
            .join("\n\n");
        }

        const gateway = createLovableAiGatewayProvider(apiKey);
        // Use the fast preview model for snappy replies
        const model = gateway("google/gemini-3.1-flash-lite-preview");

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

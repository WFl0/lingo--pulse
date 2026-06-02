import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { generateText, type UIMessage } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway";
import { getPersona } from "@/lib/personas";

type Body = { personaId?: string; messages?: UIMessage[] };

function extract(m: UIMessage) {
  return m.parts.map((p) => (p.type === "text" ? p.text : "")).join("").trim();
}

export const Route = createFileRoute("/api/persona-turn")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const { personaId, messages = [] } = (await request.json()) as Body;
        const persona = getPersona(personaId);
        if (!persona) return new Response("Unknown persona", { status: 400 });

        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const system = [
          persona.systemPrompt,
          "",
          "ROLE: You are chatting WITH an AI English tutor named LINGO PULSE.",
          "- Reply ONLY in English, fully in character.",
          "- Keep it SHORT and natural: 1–2 sentences.",
          "- About 60% of the time, include ONE small natural English mistake that fits your character (the tutor will correct it).",
          "- Ask the tutor a question sometimes to keep the chat alive.",
          "- Do NOT add corrections, notes, translations, or any meta commentary. Just talk like a real person.",
          "- If this is the first turn (no prior tutor message), start with a friendly greeting or a topic you care about.",
        ].join("\n");

        // Flip roles from the persona's point of view:
        // existing 'user' messages were the persona itself → assistant
        // existing 'assistant' messages were the tutor → user
        const history = messages
          .map((m) => {
            const t = extract(m);
            if (!t) return null;
            const main = t.split(/\n---\n/)[0].trim();
            const role: "user" | "assistant" =
              m.role === "assistant" ? "user" : "assistant";
            return { role, content: main };
          })
          .filter(Boolean) as Array<{ role: "user" | "assistant"; content: string }>;

        const gateway = createLovableAiGatewayProvider(apiKey);
        const { text } = await generateText({
          model: gateway("google/gemini-3.1-flash-lite-preview"),
          system,
          messages:
            history.length > 0
              ? history
              : [{ role: "user", content: "Say hello and start the conversation." }],
        });

        return new Response(JSON.stringify({ text: text.trim() }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});

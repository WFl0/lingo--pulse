import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";

type TtsBody = { text?: string; voiceId?: string };

export const Route = createFileRoute("/api/tts")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const { text, voiceId } = (await request.json()) as TtsBody;
        if (!text || text.trim().length === 0) {
          return new Response("Text required", { status: 400 });
        }
        const apiKey = process.env.ELEVENLABS_API_KEY;
        if (!apiKey) {
          return new Response("Missing ELEVENLABS_API_KEY", { status: 500 });
        }

        const id = voiceId || "EXAVITQu4vr4xnSDxMaL";
        const cleanText = text.replace(/[#*_`>~]+/g, "").slice(0, 4000);

        const upstream = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${id}/stream?output_format=mp3_44100_128`,
          {
            method: "POST",
            headers: {
              "xi-api-key": apiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              text: cleanText,
              model_id: "eleven_turbo_v2_5",
              voice_settings: {
                stability: 0.45,
                similarity_boost: 0.8,
                style: 0.4,
                use_speaker_boost: true,
              },
            }),
          },
        );

        if (!upstream.ok || !upstream.body) {
          const err = await upstream.text();
          return new Response(err || "TTS failed", { status: upstream.status });
        }

        return new Response(upstream.body, {
          headers: {
            "Content-Type": "audio/mpeg",
            "Cache-Control": "no-store",
          },
        });
      },
    },
  },
});

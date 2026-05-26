export async function generateSpeechAudio(text) {
  const { GoogleGenAI } = await import("@google/genai");
  const apiKey = process.env.GEMINI_API_KEY || "";
  const genai = new GoogleGenAI({ apiKey });

  try {
    const response = await genai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: [{ role: "user", parts: [{ text: `Convert this tip to natural speech: ${text}` }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoide" } } },
      },
    });

    const audioPart = response.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
    return audioPart?.inlineData?.data || "";
  } catch (err) {
    console.error("[TTS Error]", err);
    return "";
  }
}

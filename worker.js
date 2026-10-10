const ALLOWED_ORIGIN = "https://rakeditingstudio.github.io";
const MODEL = "gemini-2.5-flash";

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const cors = {
      "Access-Control-Allow-Origin": origin === ALLOWED_ORIGIN ? ALLOWED_ORIGIN : ALLOWED_ORIGIN,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Vary": "Origin"
    };
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    const json = (body, status = 200) => new Response(JSON.stringify(body), {
      status, headers: { ...cors, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
    });
    if (request.method !== "POST") return json({ error: "Use POST for chat requests." }, 405);
    if (!env.GEMINI_API_KEY) return json({ error: "AI backend is not configured yet." }, 503);

    try {
      const body = await request.json();
      const message = typeof body.message === "string" ? body.message.trim() : "";
      if (!message) return json({ error: "Please enter a question." }, 400);
      if (message.length > 1200) return json({ error: "Please keep each message under 1200 characters." }, 413);

      const history = Array.isArray(body.history) ? body.history.slice(-8) : [];
      const contents = [];
      for (const item of history) {
        if (!item || typeof item.text !== "string") continue;
        const role = item.role === "assistant" ? "model" : item.role === "user" ? "user" : null;
        if (!role) continue;
        contents.push({ role, parts: [{ text: item.text.slice(0, 1200) }] });
      }
      if (!contents.length || contents[contents.length - 1].role !== "user" ||
          contents[contents.length - 1].parts[0].text !== message) {
        contents.push({ role: "user", parts: [{ text: message }] });
      }

      const upstream = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + MODEL + ":generateContent", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: "You are RAKGPT, the friendly AI helper for RAK Editing Studio by Royal Aashish King. Help users with video editing, photo editing, Reels, creator tools, safe AI prompts, and website questions. Answer clearly and simply, matching the user's language (Hindi/Hinglish or English). Be honest about uncertainty. Never claim to have changed a website or completed an action unless it actually happened. Do not request passwords, API keys, or private account information. Keep answers useful and concise." }] },
          contents,
          generationConfig: { temperature: 0.7, maxOutputTokens: 700 }
        })
      });
      const result = await upstream.json();
      if (!upstream.ok) {
        return json({ error: "The AI service could not answer right now. Please try again later." }, 502);
      }
      const reply = (result.candidates || []).flatMap(c => c.content?.parts || []).map(p => p.text || "").join("\n").trim();
      if (!reply) return json({ error: "No answer returned. Please try a different question." }, 502);
      return json({ reply });
    } catch (error) {
      return json({ error: "Unable to process this request. Please try again." }, 400);
    }
  }
};

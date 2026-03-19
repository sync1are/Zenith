const API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY || "";

const MODEL = "ollama/minimax-m2.7:cloud";

interface OllamaMessage {
    role: "system" | "user" | "assistant";
    content: string;
}

export async function callOllamaCloud(messages: OllamaMessage[], maxTokens: number = 2000): Promise<string> {
    if (!API_KEY) {
        throw new Error("⚠️ OpenRouter API key not configured. Add VITE_OPENROUTER_API_KEY to your .env file");
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${API_KEY}`,
            "Content-Type": "application/json",
            "HTTP-Referer": typeof window !== 'undefined' ? window.location.origin : "",
            "X-Title": "Zenith AI",
        },
        body: JSON.stringify({
            model: MODEL,
            messages,
            max_tokens: maxTokens,
        })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `API Error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
}

export const ollamaCloudService = {
    call: callOllamaCloud,
    model: MODEL,
};

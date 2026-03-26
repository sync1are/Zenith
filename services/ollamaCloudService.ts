export interface OllamaMessage {
    role: "system" | "user" | "assistant";
    content: string;
}

interface OllamaChatRequest {
    messages: OllamaMessage[];
    format?: "json";
    maxTokens?: number;
    temperature?: number;
}

interface OllamaChatResponse {
    content: string;
    model: string;
}

export const OLLAMA_MODEL = "qwen3-vl:235b-instruct-cloud";

function getAiBridge() {
    const bridge = (window as any)?.electronAPI?.ai;
    if (!bridge?.chat) {
        throw new Error("AI bridge unavailable. Run the app in Electron.");
    }
    return bridge;
}

export async function callOllamaCloud(
    messages: OllamaMessage[],
    maxTokens: number = 2000,
    format?: "json"
): Promise<string> {
    const bridge = getAiBridge();
    const response: OllamaChatResponse = await bridge.chat({
        messages,
        maxTokens,
        format,
    } as OllamaChatRequest);
    return response.content || "";
}

export async function callOllamaCloudJson<T>(
    messages: OllamaMessage[],
    maxTokens: number = 2000
): Promise<T> {
    const text = await callOllamaCloud(messages, maxTokens, "json");
    const cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    const match = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    const jsonText = match ? match[0] : cleaned;
    return JSON.parse(jsonText) as T;
}

export async function cleanJournalTranscription(rawText: string): Promise<string> {
    if (!rawText.trim()) {
        return rawText;
    }

    const cleaned = await callOllamaCloud([
        {
            role: "system",
            content: "You clean speech-to-text transcripts. Remove filler words, self-corrections, and false starts while preserving meaning and natural tone. Return only the cleaned transcript."
        },
        {
            role: "user",
            content: rawText
        }
    ], 500);

    return cleaned.trim() || rawText;
}

export const ollamaCloudService = {
    call: callOllamaCloud,
    callJson: callOllamaCloudJson,
    cleanJournalTranscription,
    model: OLLAMA_MODEL,
};

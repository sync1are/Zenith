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
const OLLAMA_CLOUD_URL = "https://ollama.com/api/chat";

function isElectronEnvironment(): boolean {
    return typeof window !== 'undefined' && (window as any)?.electronAPI?.ai?.chat;
}

function getApiKey(): string {
    // Try to get from environment variables (Vercel/web deployment)
    if (typeof process !== 'undefined' && process.env) {
        return process.env.VITE_OLLAMA_CLOUD_API_KEY || 
               process.env.OLLAMA_CLOUD_API_KEY || 
               process.env.OLLAMA_API_KEY || "";
    }
    
    // Fallback for web environments where process.env might not be available
    return import.meta.env?.VITE_OLLAMA_CLOUD_API_KEY || "";
}

async function callOllamaDirectly(
    messages: OllamaMessage[],
    maxTokens: number = 2000,
    format?: "json"
): Promise<string> {
    const apiKey = getApiKey();
    if (!apiKey) {
        throw new Error("Ollama API key not found. Please set VITE_OLLAMA_CLOUD_API_KEY in your environment.");
    }

    const response = await fetch(OLLAMA_CLOUD_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: OLLAMA_MODEL,
            messages,
            options: {
                num_predict: maxTokens,
                temperature: 0.3,
            },
            format: format === "json" ? "json" : undefined,
            stream: false,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama API request failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return data.message?.content || "";
}

export async function callOllamaCloud(
    messages: OllamaMessage[],
    maxTokens: number = 2000,
    format?: "json"
): Promise<string> {
    // Use Electron bridge if available, otherwise make direct API call
    if (isElectronEnvironment()) {
        const bridge = (window as any).electronAPI.ai;
        const response: OllamaChatResponse = await bridge.chat({
            messages,
            maxTokens,
            format,
        } as OllamaChatRequest);
        return response.content || "";
    } else {
        // Direct API call for web/Vercel deployment
        return await callOllamaDirectly(messages, maxTokens, format);
    }
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

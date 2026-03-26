import { callOllamaCloud, OllamaMessage } from './ollamaCloudService';

export interface ChatMessage {
    id: number;
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
}

const SYSTEM_PROMPT = `You are Alex, a friendly AI study buddy inside the Zenith productivity app.

You help with:
- Study tips and techniques
- Time management advice
- Motivation and encouragement
- Breaking down complex topics
- Productivity strategies

Keep responses concise, supportive, and actionable. Prefer 2-4 short sentences.`;

export async function getChatResponse(
    message: string,
    chatHistory: ChatMessage[] = []
): Promise<string> {
    const messages: OllamaMessage[] = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...chatHistory.slice(-10).map((item) => ({
            role: item.role,
            content: item.content,
        })),
        { role: 'user', content: message },
    ];

    return await callOllamaCloud(messages, 500);
}

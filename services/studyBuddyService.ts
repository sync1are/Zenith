// Alex Study Buddy AI Service - Simple Version
// Basic AI chat for study tips and motivation

import { callOllamaCloud } from './ollamaCloudService';

export interface ChatMessage {
    id: number;
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
}

// Simple system prompt focused on study assistance
const SYSTEM_PROMPT = `You are Alex, a friendly AI study buddy. Your real name is Luna, but you go by the nickname "Alex" - only reveal your real name if someone specifically asks what your real name is.

You help students with:
- Study tips and techniques
- Time management advice
- Motivation and encouragement
- Breaking down complex topics
- Productivity strategies

Keep responses concise (2-3 sentences), supportive, and actionable. Be encouraging and maintain a friendly tone!`;

/**
 * Get AI chat response from OpenRouter using Grok
 */
export async function getChatResponse(
    message: string,
    chatHistory: ChatMessage[] = []
): Promise<string> {
    try {
        const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
            { role: "system", content: SYSTEM_PROMPT },
            ...chatHistory.slice(-10).map(msg => ({
                role: msg.role,
                content: msg.content
            })),
            { role: "user", content: message }
        ];

        return await callOllamaCloud(messages, 500);

    } catch (error: any) {
        console.error("Alex chat error:", error);
        throw new Error(error.message || "Failed to get response from Alex");
    }
}

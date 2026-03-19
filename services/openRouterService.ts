import { Task, TaskPriority, TaskStatus } from '../types';
import { callOllamaCloud } from './ollamaCloudService';

interface GenerateTaskResponse {
    task: {
        title: string;
        category: string;
        priority: string;
        subtasks: {
            title: string;
            duration: string;
        }[];
    };
}

export const generateTaskPlan = async (prompt: string): Promise<Task[]> => {
    try {
        const messages = [
            {
                role: "system" as const,
                content: "You are a task planning assistant. Generate ONLY valid JSON with no markdown, explanations, or code blocks."
            },
            {
                role: "user" as const,
                content: `Generate a structured task breakdown for the user's goal.

Format:
{
  "task": {
    "title": "Main task title",
    "category": "Category name",
    "priority": "HIGH or MEDIUM or LOW",
    "subtasks": [
      { "title": "Subtask 1", "duration": "30 min" },
      { "title": "Subtask 2", "duration": "45 min" }
    ]
  }
}

User's goal: ${prompt}

Generate actionable subtasks as per required with realistic durations.`
            }
        ];

        let text = await callOllamaCloud(messages, 2000);

        // Remove markdown code blocks if present
        text = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

        // Try to find JSON in the response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            text = jsonMatch[0];
        }

        const parsedData = JSON.parse(text) as GenerateTaskResponse;

        if (!parsedData.task || !parsedData.task.title) {
            throw new Error("Invalid response format");
        }

        // Calculate total duration from subtasks
        const totalMinutes = parsedData.task.subtasks.reduce((sum: number, st: any) => {
            const match = st.duration.match(/(\d+)\s*(min|hour)/i);
            if (match) {
                const value = parseInt(match[1]);
                const unit = match[2].toLowerCase();
                return sum + (unit.includes('hour') ? value * 60 : value);
            }
            return sum;
        }, 0);

        const mainTask: Task = {
            id: Date.now(),
            title: parsedData.task.title,
            category: parsedData.task.category,
            priority: parsedData.task.priority as TaskPriority,
            duration: totalMinutes >= 60
                ? `${Math.floor(totalMinutes / 60)} hours ${totalMinutes % 60} min`
                : `${totalMinutes} min`,
            remainingTime: totalMinutes * 60, // Added remainingTime
            status: TaskStatus.TODO,
            isCompleted: false,
            subtasks: parsedData.task.subtasks.map((st: any, index: number) => ({
                id: Date.now() + index + 1, // Offset ID to avoid collision
                title: st.title,
                duration: st.duration,
                isCompleted: false
            }))
        };

        return [mainTask];

    } catch (err: any) {
        console.error("AI Generation Error:", err);
        throw new Error(
            err.message?.includes("API")
                ? "⚠️ API Error: Check your API key and quota"
                : "⚠️ Could not generate tasks. Try rephrasing your prompt."
        );
    }
};

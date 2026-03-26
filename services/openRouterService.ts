import { Task, TaskPriority, TaskStatus } from '../types';
import { callOllamaCloudJson, OllamaMessage } from './ollamaCloudService';

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
        const messages: OllamaMessage[] = [
            {
                role: "system",
                content: "You are a task planning assistant. Generate only valid JSON."
            },
            {
                role: "user",
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

Generate actionable subtasks with realistic durations.`
            }
        ];

        const parsedData = await callOllamaCloudJson<GenerateTaskResponse>(messages, 1400);

        if (!parsedData.task || !parsedData.task.title) {
            throw new Error("Invalid response format");
        }

        const totalMinutes = parsedData.task.subtasks.reduce((sum, subtask) => {
            const match = subtask.duration.match(/(\d+)\s*(min|hour)/i);
            if (!match) return sum;
            const value = parseInt(match[1], 10);
            return sum + (match[2].toLowerCase().includes('hour') ? value * 60 : value);
        }, 0);

        const mainTask: Task = {
            id: Date.now(),
            title: parsedData.task.title,
            category: parsedData.task.category,
            priority: parsedData.task.priority as TaskPriority,
            duration: totalMinutes >= 60
                ? `${Math.floor(totalMinutes / 60)} hours ${totalMinutes % 60} min`
                : `${totalMinutes} min`,
            remainingTime: totalMinutes * 60,
            status: TaskStatus.TODO,
            isCompleted: false,
            subtasks: parsedData.task.subtasks.map((subtask, index) => ({
                id: Date.now() + index + 1,
                title: subtask.title,
                duration: subtask.duration,
                isCompleted: false
            }))
        };

        return [mainTask];
    } catch (err: any) {
        console.error("Task generation error:", err);
        throw new Error("Could not generate tasks right now.");
    }
};

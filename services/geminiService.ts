import { Habit } from '../types';
import { callOllamaCloudJson, OllamaMessage } from './ollamaCloudService';

interface TaskPlan {
    summary: string;
    estimatedTotalMinutes: number;
    subtasks: Array<{
        title: string;
    }>;
}

interface HabitResponseItem {
    title: string;
    category?: string;
    icon?: string;
    description?: string;
    color?: string;
    frequency?: string;
}

export async function breakDownTask(taskTitle: string): Promise<TaskPlan | null> {
    try {
        const messages: OllamaMessage[] = [
            {
                role: 'system',
                content: 'You are a task planning assistant. Return valid JSON only.',
            },
            {
                role: 'user',
                content: `Break down the following task into actionable subtasks and provide an estimated time.

Task: "${taskTitle}"

Return exactly this JSON shape:
{
  "summary": "A brief 1-2 sentence summary",
  "estimatedTotalMinutes": 60,
  "subtasks": [
    { "title": "Subtask 1" },
    { "title": "Subtask 2" }
  ]
}

Provide 3-5 specific, practical subtasks.`,
            }
        ];

        return await callOllamaCloudJson<TaskPlan>(messages, 900);
    } catch (error) {
        console.error('Error breaking down task:', error);
        return null;
    }
}

export async function generateRoutine(goal: string): Promise<Habit[]> {
    try {
        const messages: OllamaMessage[] = [
            {
                role: 'system',
                content: 'You create habit suggestions. Return valid JSON only.',
            },
            {
                role: 'user',
                content: `Create a daily habit routine for the following goal: "${goal}".

Return a JSON array of 3-7 habits.
Each item must use this shape:
{
  "title": "Habit Title",
  "category": "Health/Productivity/Mindfulness/etc",
  "icon": "CheckSquare",
  "description": "Short motivation or instruction",
  "color": "from-blue-500 to-cyan-500",
  "frequency": "Everyday"
}

Use icon names from common Lucide-style names such as CheckSquare, Target, BookOpen, Heart, Brain, Calendar, Dumbbell, Coffee, Music.`,
            }
        ];

        const rawHabits = await callOllamaCloudJson<HabitResponseItem[]>(messages, 1200);

        return rawHabits.map((habit) => ({
            id: Math.random().toString(36).substr(2, 9),
            title: habit.title,
            category: habit.category || 'Personal',
            icon: habit.icon || 'CheckSquare',
            description: habit.description || '',
            color: habit.color || 'from-blue-500 to-cyan-500',
            frequency: habit.frequency || 'Everyday',
            createdAt: new Date().toISOString()
        }));
    } catch (error) {
        console.error("Error generating routine:", error);
        throw error;
    }
}

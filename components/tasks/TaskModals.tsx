import React, { useState, useEffect } from 'react';
import { Task, TaskPriority, TaskStatus } from '../../types';
import { generateTaskPlan } from '../../services/openRouterService';
import { SparklesIcon } from '../icons/IconComponents';


interface TaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (task: any) => void;
    editTask?: Task;
}

export const TaskModal: React.FC<TaskModalProps> = ({ isOpen, onClose, onSave, editTask }) => {
    const [title, setTitle] = useState(editTask?.title || "");
    const [category, setCategory] = useState(editTask?.category || "");
    const [priority, setPriority] = useState<TaskPriority>(editTask?.priority || TaskPriority.MEDIUM);
    const [duration, setDuration] = useState(editTask?.duration || "");

    // Update fields when editTask changes
    useEffect(() => {
        if (editTask) {
            setTitle(editTask.title);
            setCategory(editTask.category);
            setPriority(editTask.priority);
            setDuration(editTask.duration);
        } else {
            setTitle("");
            setCategory("");
            setPriority(TaskPriority.MEDIUM);
            setDuration("");
        }
    }, [editTask]);

    const handleSubmit = () => {
        if (!title.trim()) return;

        onSave({
            title,
            category,
            priority,
            duration,
            ...(editTask && { id: editTask.id, status: editTask.status, isCompleted: editTask.isCompleted })
        });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={onClose}>
            <div className="bg-[#1C1C1E] p-6 rounded-xl border border-gray-800 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-xl font-bold text-white mb-4">{editTask ? "Edit Task" : "Add Task"}</h2>

                <input
                    className="w-full bg-[#111217] px-3 py-2 rounded border border-gray-700 text-white mb-3"
                    placeholder="Task title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                />

                <input
                    className="w-full bg-[#111217] px-3 py-2 rounded border border-gray-700 text-white mb-3"
                    placeholder="Category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                />

                <div className="flex gap-3 mb-4">
                    <select
                        className="flex-1 bg-[#111217] border border-gray-700 text-white rounded px-3 py-2"
                        value={priority}
                        onChange={(e) => setPriority(e.target.value as TaskPriority)}
                    >
                        {Object.values(TaskPriority).map(p => <option key={p}>{p}</option>)}
                    </select>

                    <input
                        className="flex-1 bg-[#111217] border border-gray-700 text-white rounded px-3 py-2"
                        placeholder="45 min"
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                    />
                </div>

                <div className="flex justify-end gap-3">
                    <button className="px-4 py-2 bg-gray-700 rounded text-white hover:bg-gray-600 transition" onClick={onClose}>
                        Cancel
                    </button>
                    <button
                        className="px-4 py-2 bg-orange-600 rounded text-white hover:bg-orange-500 transition"
                        onClick={handleSubmit}
                    >
                        {editTask ? "Update" : "Add"}
                    </button>
                </div>
            </div>
        </div>
    );
};

interface GeneratePlanModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddBatch: (tasks: Task[]) => void;
}

export const GeneratePlanModal: React.FC<GeneratePlanModalProps> = ({ isOpen, onClose, onAddBatch }) => {
    const [prompt, setPrompt] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const generatePlan = async () => {
        if (!prompt.trim()) {
            setError("Please enter a prompt");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const tasks = await generateTaskPlan(prompt);
            onAddBatch(tasks);
            setPrompt("");
            onClose();
        } catch (err: any) {
            setError(err.message);
        }

        setLoading(false);
    };

    const handleClose = () => {
        setPrompt("");
        setError("");
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={handleClose}>
            <div className="bg-[#1C1C1E] border border-gray-800 rounded-xl p-6 w-full max-w-xl" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-xl text-white font-bold mb-4 flex items-center gap-2">
                    <SparklesIcon className="h-6 w-6 text-indigo-400" />
                    AI Task Planner
                </h2>

                <textarea
                    className="w-full h-32 bg-[#111217] border border-gray-700 text-white rounded p-3 focus:outline-none focus:border-indigo-500 transition"
                    placeholder="Example: Plan my study session for calculus and physics, break down review of electrostatics chapter..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    disabled={loading}
                />

                {error && (
                    <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-sm">
                        {error}
                    </div>
                )}

                <div className="flex justify-between items-center mt-4">
                    <p className="text-xs text-gray-500">
                        💡 Tip: Be specific about your goals for better results
                    </p>
                    <div className="flex gap-3">
                        <button
                            className="px-4 py-2 bg-gray-700 rounded text-white hover:bg-gray-600 transition"
                            onClick={handleClose}
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            className="px-4 py-2 bg-indigo-600 rounded text-white disabled:opacity-50 hover:bg-indigo-500 transition flex items-center gap-2"
                            disabled={loading || !prompt.trim()}
                            onClick={generatePlan}
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Thinking...
                                </>
                            ) : (
                                <>
                                    <SparklesIcon className="h-4 w-4" />
                                    Generate
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

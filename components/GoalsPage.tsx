import React, { useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback } from 'react';
import { Sparkles, Trash2, Plus, Pin, Check, X, FolderOpen, Grid3X3, PlusCircle, Target, Loader2 } from 'lucide-react';
import { useGoalStore } from '../store/useGoalStore';
import { callOllamaCloud } from '../services/ollamaCloudService';

// --- TYPES ---
export interface Subgoal {
    id: string;
    title: string;
    completed: boolean;
}

export interface Goal {
    id: string;
    title: string;
    createdAt: number;
    isPinned: boolean;
    order: number;
    subgoals: Subgoal[];
}

export interface Album {
    id: string;
    name: string;
    goalIds: string[];
    createdAt: number;
}

// --- AI SERVICE ---
export const generateSubgoalsForGoal = async (goalTitle: string, userInstruction: string): Promise<string[]> => {
    try {
        const response = await callOllamaCloud([{
            role: "user",
            content: `Goal: "${goalTitle}"
User instruction: "${userInstruction}"

Generate 3-5 actionable sub-goals (steps) for this goal based on the user's instruction.
Keep each step concise (under 10 words).
Return ONLY a JSON array of strings, no other text.
Example: ["Step one", "Step two", "Step three"]`
        }], 500);

        const jsonMatch = response.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        return ["Research the topic", "Create a plan", "Execute first step"];
    } catch (error) {
        console.error("Error generating subgoals:", error);
        return ["Research the topic", "Create a detailed plan", "Execute first step"];
    }
};

// --- HOOKS ---
const useNumberAnimation = (end: number, duration: number = 1000) => {
    const [current, setCurrent] = useState(end);
    const startRef = useRef(end);
    const startTimeRef = useRef<number | null>(null);

    useEffect(() => {
        startRef.current = current;
        startTimeRef.current = null;
        if (Math.abs(end - current) > 50) {
            setCurrent(end);
        }
    }, [end]);

    useEffect(() => {
        if (current === end) return;

        const animate = (time: number) => {
            if (startTimeRef.current === null) startTimeRef.current = time;
            const elapsed = time - startTimeRef.current;
            const progress = Math.min(elapsed / duration, 1);
            const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
            const nextValue = Math.round(startRef.current + (end - startRef.current) * ease);
            setCurrent(nextValue);
            if (progress < 1) requestAnimationFrame(animate);
        };

        const frame = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(frame);
    }, [end, duration, current]);

    return current;
};

// --- GOAL CARD COMPONENT ---
interface GoalCardProps {
    goal: Goal;
    style?: React.CSSProperties;
    onUpdate: (updatedGoal: Goal) => void;
    onDelete: (id: string) => void;
    onDragStart: (e: React.DragEvent, id: string) => void;
    onDragEnter: (e: React.DragEvent, id: string) => void;
    onDragEnd: () => void;
    onHeightChange: (id: string, height: number) => void;
}

const GoalCard: React.FC<GoalCardProps> = ({
    goal, style, onUpdate, onDelete, onDragStart, onDragEnter, onDragEnd, onHeightChange
}) => {
    const [newSubgoalText, setNewSubgoalText] = useState("");
    const [isAddingSubgoal, setIsAddingSubgoal] = useState(false);
    const [isExiting, setIsExiting] = useState(false);
    const [exitingSubgoals, setExitingSubgoals] = useState<string[]>([]);
    const cardRef = useRef<HTMLDivElement>(null);

    // AI States
    const [showAiInput, setShowAiInput] = useState(false);
    const [aiPrompt, setAiPrompt] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const aiInputRef = useRef<HTMLInputElement>(null);

    // New subgoal animation states
    const [newSubgoalIds, setNewSubgoalIds] = useState<Set<string>>(new Set());

    const totalSubgoals = goal.subgoals.length;
    const completedSubgoals = goal.subgoals.filter(sg => sg.completed).length;
    const rawProgress = totalSubgoals === 0 ? 0 : Math.round((completedSubgoals / totalSubgoals) * 100);
    const animatedProgress = useNumberAnimation(rawProgress, 800);

    useLayoutEffect(() => {
        if (!cardRef.current) return;
        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                onHeightChange(goal.id, entry.contentRect.height + 24);
            }
        });
        observer.observe(cardRef.current);
        return () => observer.disconnect();
    }, [goal.subgoals.length, isAddingSubgoal, showAiInput, onHeightChange, goal.id]);

    // Focus AI input when shown
    useEffect(() => {
        if (showAiInput && aiInputRef.current) {
            aiInputRef.current.focus();
        }
    }, [showAiInput]);

    const handleTogglePin = () => onUpdate({ ...goal, isPinned: !goal.isPinned });

    const handleToggleSubgoal = (subgoalId: string) => {
        const updatedSubgoals = goal.subgoals.map(sg =>
            sg.id === subgoalId ? { ...sg, completed: !sg.completed } : sg
        );
        onUpdate({ ...goal, subgoals: updatedSubgoals });
    };

    const handleDeleteSubgoal = (subgoalId: string) => {
        setExitingSubgoals(prev => [...prev, subgoalId]);
        setTimeout(() => {
            const updatedSubgoals = goal.subgoals.filter(sg => sg.id !== subgoalId);
            onUpdate({ ...goal, subgoals: updatedSubgoals });
            setExitingSubgoals(prev => prev.filter(id => id !== subgoalId));
        }, 300);
    };

    const handleDeleteCard = () => {
        setIsExiting(true);
        setTimeout(() => onDelete(goal.id), 400);
    };

    const handleAddSubgoal = () => {
        if (!newSubgoalText.trim()) return;
        const newId = Date.now().toString();
        const newSubgoal: Subgoal = {
            id: newId,
            title: newSubgoalText,
            completed: false
        };
        setNewSubgoalIds(prev => new Set([...prev, newId]));
        setTimeout(() => setNewSubgoalIds(prev => { const next = new Set(prev); next.delete(newId); return next; }), 500);
        onUpdate({ ...goal, subgoals: [...goal.subgoals, newSubgoal] });
        setNewSubgoalText("");
        setIsAddingSubgoal(false);
    };

    // AI Handler
    const handleAiSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!aiPrompt.trim() || isGenerating) return;

        setIsGenerating(true);
        try {
            const suggestions = await generateSubgoalsForGoal(goal.title, aiPrompt);
            const newSubgoals: Subgoal[] = suggestions.map((text, idx) => ({
                id: Date.now().toString() + idx,
                title: text,
                completed: false
            }));
            // Animate new subgoals
            const newIds = new Set(newSubgoals.map(sg => sg.id));
            setNewSubgoalIds(newIds);
            setTimeout(() => setNewSubgoalIds(new Set()), 500);

            onUpdate({ ...goal, subgoals: [...goal.subgoals, ...newSubgoals] });
            setAiPrompt("");
            setShowAiInput(false);
        } catch (e) {
            console.error(e);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div
            ref={cardRef}
            style={style}
            draggable
            onDragStart={(e) => onDragStart(e, goal.id)}
            onDragEnter={(e) => onDragEnter(e, goal.id)}
            onDragEnd={onDragEnd}
            onDragOver={(e) => e.preventDefault()}
            className={`
        absolute left-0 top-0 group flex flex-col
        bg-white/5 backdrop-blur-xl
        border border-white/10
        rounded-2xl shadow-xl
        overflow-hidden 
        transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)]
        cursor-grab active:cursor-grabbing active:z-50 active:scale-105
        ${isExiting ? 'opacity-0 scale-90 translate-y-4' : 'opacity-100 scale-100'}
      `}
        >
            {/* Toolbar */}
            <div className="absolute top-3 right-3 flex items-center gap-1 p-1 bg-black/40 backdrop-blur-xl rounded-full border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                <button onClick={handleDeleteCard} className="p-1.5 text-white/60 hover:text-red-400 rounded-full transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => { setIsAddingSubgoal(true); setShowAiInput(false); }} className="p-1.5 text-white/60 hover:text-white rounded-full transition-colors">
                    <Plus className="w-3.5 h-3.5" />
                </button>
                <button
                    onClick={() => { setShowAiInput(true); setIsAddingSubgoal(false); }}
                    className={`p-1.5 rounded-full transition-colors ${showAiInput ? 'text-purple-400 bg-purple-500/20' : 'text-white/60 hover:text-purple-300'}`}
                >
                    <Sparkles className="w-3.5 h-3.5" />
                </button>
                <button onClick={handleTogglePin} className={`p-1.5 rounded-full transition-colors ${goal.isPinned ? 'text-cyan-400' : 'text-white/60 hover:text-cyan-200'}`}>
                    <Pin className="w-3.5 h-3.5" fill={goal.isPinned ? "currentColor" : "none"} />
                </button>
            </div>

            {/* Header */}
            <div className="p-5 pb-2">
                <h3 className="text-lg font-semibold text-white truncate pr-16">{goal.title}</h3>
                <div className="mt-3">
                    <div className="flex justify-between text-xs text-white/50 mb-1">
                        <span>Progress</span>
                        <span className="tabular-nums">{animatedProgress}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-black/30 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-cyan-400 to-indigo-500 transition-all duration-300"
                            style={{ width: `${animatedProgress}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Subgoals */}
            <div className="flex-1 p-5 pt-2">
                {/* AI Input */}
                {showAiInput && (
                    <form onSubmit={handleAiSubmit} className="mb-3 bg-purple-500/10 border border-purple-500/30 rounded-xl p-3 animate-[fadeSlideIn_0.3s_ease-out]">
                        <div className="flex items-center gap-2">
                            {isGenerating ? (
                                <Loader2 className="w-4 h-4 text-purple-400 animate-spin flex-shrink-0" />
                            ) : (
                                <Sparkles className="w-4 h-4 text-purple-400 flex-shrink-0" />
                            )}
                            <input
                                ref={aiInputRef}
                                disabled={isGenerating}
                                type="text"
                                value={aiPrompt}
                                onChange={(e) => setAiPrompt(e.target.value)}
                                placeholder="How should I break this down?"
                                className="flex-1 bg-transparent border-none outline-none text-sm text-white placeholder-purple-200/50"
                            />
                            <button type="button" onClick={() => setShowAiInput(false)} className="text-white/40 hover:text-white">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        {!isGenerating && (
                            <div className="mt-2 flex justify-end">
                                <button
                                    type="submit"
                                    disabled={!aiPrompt.trim()}
                                    className="text-xs font-medium bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 px-3 py-1 rounded-lg transition-colors disabled:opacity-50"
                                >
                                    Generate
                                </button>
                            </div>
                        )}
                    </form>
                )}

                {goal.subgoals.length === 0 && !isAddingSubgoal && !showAiInput && (
                    <div className="py-4 flex flex-col items-center text-white/30 text-sm">
                        <p>No steps yet</p>
                        <button
                            onClick={() => setShowAiInput(true)}
                            className="mt-2 flex items-center gap-1 text-purple-400 hover:text-purple-300 text-xs"
                        >
                            <Sparkles className="w-3 h-3" />
                            <span>Use AI to plan</span>
                        </button>
                    </div>
                )}

                <ul className="space-y-1.5">
                    {goal.subgoals.map((subgoal, index) => (
                        <li
                            key={subgoal.id}
                            style={{ animationDelay: newSubgoalIds.has(subgoal.id) ? `${index * 50}ms` : '0ms' }}
                            className={`
                group/item flex items-start gap-2 p-2 rounded-lg hover:bg-white/5 transition-all duration-300
                ${exitingSubgoals.includes(subgoal.id) ? 'opacity-0 -translate-x-4 scale-95' : 'opacity-100 translate-x-0 scale-100'}
                ${newSubgoalIds.has(subgoal.id) ? 'animate-[fadeSlideIn_0.3s_ease-out_forwards]' : ''}
              `}
                        >
                            <button
                                onClick={() => handleToggleSubgoal(subgoal.id)}
                                className={`
                  mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition-all duration-200
                  ${subgoal.completed ? 'bg-cyan-500 border-cyan-500 text-white scale-110' : 'border-white/30 hover:border-cyan-400 hover:scale-105'}
                `}
                            >
                                {subgoal.completed && <Check className="w-3 h-3" />}
                            </button>
                            <span className={`flex-1 text-sm transition-all duration-200 ${subgoal.completed ? 'text-white/30 line-through' : 'text-white/80'}`}>
                                {subgoal.title}
                            </span>
                            <button
                                onClick={() => handleDeleteSubgoal(subgoal.id)}
                                className="opacity-0 group-hover/item:opacity-100 text-white/20 hover:text-red-400 transition-all"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </li>
                    ))}
                </ul>

                {isAddingSubgoal && (
                    <div className="mt-2 flex items-center gap-2">
                        <div className="w-4 h-4 rounded border border-white/10" />
                        <input
                            autoFocus
                            type="text"
                            value={newSubgoalText}
                            onChange={(e) => setNewSubgoalText(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddSubgoal()}
                            onBlur={() => !newSubgoalText && setIsAddingSubgoal(false)}
                            placeholder="Type step..."
                            className="flex-1 bg-transparent border-none outline-none text-sm text-white placeholder-white/30"
                        />
                        <button
                            onMouseDown={(e) => { e.preventDefault(); handleAddSubgoal(); }}
                            className="text-cyan-400 hover:text-cyan-300 text-xs font-medium"
                        >
                            Add
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- MODAL ---
const Modal = ({ children, onClose }: { children?: React.ReactNode, onClose: () => void }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            {children}
        </div>
    </div>
);

// --- MAIN GOALS PAGE ---
const GoalsPage: React.FC = () => {
    // Use Zustand store instead of local state (syncs to Firebase)
    const { goals, albums, addGoal, updateGoal, deleteGoal, setGoals, addAlbum, setAlbums, addGoalToAlbum, removeGoalFromAlbum } = useGoalStore();

    const [activeTab, setActiveTab] = useState<string>('all');
    const [newGoalTitle, setNewGoalTitle] = useState('');
    const [isInputExpanded, setIsInputExpanded] = useState(false);
    const [positions, setPositions] = useState<{ [id: string]: { x: number, y: number } }>({});
    const [containerHeight, setContainerHeight] = useState(0);
    const goalHeights = useRef<{ [id: string]: number }>({});
    const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean, goalId: string | null }>({ isOpen: false, goalId: null });
    const [isAlbumInputExpanded, setIsAlbumInputExpanded] = useState(false);
    const [newAlbumName, setNewAlbumName] = useState('');
    const [draggedGoalId, setDraggedGoalId] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Toast feedback
    const [toast, setToast] = useState<{ show: boolean, message: string }>({ show: false, message: '' });

    const showToast = (message: string) => {
        setToast({ show: true, message });
        setTimeout(() => setToast({ show: false, message: '' }), 2000);
    };

    // Sorted/Filtered goals
    const sortedGoals = useMemo(() => {
        const currentAlbum = albums.find(a => a.id === activeTab);
        let filtered = activeTab === 'all' ? goals : goals.filter(g => currentAlbum?.goalIds.includes(g.id));
        return [...filtered].sort((a, b) => {
            if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
            if (a.order !== b.order) return a.order - b.order;
            return b.createdAt - a.createdAt;
        });
    }, [goals, albums, activeTab]);

    // Track layout recalculations
    const [recalcTrigger, setRecalcTrigger] = useState(0);

    // Masonry Layout
    useEffect(() => {
        const calculateLayout = () => {
            const containerWidth = window.innerWidth - 100;
            let numColumns = 1;
            if (containerWidth >= 640) numColumns = 2;
            if (containerWidth >= 1024) numColumns = 3;
            if (containerWidth >= 1400) numColumns = 4;

            const gap = 20;
            const columnWidth = (containerWidth - (numColumns - 1) * gap) / numColumns;
            const columnHeights = new Array(numColumns).fill(0);
            const newPositions: { [id: string]: { x: number, y: number } } = {};

            sortedGoals.forEach(goal => {
                const minColIndex = columnHeights.indexOf(Math.min(...columnHeights));
                newPositions[goal.id] = { x: minColIndex * (columnWidth + gap), y: columnHeights[minColIndex] };
                // Use a minimum height of 200 for new cards without recorded height
                const height = goalHeights.current[goal.id] || 200;
                columnHeights[minColIndex] += height + gap;
            });

            setPositions(newPositions);
            setContainerHeight(Math.max(...columnHeights, 200));
        };

        calculateLayout();
        window.addEventListener('resize', calculateLayout);
        return () => window.removeEventListener('resize', calculateLayout);
    }, [sortedGoals, recalcTrigger]);

    const handleCardHeightChange = useCallback((id: string, height: number) => {
        if (goalHeights.current[id] !== height) {
            goalHeights.current[id] = height;
            // Trigger layout recalculation
            setRecalcTrigger(prev => prev + 1);
        }
    }, []);

    // Actions
    const createGoal = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!newGoalTitle.trim()) return;
        const minOrder = goals.length > 0 ? Math.min(...goals.map(g => g.order)) : 0;
        const newGoal: Goal = {
            id: Date.now().toString(),
            title: newGoalTitle,
            createdAt: Date.now(),
            isPinned: false,
            order: minOrder - 1,
            subgoals: []
        };
        addGoal(newGoal);
        if (activeTab !== 'all') {
            addGoalToAlbum(newGoal.id, activeTab);
        }
        setNewGoalTitle('');
        setIsInputExpanded(false);
    };

    const initiateDelete = (id: string) => setDeleteDialog({ isOpen: true, goalId: id });

    const confirmDelete = (deleteEverywhere: boolean) => {
        const id = deleteDialog.goalId;
        if (!id) return;
        if (deleteEverywhere) {
            deleteGoal(id);
            delete goalHeights.current[id];
        } else {
            removeGoalFromAlbum(id, activeTab);
        }
        setDeleteDialog({ isOpen: false, goalId: null });
    };

    const createAlbum = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!newAlbumName.trim()) return;
        const newAlbum: Album = { id: 'album-' + Date.now(), name: newAlbumName, goalIds: [], createdAt: Date.now() };
        addAlbum(newAlbum);
        setNewAlbumName('');
        setIsAlbumInputExpanded(false);
        setActiveTab(newAlbum.id);
    };

    // Drag & Drop with ref to avoid stale closure
    const draggedGoalIdRef = useRef<string | null>(null);
    const lastSwapTime = useRef<number>(0);
    const SWAP_DELAY = 100; // ms between swaps

    const handleDragStart = (e: React.DragEvent, id: string) => {
        setDraggedGoalId(id);
        draggedGoalIdRef.current = id;
        e.dataTransfer.setData("goalId", id);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragEnd = () => {
        setDraggedGoalId(null);
        draggedGoalIdRef.current = null;
    };

    const handleDragEnter = (e: React.DragEvent, targetId: string) => {
        e.preventDefault();
        const currentDragged = draggedGoalIdRef.current;
        if (!currentDragged || currentDragged === targetId) return;

        // Debounce swaps to prevent jitter
        const now = Date.now();
        if (now - lastSwapTime.current < SWAP_DELAY) return;
        lastSwapTime.current = now;

        // Swap orders between dragged and target
        const sourceGoal = goals.find(g => g.id === currentDragged);
        const targetGoal = goals.find(g => g.id === targetId);
        if (sourceGoal && targetGoal) {
            updateGoal({ ...sourceGoal, order: targetGoal.order });
            updateGoal({ ...targetGoal, order: sourceGoal.order });
        }
    };

    const handleDropOnAlbum = (e: React.DragEvent, albumId: string) => {
        e.preventDefault();
        const goalId = e.dataTransfer.getData("goalId");
        if (!goalId) return;
        const album = albums.find(a => a.id === albumId);
        const goal = goals.find(g => g.id === goalId);
        if (album && goal && !album.goalIds.includes(goalId)) {
            addGoalToAlbum(goalId, albumId);
            showToast(`Added "${goal.title}" to ${album.name}`);
        }
        setDraggedGoalId(null);
    };

    // Column width calculation for cards
    const getColumnWidth = () => {
        const containerWidth = window.innerWidth - 100;
        let numColumns = 1;
        if (containerWidth >= 640) numColumns = 2;
        if (containerWidth >= 1024) numColumns = 3;
        if (containerWidth >= 1400) numColumns = 4;
        return (containerWidth - (numColumns - 1) * 20) / numColumns;
    };

    useEffect(() => {
        if (isInputExpanded) {
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isInputExpanded]);

    return (
        <div className="min-h-screen relative">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <Target className="w-8 h-8 text-indigo-400" />
                    <h1 className="text-2xl font-bold text-white">Goals</h1>
                </div>

                {/* Album Tabs */}
                <div className="flex items-center gap-2 bg-white/5 backdrop-blur-md p-1.5 rounded-full border border-white/10">
                    <button
                        onClick={() => setActiveTab('all')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${activeTab === 'all' ? 'bg-white text-black' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
                    >
                        <Grid3X3 className="w-4 h-4" />
                        <span>All</span>
                    </button>

                    {albums.map(album => (
                        <div
                            key={album.id}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => handleDropOnAlbum(e, album.id)}
                            onClick={() => setActiveTab(album.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium cursor-pointer transition-all ${activeTab === album.id ? 'bg-white text-black' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
                        >
                            <FolderOpen className="w-4 h-4" />
                            <span>{album.name}</span>
                        </div>
                    ))}

                    {/* New Album */}
                    <div
                        onClick={() => !isAlbumInputExpanded && setIsAlbumInputExpanded(true)}
                        className={`flex items-center justify-center rounded-full transition-all ${isAlbumInputExpanded ? 'w-32 bg-white/10 px-2' : 'w-8 h-8 hover:bg-white/10 cursor-pointer'}`}
                    >
                        {isAlbumInputExpanded ? (
                            <form onSubmit={createAlbum} className="flex items-center w-full">
                                <input
                                    autoFocus
                                    type="text"
                                    value={newAlbumName}
                                    onChange={(e) => setNewAlbumName(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Escape' && (setIsAlbumInputExpanded(false), setNewAlbumName(''))}
                                    onBlur={() => !newAlbumName && setIsAlbumInputExpanded(false)}
                                    placeholder="Name..."
                                    className="w-full bg-transparent border-none outline-none text-white placeholder-white/50 text-xs py-2"
                                />
                            </form>
                        ) : (
                            <PlusCircle className="w-4 h-4 text-white/50" />
                        )}
                    </div>
                </div>

                {/* New Goal Button */}
                <div
                    onClick={() => !isInputExpanded && setIsInputExpanded(true)}
                    className={`flex items-center justify-center bg-white/10 backdrop-blur-md border border-white/10 rounded-full transition-all ${isInputExpanded ? 'w-80 px-4' : 'w-32 cursor-pointer hover:bg-white/20'}`}
                >
                    {isInputExpanded ? (
                        <form onSubmit={createGoal} className="flex items-center w-full h-10">
                            <input
                                ref={inputRef}
                                type="text"
                                value={newGoalTitle}
                                onChange={(e) => setNewGoalTitle(e.target.value)}
                                onKeyDown={(e) => e.key === 'Escape' && (setIsInputExpanded(false), setNewGoalTitle(''))}
                                placeholder="What's your goal?"
                                className="flex-1 bg-transparent border-none outline-none text-white placeholder-white/50 text-sm"
                            />
                            <button type="button" onClick={() => (setIsInputExpanded(false), setNewGoalTitle(''))} className="p-1 text-white/50 hover:text-white">
                                <X className="w-4 h-4" />
                            </button>
                            <button type="submit" disabled={!newGoalTitle.trim()} className="p-1.5 bg-white text-black rounded-full disabled:opacity-50">
                                <Plus className="w-4 h-4" />
                            </button>
                        </form>
                    ) : (
                        <div className="flex items-center gap-2 py-2.5 text-white">
                            <Plus className="w-4 h-4" />
                            <span className="font-medium text-sm">New Goal</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Masonry Grid with album transition */}
            <div
                key={activeTab}
                className="relative animate-[fadeSlideIn_0.3s_ease-out]"
                style={{ height: containerHeight }}
            >
                {sortedGoals.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[50vh] text-center">
                        <Target className="w-16 h-16 text-white/20 mb-4" />
                        <h2 className="text-2xl font-light text-white/30 mb-2">No Goals Yet</h2>
                        <p className="text-white/20 mb-4">Start by adding your first goal</p>
                        <button onClick={() => setIsInputExpanded(true)} className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/10 text-white rounded-full transition-all">
                            Create Goal
                        </button>
                    </div>
                ) : (
                    sortedGoals.map((goal, index) => (
                        <GoalCard
                            key={goal.id}
                            goal={goal}
                            style={{
                                width: getColumnWidth(),
                                transform: `translate(${positions[goal.id]?.x || 0}px, ${positions[goal.id]?.y || 0}px)`,
                                animationDelay: `${index * 50}ms`
                            }}
                            onUpdate={updateGoal}
                            onDelete={initiateDelete}
                            onDragStart={handleDragStart}
                            onDragEnter={handleDragEnter}
                            onDragEnd={handleDragEnd}
                            onHeightChange={handleCardHeightChange}
                        />
                    ))
                )}
            </div>

            {/* Delete Dialog */}
            {deleteDialog.isOpen && (
                <Modal onClose={() => setDeleteDialog({ isOpen: false, goalId: null })}>
                    <h3 className="text-xl font-bold text-white mb-2">Delete Goal?</h3>
                    <p className="text-white/60 mb-6 text-sm">
                        {activeTab === 'all' ? "This will permanently remove this goal." : "Remove from album or delete completely?"}
                    </p>
                    <div className="flex justify-end gap-3">
                        <button onClick={() => setDeleteDialog({ isOpen: false, goalId: null })} className="px-4 py-2 rounded-xl text-white/70 hover:bg-white/10 text-sm">Cancel</button>
                        {activeTab !== 'all' && (
                            <button onClick={() => confirmDelete(false)} className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm">Remove from Album</button>
                        )}
                        <button onClick={() => confirmDelete(true)} className="px-4 py-2 rounded-xl bg-red-500/20 text-red-300 hover:bg-red-500/30 text-sm font-medium">Delete</button>
                    </div>
                </Modal>
            )}

            {/* Custom CSS Animations */}
            <style>{`
                @keyframes fadeSlideIn {
                    from {
                        opacity: 0;
                        transform: translateY(10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                @keyframes fadeSlideUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `}</style>

            {/* Toast Notification */}
            {toast.show && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-[fadeSlideUp_0.3s_ease-out]">
                    <div className="flex items-center gap-2 px-4 py-3 bg-green-500/20 backdrop-blur-xl border border-green-500/30 rounded-full shadow-lg">
                        <Check className="w-4 h-4 text-green-400" />
                        <span className="text-sm text-white font-medium">{toast.message}</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GoalsPage;

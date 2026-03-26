// components/JournalPage.tsx
// Main Journal / Daily Logs page

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useJournalStore } from '../store/useJournalStore';
import { JournalTopic, JournalEntry } from '../types';
import { cleanJournalTranscription } from '../services/ollamaCloudService';
import {
    Plus, Search, Calendar, BarChart3, ChevronRight, ChevronLeft,
    MoreVertical, Edit3, Trash2, Pin, X, Flame, BookOpen, Sparkles,
    Mic, MicOff, Image, Paperclip, Bell, BellOff, Settings
} from 'lucide-react';
import { MOODS } from './journal/constants';
import InlineEntryEditor from './journal/InlineEntryEditor';
import EntryEditorModal from './journal/EntryEditorModal';


// ==================== TOPIC CARD ====================
interface TopicCardProps {
    topic: JournalTopic;
    entryCount: number;
    recentEntry?: JournalEntry;
    onClick: () => void;
    onEdit: () => void;
    onDelete: () => void;
}

const TopicCard: React.FC<TopicCardProps> = ({
    topic, entryCount, recentEntry, onClick, onEdit, onDelete
}) => {
    const [showMenu, setShowMenu] = useState(false);

    return (
        <motion.div
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            className="relative group cursor-pointer"
        >
            <div
                className="p-5 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm
                           hover:bg-white/8 hover:border-white/20 transition-all duration-300 h-full"
                style={{
                    background: `linear-gradient(135deg, ${topic.color}15 0%, transparent 60%)`
                }}
            >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                    <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                        style={{ backgroundColor: `${topic.color}25` }}
                    >
                        {topic.icon}
                    </div>

                    <div className="relative">
                        <button
                            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                            className="p-2 rounded-lg opacity-0 group-hover:opacity-100 
                                       hover:bg-white/10 transition-all text-white/50"
                        >
                            <MoreVertical className="w-4 h-4" />
                        </button>

                        {/* Dropdown Menu */}
                        <AnimatePresence>
                            {showMenu && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: -5 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: -5 }}
                                    className="absolute right-0 mt-1 w-36 bg-[#1a1b23] border border-white/10 
                                               rounded-xl shadow-xl z-20 overflow-hidden"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <button
                                        onClick={() => { setShowMenu(false); onEdit(); }}
                                        className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-white/70 
                                                   hover:bg-white/10 hover:text-white transition-colors"
                                    >
                                        <Edit3 className="w-4 h-4" /> Edit
                                    </button>
                                    <button
                                        onClick={() => { setShowMenu(false); onDelete(); }}
                                        className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-400 
                                                   hover:bg-red-500/10 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" /> Delete
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Title & Stats */}
                <h3 className="text-lg font-bold text-white mb-1">{topic.name}</h3>
                <p className="text-sm text-white/50">{entryCount} {entryCount === 1 ? 'entry' : 'entries'}</p>

                {/* Recent Entry Preview */}
                {recentEntry && (
                    <div className="mt-4 pt-4 border-t border-white/5">
                        <p className="text-xs text-white/40 mb-1">
                            {new Date(recentEntry.date).toLocaleDateString('en-US', {
                                month: 'short', day: 'numeric'
                            })}
                        </p>
                        <p className="text-sm text-white/70 line-clamp-2">
                            {recentEntry.plainText?.slice(0, 80) || recentEntry.content.replace(/<[^>]*>/g, '').slice(0, 80)}...
                        </p>
                    </div>
                )}

                {/* Arrow indicator */}
                <div className="absolute right-4 bottom-4 opacity-0 group-hover:opacity-100 
                                transition-all transform translate-x-0 group-hover:translate-x-1">
                    <ChevronRight className="w-5 h-5 text-white/40" />
                </div>
            </div>
        </motion.div>
    );
};

// ==================== ENTRY CARD ====================
interface EntryCardProps {
    entry: JournalEntry;
    topicColor: string;
    onClick: () => void;
    onPin: () => void;
    onDelete: () => void;
}

const EntryCard: React.FC<EntryCardProps> = ({ entry, topicColor, onClick, onPin, onDelete }) => {
    const mood = MOODS.find(m => m.value === entry.mood);

    return (
        <motion.div
            whileHover={{ scale: 1.01 }}
            onClick={onClick}
            className="p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/8 
                       hover:border-white/20 transition-all cursor-pointer group"
        >
            <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                    <span className="text-sm text-white/50">
                        {new Date(entry.date).toLocaleDateString('en-US', {
                            weekday: 'short', month: 'short', day: 'numeric'
                        })}
                    </span>
                    {entry.pinned && (
                        <Pin className="w-3 h-3 text-amber-400 fill-amber-400" />
                    )}
                    {mood && (
                        <span className="text-sm" title={mood.label}>{mood.emoji}</span>
                    )}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={(e) => { e.stopPropagation(); onPin(); }}
                        className={`p-1.5 rounded-lg hover:bg-white/10 transition-colors
                                   ${entry.pinned ? 'text-amber-400' : 'text-white/40'}`}
                    >
                        <Pin className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(); }}
                        className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-colors"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            <p className="text-white/80 line-clamp-3 text-sm leading-relaxed">
                {entry.plainText || entry.content.replace(/<[^>]*>/g, '')}
            </p>

            <div className="mt-3 flex items-center gap-2">
                <div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: topicColor }}
                />
                <span className="text-xs text-white/30">
                    {new Date(entry.updatedAt).toLocaleTimeString('en-US', {
                        hour: 'numeric', minute: '2-digit'
                    })}
                </span>
            </div>
        </motion.div>
    );
};

// ==================== TOPIC MODAL ====================
interface TopicModalProps {
    isOpen: boolean;
    topic?: JournalTopic;
    onClose: () => void;
    onSave: (data: Omit<JournalTopic, 'id' | 'createdAt'>) => void;
}

const TOPIC_COLORS = [
    '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
    '#ec4899', '#f43f5e', '#ef4444', '#f97316',
    '#f59e0b', '#eab308', '#84cc16', '#22c55e',
    '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
];

const TOPIC_ICONS = [
    '💼', '📚', '🌟', '💡', '🎯', '🎨', '🎵', '✨',
    '🧠', '💪', '🏃', '🍎', '☕', '📝', '💻', '🎮',
];

const TopicModal: React.FC<TopicModalProps> = ({ isOpen, topic, onClose, onSave }) => {
    const [name, setName] = useState(topic?.name || '');
    const [color, setColor] = useState(topic?.color || TOPIC_COLORS[0]);
    const [icon, setIcon] = useState(topic?.icon || TOPIC_ICONS[0]);

    useEffect(() => {
        if (topic) {
            setName(topic.name);
            setColor(topic.color);
            setIcon(topic.icon);
        } else {
            setName('');
            setColor(TOPIC_COLORS[0]);
            setIcon(TOPIC_ICONS[0]);
        }
    }, [topic, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        onSave({ name: name.trim(), color, icon });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-[#1a1b23] border border-white/10 rounded-2xl p-6 w-full max-w-md"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="text-xl font-bold text-white mb-6">
                    {topic ? 'Edit Topic' : 'New Topic'}
                </h2>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Name */}
                    <div>
                        <label className="block text-sm text-white/50 mb-2">Topic Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., Work, Study, Personal..."
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl
                                       text-white placeholder:text-white/30 focus:outline-none 
                                       focus:border-indigo-500/50 transition-colors"
                            autoFocus
                        />
                    </div>

                    {/* Icon */}
                    <div>
                        <label className="block text-sm text-white/50 mb-2">Icon</label>
                        <div className="flex flex-wrap gap-2">
                            {TOPIC_ICONS.map((i) => (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => setIcon(i)}
                                    className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center
                                                transition-all ${icon === i
                                            ? 'bg-white/20 ring-2 ring-white/30'
                                            : 'bg-white/5 hover:bg-white/10'}`}
                                >
                                    {i}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Color */}
                    <div>
                        <label className="block text-sm text-white/50 mb-2">Color</label>
                        <div className="flex flex-wrap gap-2">
                            {TOPIC_COLORS.map((c) => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => setColor(c)}
                                    className={`w-8 h-8 rounded-full transition-all ${color === c ? 'ring-2 ring-offset-2 ring-offset-[#1a1b23]' : ''
                                        }`}
                                    style={{ backgroundColor: c, boxShadow: color === c ? `0 0 0 2px ${c}` : 'none' }}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Preview */}
                    <div className="pt-2">
                        <label className="block text-sm text-white/50 mb-2">Preview</label>
                        <div
                            className="flex items-center gap-3 p-3 rounded-xl border border-white/10"
                            style={{ background: `linear-gradient(135deg, ${color}15 0%, transparent 60%)` }}
                        >
                            <div
                                className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                                style={{ backgroundColor: `${color}25` }}
                            >
                                {icon}
                            </div>
                            <span className="text-white font-medium">{name || 'Topic Name'}</span>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 rounded-xl border border-white/10 text-white/70 
                                       hover:bg-white/5 transition-colors font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!name.trim()}
                            className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 
                                       text-white font-medium transition-colors disabled:opacity-50"
                        >
                            {topic ? 'Save Changes' : 'Create Topic'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </motion.div>
    );
};




// ==================== QUICK LOG FAB ====================
interface QuickLogFABProps {
    topics: JournalTopic[];
    onQuickSave: (topicId: string, content: string) => void;
    onOpenEditor: () => void;
}

const QuickLogFAB: React.FC<QuickLogFABProps> = ({ topics, onQuickSave, onOpenEditor }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [quickNote, setQuickNote] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [whisperAvailable, setWhisperAvailable] = useState(false);

    const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
    const audioChunksRef = React.useRef<Blob[]>([]);

    // Check if Whisper service is available
    useEffect(() => {
        const checkWhisper = async () => {
            if ((window as any).electronAPI?.whisper) {
                try {
                    const health = await (window as any).electronAPI.whisper.checkHealth();
                    setWhisperAvailable(health.status === 'ok');
                } catch {
                    setWhisperAvailable(true); // Assume available, will start on demand
                }
            }
        };
        checkWhisper();
    }, []);

    const handleQuickSave = (topicId: string) => {
        if (!quickNote.trim()) return;
        onQuickSave(topicId, quickNote.trim());
        setQuickNote('');
        setIsExpanded(false);
    };

    const startRecording = async () => {
        setError(null);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    sampleRate: 16000,
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true
                }
            });

            // Use WAV format for better Whisper compatibility
            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg'
            });

            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                // Stop all tracks
                stream.getTracks().forEach(track => track.stop());

                // Combine chunks into a single blob
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

                // Transcribe with Whisper
                await transcribeAudio(audioBlob);
            };

            mediaRecorderRef.current = mediaRecorder;
            mediaRecorder.start(1000); // Collect data every second
            setIsRecording(true);

        } catch (err: any) {
            console.error('Failed to start recording:', err);
            if (err.name === 'NotAllowedError') {
                setError('Microphone access denied.');
            } else {
                setError('Failed to start recording.');
            }
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            setIsTranscribing(true);
        }
    };

    const transcribeAudio = async (audioBlob: Blob) => {
        try {
            // Convert blob to array buffer for IPC
            const arrayBuffer = await audioBlob.arrayBuffer();

            // Check if Electron API is available
            if ((window as any).electronAPI?.whisper) {
                const result = await (window as any).electronAPI.whisper.transcribe(arrayBuffer);

                if (result.error) {
                    console.error('Transcription error:', result.error);
                    setError(result.error);
                } else if (result.text) {
                    try {
                        const cleanedText = await cleanJournalTranscription(result.text);
                        setQuickNote(prev => (prev + ' ' + cleanedText).trim());
                    } catch (cleanupError) {
                        console.error('Cleanup error:', cleanupError);
                        setQuickNote(prev => (prev + ' ' + result.text).trim());
                    }
                }
            } else {
                setError('Whisper service not available. Run in Electron.');
            }
        } catch (err: any) {
            console.error('Transcription failed:', err);
            setError('Transcription failed.');
        } finally {
            setIsTranscribing(false);
        }
    };

    const toggleVoiceRecording = () => {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    };

    return (
        <>
            {/* Backdrop */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsExpanded(false)}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
                    />
                )}
            </AnimatePresence>

            {/* FAB & Quick Entry Panel */}
            <div className="fixed bottom-8 right-8 z-50">
                <AnimatePresence mode="wait">
                    {isExpanded ? (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.8, y: 20 }}
                            className="bg-[#1a1b23] border border-white/10 rounded-2xl p-4 w-80 shadow-2xl"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-sm font-medium text-white">Quick Log</span>
                                <button
                                    onClick={() => setIsExpanded(false)}
                                    className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                                >
                                    <X className="w-4 h-4 text-white/50" />
                                </button>
                            </div>

                            {/* Input with voice indicator */}
                            <div className="relative">
                                <textarea
                                    value={quickNote}
                                    onChange={(e) => setQuickNote(e.target.value)}
                                    placeholder={isRecording ? "Recording..." : isTranscribing ? "Transcribing..." : "What's on your mind?"}
                                    className={`w-full h-24 bg-white/5 border rounded-xl p-3 
                                               text-white placeholder:text-white/30 resize-none focus:outline-none
                                               transition-colors text-sm ${isRecording
                                            ? 'border-red-500/50 focus:border-red-500/50'
                                            : isTranscribing
                                                ? 'border-amber-500/50 focus:border-amber-500/50'
                                                : 'border-white/10 focus:border-indigo-500/50'
                                        }`}
                                    autoFocus={!isRecording && !isTranscribing}
                                    disabled={isTranscribing}
                                />
                                {isRecording && (
                                    <div className="absolute top-2 right-2 flex items-center gap-1">
                                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                        <span className="text-xs text-red-400">Recording</span>
                                    </div>
                                )}
                                {isTranscribing && (
                                    <div className="absolute top-2 right-2 flex items-center gap-1">
                                        <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                                        <span className="text-xs text-amber-400">Transcribing...</span>
                                    </div>
                                )}
                            </div>

                            {/* Error Message */}
                            {error && (
                                <div className="mt-2 px-2 py-1 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-400">
                                    {error}
                                </div>
                            )}

                            {/* Voice & Actions Row */}
                            <div className="flex items-center gap-2 mt-3">
                                <button
                                    onClick={toggleVoiceRecording}
                                    disabled={isTranscribing}
                                    className={`p-2.5 rounded-xl border transition-all ${isRecording
                                        ? 'bg-red-500/20 border-red-500/30 text-red-400'
                                        : isTranscribing
                                            ? 'bg-amber-500/20 border-amber-500/30 text-amber-400 cursor-wait'
                                            : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white'
                                        }`}
                                    title={isRecording ? "Stop recording" : isTranscribing ? "Transcribing..." : "Voice to text (Local Whisper)"}
                                >
                                    {isRecording ? (
                                        <MicOff className="w-4 h-4" />
                                    ) : isTranscribing ? (
                                        <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <Mic className="w-4 h-4" />
                                    )}
                                </button>
                            </div>

                            {/* Topic Buttons */}
                            <div className="flex flex-wrap gap-2 mt-3">
                                {topics.slice(0, 4).map((topic) => (
                                    <button
                                        key={topic.id}
                                        onClick={() => handleQuickSave(topic.id)}
                                        disabled={!quickNote.trim()}
                                        className="px-3 py-1.5 rounded-lg text-xs font-medium 
                                                   bg-white/5 hover:bg-white/10 border border-white/10
                                                   disabled:opacity-30 disabled:cursor-not-allowed
                                                   transition-all flex items-center gap-1.5"
                                        style={{ color: topic.color }}
                                    >
                                        <span>{topic.icon}</span>
                                        {topic.name}
                                    </button>
                                ))}
                            </div>

                            {/* Full Editor Link */}
                            <div className="mt-4 pt-3 border-t border-white/5 flex justify-end">
                                <button
                                    onClick={() => { setIsExpanded(false); onOpenEditor(); }}
                                    className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                                >
                                    Open full editor →
                                </button>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.button
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setIsExpanded(true)}
                            className="w-14 h-14 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600
                                       flex items-center justify-center shadow-lg shadow-indigo-500/30
                                       hover:shadow-indigo-500/50 transition-all"
                        >
                            <Plus className="w-6 h-6 text-white" />
                        </motion.button>
                    )}
                </AnimatePresence>
            </div>
        </>
    );
};


// ==================== REMINDER SETTINGS ====================
interface ReminderSettingsProps {
    isOpen: boolean;
    onClose: () => void;
    enabled: boolean;
    time: string;
    onToggle: (enabled: boolean) => void;
    onTimeChange: (time: string) => void;
}

const ReminderSettings: React.FC<ReminderSettingsProps> = ({
    isOpen, onClose, enabled, time, onToggle, onTimeChange
}) => {
    const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

    useEffect(() => {
        if ('Notification' in window) {
            setNotificationPermission(Notification.permission);
        }
    }, [isOpen]);

    const requestNotificationPermission = async () => {
        if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            setNotificationPermission(permission);
            if (permission === 'granted') {
                onToggle(true);
            }
        }
    };

    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-[#1a1b23] border border-white/10 rounded-2xl p-6 w-full max-w-md"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Bell className="w-5 h-5 text-indigo-400" />
                        Daily Reminder
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-white/10 text-white/50 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="space-y-6">
                    {/* Enable Toggle */}
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-white font-medium">Enable Reminders</p>
                            <p className="text-sm text-white/50">Get notified to write in your journal</p>
                        </div>
                        <button
                            onClick={() => {
                                if (!enabled && notificationPermission !== 'granted') {
                                    requestNotificationPermission();
                                } else {
                                    onToggle(!enabled);
                                }
                            }}
                            className={`w-12 h-6 rounded-full transition-colors relative ${enabled ? 'bg-indigo-600' : 'bg-white/20'
                                }`}
                        >
                            <motion.div
                                animate={{ x: enabled ? 24 : 0 }}
                                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                className="w-6 h-6 rounded-full bg-white shadow-md absolute left-0 top-0"
                            />
                        </button>
                    </div>

                    {/* Time Picker */}
                    <div className={`transition-opacity ${enabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                        <label className="block text-sm text-white/50 mb-2">Reminder Time</label>
                        <input
                            type="time"
                            value={time}
                            onChange={(e) => onTimeChange(e.target.value)}
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl
                                       text-white focus:outline-none focus:border-indigo-500/50 
                                       transition-colors"
                        />
                    </div>

                    {/* Permission Status */}
                    {notificationPermission === 'denied' && (
                        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
                            <p className="font-medium mb-1">Notifications Blocked</p>
                            <p className="text-red-400/70">Please enable notifications in your browser settings to receive reminders.</p>
                        </div>
                    )}

                    {notificationPermission === 'default' && (
                        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-sm text-amber-400">
                            <p className="font-medium mb-1">Permission Required</p>
                            <p className="text-amber-400/70">Click enable to allow notifications.</p>
                        </div>
                    )}
                </div>

                <div className="mt-6 pt-4 border-t border-white/10">
                    <button
                        onClick={onClose}
                        className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 
                                   text-white font-medium transition-colors"
                    >
                        Done
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};


// ==================== STATS CARDS ====================
interface StatsOverviewProps {
    streak: number;
    weeklyStats: { total: number; mostActiveTopic: string | null };
    monthlyStats: { total: number; daysLogged: number };
}

const StatsOverview: React.FC<StatsOverviewProps> = ({ streak, weeklyStats, monthlyStats }) => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {/* Streak */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-orange-500/20 to-red-500/20 
                        border border-orange-500/20">
            <div className="flex items-center gap-2 mb-2">
                <Flame className="w-5 h-5 text-orange-400" />
                <span className="text-sm text-white/50">Streak</span>
            </div>
            <div className="text-3xl font-black text-white">{streak}</div>
            <div className="text-xs text-white/40">days</div>
        </div>

        {/* Weekly Entries */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 
                        border border-blue-500/20">
            <div className="flex items-center gap-2 mb-2">
                <BookOpen className="w-5 h-5 text-blue-400" />
                <span className="text-sm text-white/50">This Week</span>
            </div>
            <div className="text-3xl font-black text-white">{weeklyStats.total}</div>
            <div className="text-xs text-white/40">entries</div>
        </div>

        {/* Monthly */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 
                        border border-emerald-500/20">
            <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-5 h-5 text-emerald-400" />
                <span className="text-sm text-white/50">This Month</span>
            </div>
            <div className="text-3xl font-black text-white">{monthlyStats.daysLogged}</div>
            <div className="text-xs text-white/40">days logged</div>
        </div>

        {/* Most Active */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 
                        border border-purple-500/20">
            <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                <span className="text-sm text-white/50">Top Topic</span>
            </div>
            <div className="text-lg font-bold text-white truncate">
                {weeklyStats.mostActiveTopic || '—'}
            </div>
            <div className="text-xs text-white/40">this week</div>
        </div>
    </div>
);

// ==================== CALENDAR VIEW ====================
interface CalendarViewProps {
    entries: JournalEntry[];
    topics: JournalTopic[];
    onDayClick: (date: string) => void;
    onNewEntry: (date: string) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ entries, topics, onDayClick, onNewEntry }) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        const days: { date: Date; isCurrentMonth: boolean }[] = [];

        // Previous month days
        const prevMonthLastDay = new Date(year, month, 0).getDate();
        for (let i = startingDayOfWeek - 1; i >= 0; i--) {
            days.push({
                date: new Date(year, month - 1, prevMonthLastDay - i),
                isCurrentMonth: false
            });
        }

        // Current month days
        for (let i = 1; i <= daysInMonth; i++) {
            days.push({
                date: new Date(year, month, i),
                isCurrentMonth: true
            });
        }

        // Next month days to complete the grid
        const remainingDays = 42 - days.length;
        for (let i = 1; i <= remainingDays; i++) {
            days.push({
                date: new Date(year, month + 1, i),
                isCurrentMonth: false
            });
        }

        return days;
    };

    const getEntriesForDate = (date: Date) => {
        const dateStr = date.toISOString().split('T')[0];
        return entries.filter(e => e.date === dateStr);
    };

    const getAverageMood = (dayEntries: JournalEntry[]) => {
        const moods = dayEntries.filter(e => e.mood).map(e => e.mood!);
        if (moods.length === 0) return null;
        return Math.round(moods.reduce((a, b) => a + b, 0) / moods.length);
    };

    const days = getDaysInMonth(currentMonth);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const navigateMonth = (direction: number) => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + direction, 1));
    };

    return (
        <div className="space-y-6">
            {/* Month Navigation */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => navigateMonth(-1)}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 
                               text-white/70 hover:text-white transition-all"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <h2 className="text-xl font-bold text-white">
                    {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h2>
                <button
                    onClick={() => navigateMonth(1)}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 
                               text-white/70 hover:text-white transition-all"
                >
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>

            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center text-sm font-medium text-white/40 py-2">
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-2">
                {days.map((day, index) => {
                    const dayEntries = getEntriesForDate(day.date);
                    const hasEntries = dayEntries.length > 0;
                    const isToday = day.date.getTime() === today.getTime();
                    const avgMood = getAverageMood(dayEntries);
                    const moodInfo = avgMood ? MOODS.find(m => m.value === avgMood) : null;
                    const dateStr = day.date.toISOString().split('T')[0];

                    // Get unique topic colors for the day
                    const topicColors = [...new Set(dayEntries.map(e => {
                        const topic = topics.find(t => t.id === e.topicId);
                        return topic?.color || '#6366f1';
                    }))].slice(0, 3);

                    return (
                        <motion.button
                            key={index}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => hasEntries ? onDayClick(dateStr) : onNewEntry(dateStr)}
                            className={`
                                aspect-square p-2 rounded-xl border transition-all
                                ${!day.isCurrentMonth ? 'opacity-30' : ''}
                                ${isToday ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-[#111215]' : ''}
                                ${hasEntries
                                    ? 'bg-white/10 border-white/20 hover:bg-white/15'
                                    : 'bg-white/5 border-white/10 hover:bg-white/10'}
                            `}
                        >
                            <div className="h-full flex flex-col items-center justify-between">
                                <span className={`text-sm font-medium ${isToday ? 'text-indigo-400' : 'text-white/70'}`}>
                                    {day.date.getDate()}
                                </span>

                                {hasEntries && (
                                    <div className="flex flex-col items-center gap-1">
                                        {/* Mood indicator */}
                                        {moodInfo && (
                                            <span className="text-sm">{moodInfo.emoji}</span>
                                        )}

                                        {/* Topic dots */}
                                        <div className="flex gap-0.5">
                                            {topicColors.map((color, i) => (
                                                <div
                                                    key={i}
                                                    className="w-1.5 h-1.5 rounded-full"
                                                    style={{ backgroundColor: color }}
                                                />
                                            ))}
                                            {dayEntries.length > 3 && (
                                                <span className="text-[8px] text-white/40">+{dayEntries.length - 3}</span>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {!hasEntries && day.isCurrentMonth && (
                                    <Plus className="w-3 h-3 text-white/20" />
                                )}
                            </div>
                        </motion.button>
                    );
                })}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 pt-4 border-t border-white/10">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-white/10 border border-white/20" />
                    <span className="text-xs text-white/50">Has entries</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded ring-2 ring-indigo-500" />
                    <span className="text-xs text-white/50">Today</span>
                </div>
                <div className="flex items-center gap-2">
                    {MOODS.slice(0, 3).map(m => (
                        <span key={m.value} className="text-sm">{m.emoji}</span>
                    ))}
                    <span className="text-xs text-white/50">Mood</span>
                </div>
            </div>
        </div>
    );
};

// ==================== DAY VIEW MODAL ====================
interface DayViewModalProps {
    isOpen: boolean;
    date: string;
    entries: JournalEntry[];
    topics: JournalTopic[];
    onClose: () => void;
    onEditEntry: (entry: JournalEntry) => void;
    onNewEntry: () => void;
    onPinEntry: (id: string) => void;
    onDeleteEntry: (id: string) => void;
}

const DayViewModal: React.FC<DayViewModalProps> = ({
    isOpen, date, entries, topics, onClose, onEditEntry, onNewEntry, onPinEntry, onDeleteEntry
}) => {
    if (!isOpen) return null;

    const dateObj = new Date(date + 'T00:00:00');
    const formattedDate = dateObj.toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
    });

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-[#1a1b23] border border-white/10 rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-white">{formattedDate}</h2>
                        <p className="text-sm text-white/50">{entries.length} {entries.length === 1 ? 'entry' : 'entries'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onNewEntry}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-600 
                                       hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
                        >
                            <Plus className="w-4 h-4" /> Add Entry
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg hover:bg-white/10 text-white/50 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {entries.length === 0 ? (
                    <div className="p-12 text-center text-white/30 bg-white/5 rounded-xl border border-dashed border-white/10">
                        <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-50" />
                        <p className="font-medium mb-1">No entries for this day</p>
                        <p className="text-sm">Click "Add Entry" to write something</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {entries.map(entry => {
                            const topic = topics.find(t => t.id === entry.topicId);
                            const mood = MOODS.find(m => m.value === entry.mood);

                            return (
                                <motion.div
                                    key={entry.id}
                                    whileHover={{ scale: 1.01 }}
                                    onClick={() => onEditEntry(entry)}
                                    className="p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/8 
                                               hover:border-white/20 transition-all cursor-pointer group"
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            {topic && (
                                                <span
                                                    className="px-2 py-0.5 rounded-lg text-xs font-medium"
                                                    style={{
                                                        backgroundColor: `${topic.color}20`,
                                                        color: topic.color
                                                    }}
                                                >
                                                    {topic.icon} {topic.name}
                                                </span>
                                            )}
                                            {entry.pinned && <Pin className="w-3 h-3 text-amber-400 fill-amber-400" />}
                                            {mood && <span className="text-sm">{mood.emoji}</span>}
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onPinEntry(entry.id); }}
                                                className={`p-1.5 rounded-lg hover:bg-white/10 transition-colors
                                                           ${entry.pinned ? 'text-amber-400' : 'text-white/40'}`}
                                            >
                                                <Pin className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onDeleteEntry(entry.id); }}
                                                className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-colors"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-white/80 text-sm leading-relaxed">
                                        {entry.plainText || entry.content.replace(/<[^>]*>/g, '')}
                                    </p>
                                    <div className="mt-2 text-xs text-white/30">
                                        {new Date(entry.createdAt).toLocaleTimeString('en-US', {
                                            hour: 'numeric', minute: '2-digit'
                                        })}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </motion.div>
        </motion.div>
    );
};

// ==================== ANALYTICS VIEW ====================
interface AnalyticsViewProps {
    entries: JournalEntry[];
    topics: JournalTopic[];
}

const AnalyticsView: React.FC<AnalyticsViewProps> = ({ entries, topics }) => {
    // Calculate mood trend over last 30 days
    const getMoodTrend = () => {
        const last30Days: { date: string; avgMood: number | null; count: number }[] = [];
        const today = new Date();

        for (let i = 29; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const dayEntries = entries.filter(e => e.date === dateStr);
            const moods = dayEntries.filter(e => e.mood).map(e => e.mood!);

            last30Days.push({
                date: dateStr,
                avgMood: moods.length > 0 ? moods.reduce((a, b) => a + b, 0) / moods.length : null,
                count: dayEntries.length
            });
        }
        return last30Days;
    };

    // Calculate topic distribution
    const getTopicDistribution = () => {
        const distribution: { topic: JournalTopic; count: number; percentage: number }[] = [];
        const totalEntries = entries.length;

        topics.forEach(topic => {
            const count = entries.filter(e => e.topicId === topic.id).length;
            distribution.push({
                topic,
                count,
                percentage: totalEntries > 0 ? (count / totalEntries) * 100 : 0
            });
        });

        return distribution.sort((a, b) => b.count - a.count);
    };

    // Calculate mood distribution
    const getMoodDistribution = () => {
        const distribution = MOODS.map(mood => ({
            mood,
            count: entries.filter(e => e.mood === mood.value).length
        }));
        return distribution;
    };

    // Calculate activity heatmap data for last 12 weeks
    const getActivityHeatmap = () => {
        const weeks: { date: string; count: number; dayOfWeek: number }[][] = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let w = 11; w >= 0; w--) {
            const week: { date: string; count: number; dayOfWeek: number }[] = [];
            for (let d = 0; d < 7; d++) {
                const date = new Date(today);
                date.setDate(today.getDate() - (w * 7 + (6 - d)));
                const dateStr = date.toISOString().split('T')[0];
                week.push({
                    date: dateStr,
                    count: entries.filter(e => e.date === dateStr).length,
                    dayOfWeek: date.getDay()
                });
            }
            weeks.push(week);
        }
        return weeks;
    };

    const moodTrend = getMoodTrend();
    const topicDistribution = getTopicDistribution();
    const moodDistribution = getMoodDistribution();
    const activityHeatmap = getActivityHeatmap();

    const maxMoodCount = Math.max(...moodDistribution.map(m => m.count), 1);
    const maxActivityCount = Math.max(...activityHeatmap.flat().map(d => d.count), 1);

    return (
        <div className="space-y-8">
            {/* Activity Heatmap */}
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                <h3 className="text-lg font-bold text-white mb-4">Activity (Last 12 Weeks)</h3>
                <div className="flex gap-1">
                    {activityHeatmap.map((week, weekIndex) => (
                        <div key={weekIndex} className="flex flex-col gap-1">
                            {week.map((day, dayIndex) => {
                                const intensity = day.count / maxActivityCount;
                                return (
                                    <div
                                        key={dayIndex}
                                        className="w-3 h-3 rounded-sm transition-all hover:scale-125"
                                        style={{
                                            backgroundColor: day.count > 0
                                                ? `rgba(99, 102, 241, ${0.2 + intensity * 0.8})`
                                                : 'rgba(255, 255, 255, 0.05)'
                                        }}
                                        title={`${day.date}: ${day.count} entries`}
                                    />
                                );
                            })}
                        </div>
                    ))}
                </div>
                <div className="flex items-center justify-between mt-4 text-xs text-white/40">
                    <span>12 weeks ago</span>
                    <div className="flex items-center gap-1">
                        <span>Less</span>
                        {[0.1, 0.3, 0.5, 0.7, 1].map((opacity, i) => (
                            <div
                                key={i}
                                className="w-3 h-3 rounded-sm"
                                style={{ backgroundColor: `rgba(99, 102, 241, ${0.2 + opacity * 0.8})` }}
                            />
                        ))}
                        <span>More</span>
                    </div>
                    <span>Today</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Mood Trend Chart */}
                <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                    <h3 className="text-lg font-bold text-white mb-4">Mood Trend (30 Days)</h3>
                    <div className="h-40 flex items-end gap-1">
                        {moodTrend.map((day, index) => {
                            const height = day.avgMood ? (day.avgMood / 5) * 100 : 0;
                            const moodColor = day.avgMood ? MOODS[Math.round(day.avgMood) - 1]?.color : '#333';

                            return (
                                <div
                                    key={index}
                                    className="flex-1 flex flex-col items-center justify-end"
                                    title={`${day.date}: ${day.avgMood ? day.avgMood.toFixed(1) : 'No mood'}`}
                                >
                                    <div
                                        className="w-full rounded-t transition-all hover:opacity-80"
                                        style={{
                                            height: `${height}%`,
                                            backgroundColor: moodColor,
                                            minHeight: day.count > 0 ? '4px' : '0'
                                        }}
                                    />
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex justify-between mt-2 text-xs text-white/40">
                        <span>30 days ago</span>
                        <span>Today</span>
                    </div>
                </div>

                {/* Mood Distribution */}
                <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                    <h3 className="text-lg font-bold text-white mb-4">Mood Distribution</h3>
                    <div className="space-y-3">
                        {moodDistribution.map(({ mood, count }) => (
                            <div key={mood.value} className="flex items-center gap-3">
                                <span className="text-2xl w-8">{mood.emoji}</span>
                                <div className="flex-1">
                                    <div className="h-6 bg-white/5 rounded-lg overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${(count / maxMoodCount) * 100}%` }}
                                            transition={{ duration: 0.5, delay: mood.value * 0.1 }}
                                            className="h-full rounded-lg"
                                            style={{ backgroundColor: mood.color }}
                                        />
                                    </div>
                                </div>
                                <span className="text-sm text-white/50 w-12 text-right">{count}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Topic Distribution */}
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                <h3 className="text-lg font-bold text-white mb-4">Topic Distribution</h3>
                {topicDistribution.length === 0 ? (
                    <p className="text-white/50 text-center py-8">No entries yet</p>
                ) : (
                    <div className="space-y-4">
                        {topicDistribution.map(({ topic, count, percentage }) => (
                            <div key={topic.id} className="flex items-center gap-4">
                                <div
                                    className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                                    style={{ backgroundColor: `${topic.color}25` }}
                                >
                                    {topic.icon}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-medium text-white">{topic.name}</span>
                                        <span className="text-sm text-white/50">{count} entries · {percentage.toFixed(0)}%</span>
                                    </div>
                                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${percentage}%` }}
                                            transition={{ duration: 0.5 }}
                                            className="h-full rounded-full"
                                            style={{ backgroundColor: topic.color }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Writing Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center">
                    <div className="text-3xl font-black text-white mb-1">{entries.length}</div>
                    <div className="text-sm text-white/50">Total Entries</div>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center">
                    <div className="text-3xl font-black text-white mb-1">{topics.length}</div>
                    <div className="text-sm text-white/50">Topics</div>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center">
                    <div className="text-3xl font-black text-white mb-1">
                        {entries.filter(e => e.mood).length}
                    </div>
                    <div className="text-sm text-white/50">With Mood</div>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center">
                    <div className="text-3xl font-black text-white mb-1">
                        {entries.filter(e => e.pinned).length}
                    </div>
                    <div className="text-sm text-white/50">Pinned</div>
                </div>
            </div>
        </div>
    );
};


// ==================== MAIN JOURNAL PAGE ====================
type JournalView = 'home' | 'topic';

const JournalPage: React.FC = () => {
    const {
        topics, entries,
        addTopic, updateTopic, deleteTopic,
        addEntry, updateEntry, deleteEntry, togglePinEntry,
        selectedTopicId, setSelectedTopic,
        getEntriesForTopic, getStreak, getWeeklyStats, getMonthlyStats,
        // Reminder state
        reminder, setReminderEnabled, setReminderTime, markReminderNotified, shouldShowReminder
    } = useJournalStore();

    const [currentView, setCurrentView] = useState<JournalView>('home');
    const [viewMode, setViewMode] = useState<'Topics' | 'Calendar' | 'Analytics'>('Topics');
    const [searchQuery, setSearchQuery] = useState('');

    // Modals
    const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
    const [editingTopic, setEditingTopic] = useState<JournalTopic | undefined>();
    const [isEntryEditorOpen, setIsEntryEditorOpen] = useState(false);
    const [editingEntry, setEditingEntry] = useState<JournalEntry | undefined>();
    const [isReminderSettingsOpen, setIsReminderSettingsOpen] = useState(false);
    const [isInlineEditorOpen, setIsInlineEditorOpen] = useState(false);

    // Reminder notification check
    useEffect(() => {
        const checkReminder = () => {
            if (shouldShowReminder()) {
                // Show native notification
                if ('Notification' in window && Notification.permission === 'granted') {
                    new Notification('📓 Journal Reminder', {
                        body: "It's time to write in your journal! Capture your thoughts for today.",
                        icon: '/lumen_logo.png',
                        tag: 'journal-reminder',
                    });
                    markReminderNotified();
                }
            }
        };

        // Check immediately and then every minute
        checkReminder();
        const interval = setInterval(checkReminder, 60000);
        return () => clearInterval(interval);
    }, [shouldShowReminder, markReminderNotified]);

    // Stats
    const streak = getStreak();
    const weeklyStats = getWeeklyStats();
    const monthlyStats = getMonthlyStats();

    // Get current topic
    const currentTopic = topics.find(t => t.id === selectedTopicId);
    const currentTopicEntries = selectedTopicId ? getEntriesForTopic(selectedTopicId) : [];

    // Filter entries by search
    const filteredEntries = currentTopicEntries.filter(e =>
        !searchQuery || e.plainText?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.content.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Handlers
    const handleTopicClick = (topicId: string) => {
        setSelectedTopic(topicId);
        setCurrentView('topic');
        setIsInlineEditorOpen(false);
    };

    const handleBackToHome = () => {
        setSelectedTopic(null);
        setCurrentView('home');
        setSearchQuery('');
        setIsInlineEditorOpen(false);
    };

    const handleNewTopic = () => {
        setEditingTopic(undefined);
        setIsTopicModalOpen(true);
    };

    const handleEditTopic = (topic: JournalTopic) => {
        setEditingTopic(topic);
        setIsTopicModalOpen(true);
    };

    const handleSaveTopic = (data: Omit<JournalTopic, 'id' | 'createdAt'>) => {
        if (editingTopic) {
            updateTopic(editingTopic.id, data);
        } else {
            addTopic(data);
        }
    };

    const handleDeleteTopic = (topicId: string) => {
        if (confirm('Delete this topic and all its entries?')) {
            deleteTopic(topicId);
        }
    };

    const handleNewEntry = () => {
        setEditingEntry(undefined);
        if (currentView === 'topic') {
            setIsInlineEditorOpen(true);
        } else {
            setIsEntryEditorOpen(true);
        }
    };

    const handleEditEntry = (entry: JournalEntry) => {
        setEditingEntry(entry);
        setIsEntryEditorOpen(true);
    };

    const handleSaveEntry = (data: Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt'>) => {
        if (editingEntry) {
            updateEntry(editingEntry.id, data);
        } else {
            addEntry(data);
        }
    };

    const handleQuickSave = (topicId: string, content: string) => {
        addEntry({
            topicId,
            date: new Date().toISOString().split('T')[0],
            content,
            plainText: content,
            pinned: false,
        });
    };

    const handleDeleteEntry = (entryId: string) => {
        if (confirm('Delete this entry?')) {
            deleteEntry(entryId);
        }
    };

    // Calendar-specific state
    const [isDayViewOpen, setIsDayViewOpen] = useState(false);
    const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>('');
    const [preSelectedDate, setPreSelectedDate] = useState<string | null>(null);

    // Get entries for selected calendar date
    const selectedDateEntries = selectedCalendarDate
        ? entries.filter(e => e.date === selectedCalendarDate)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        : [];

    // Calendar handlers
    const handleCalendarDayClick = (date: string) => {
        setSelectedCalendarDate(date);
        setIsDayViewOpen(true);
    };

    const handleCalendarNewEntry = (date: string) => {
        setPreSelectedDate(date);
        setEditingEntry(undefined);
        setIsEntryEditorOpen(true);
    };

    const handleDayViewNewEntry = () => {
        setPreSelectedDate(selectedCalendarDate);
        setIsDayViewOpen(false);
        setEditingEntry(undefined);
        setIsEntryEditorOpen(true);
    };

    // Override handleNewEntry to use preSelectedDate
    const handleNewEntryWithDate = () => {
        setEditingEntry(undefined);
        setIsEntryEditorOpen(true);
    };

    // Initialize default topics if none exist
    useEffect(() => {
        if (topics.length === 0) {
            const defaultTopics = [
                { name: 'Work', color: '#6366f1', icon: '💼' },
                { name: 'Study', color: '#22c55e', icon: '📚' },
                { name: 'Personal', color: '#f59e0b', icon: '🌟' },
            ];
            defaultTopics.forEach(t => addTopic(t));
        }
    }, []);

    return (
        <div className="w-full h-full px-6 py-8 overflow-y-auto relative">
            <div className="max-w-[1200px] mx-auto">

                {/* Page Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                    <div className="flex items-center gap-4">
                        {currentView === 'topic' && (
                            <button
                                onClick={handleBackToHome}
                                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 
                                           text-white/70 hover:text-white transition-all"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                        )}
                        <div>
                            <h1 className="text-3xl font-black text-white mb-1 tracking-tight">
                                {currentView === 'topic' && currentTopic
                                    ? `${currentTopic.icon} ${currentTopic.name}`
                                    : 'Journal'}
                            </h1>
                            <p className="text-white/50 font-medium">
                                {currentView === 'topic'
                                    ? `${currentTopicEntries.length} entries`
                                    : 'Capture your thoughts, one day at a time.'}
                            </p>
                        </div>
                    </div>

                    {/* View Toggle & Settings (Home only) */}
                    {currentView === 'home' && (
                        <div className="flex items-center gap-3">
                            <div className="bg-white/5 p-1 rounded-xl border border-white/10 flex relative">
                                {(['Topics', 'Calendar', 'Analytics'] as const).map((mode) => (
                                    <button
                                        key={mode}
                                        onClick={() => setViewMode(mode)}
                                        className={`
                                            relative px-5 py-2 rounded-lg text-sm font-bold transition-colors z-10
                                            ${viewMode === mode ? 'text-black' : 'text-white/40 hover:text-white'}
                                        `}
                                    >
                                        {viewMode === mode && (
                                            <motion.div
                                                layoutId="journalActiveTab"
                                                className="absolute inset-0 bg-white rounded-lg shadow-lg -z-10"
                                                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                                            />
                                        )}
                                        {mode}
                                    </button>
                                ))}
                            </div>
                            {/* Reminder Settings Button */}
                            <button
                                onClick={() => setIsReminderSettingsOpen(true)}
                                className={`p-2.5 rounded-xl border transition-all ${reminder.enabled
                                    ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-400'
                                    : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white'
                                    }`}
                                title="Daily Reminder Settings"
                            >
                                {reminder.enabled ? (
                                    <Bell className="w-4 h-4" />
                                ) : (
                                    <BellOff className="w-4 h-4" />
                                )}
                            </button>
                        </div>
                    )}

                    {/* Search (Topic view only) */}
                    {currentView === 'topic' && (
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search entries..."
                                className="pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl
                                           text-white placeholder:text-white/30 focus:outline-none 
                                           focus:border-indigo-500/50 transition-colors w-64"
                            />
                        </div>
                    )}
                </div>

                {/* Content */}
                <AnimatePresence mode="wait">
                    {currentView === 'home' ? (
                        <motion.div
                            key={`home-${viewMode}`}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.2 }}
                        >
                            {viewMode === 'Topics' && (
                                <>
                                    {/* Stats Overview */}
                                    <StatsOverview
                                        streak={streak}
                                        weeklyStats={weeklyStats}
                                        monthlyStats={monthlyStats}
                                    />

                                    {/* Topics Grid */}
                                    <div className="flex items-center justify-between mb-4">
                                        <h2 className="text-lg font-bold text-white">Your Topics</h2>
                                        <button
                                            onClick={handleNewTopic}
                                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 
                                                       hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
                                        >
                                            <Plus className="w-4 h-4" /> New Topic
                                        </button>
                                    </div>

                                    {topics.length === 0 ? (
                                        <div className="p-20 text-center text-white/30 bg-white/5 backdrop-blur-md 
                                                        border border-white/10 rounded-3xl border-dashed">
                                            <p className="text-lg font-medium mb-1">No topics yet</p>
                                            <p className="text-sm">Create your first topic to start journaling</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {topics.map(topic => {
                                                const topicEntries = getEntriesForTopic(topic.id);
                                                return (
                                                    <TopicCard
                                                        key={topic.id}
                                                        topic={topic}
                                                        entryCount={topicEntries.length}
                                                        recentEntry={topicEntries[0]}
                                                        onClick={() => handleTopicClick(topic.id)}
                                                        onEdit={() => handleEditTopic(topic)}
                                                        onDelete={() => handleDeleteTopic(topic.id)}
                                                    />
                                                );
                                            })}
                                        </div>
                                    )}
                                </>
                            )}

                            {viewMode === 'Calendar' && (
                                <CalendarView
                                    entries={entries}
                                    topics={topics}
                                    onDayClick={handleCalendarDayClick}
                                    onNewEntry={handleCalendarNewEntry}
                                />
                            )}

                            {viewMode === 'Analytics' && (
                                <AnalyticsView
                                    entries={entries}
                                    topics={topics}
                                />
                            )}
                        </motion.div>
                    ) : (
                        <motion.div
                            key="topic"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.2 }}
                        >
                            {/* New Entry Button */}
                            {!isInlineEditorOpen && (
                                <div className="flex justify-end mb-4">
                                    <button
                                        onClick={handleNewEntry}
                                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 
                                                   hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
                                    >
                                        <Plus className="w-4 h-4" /> New Entry
                                    </button>
                                </div>
                            )}

                            {/* Inline Editor */}
                            <InlineEntryEditor
                                isOpen={isInlineEditorOpen}
                                topicId={currentTopic?.id || ''}
                                topicColor={currentTopic?.color || '#6366f1'}
                                onClose={() => setIsInlineEditorOpen(false)}
                                onSave={handleSaveEntry}
                            />

                            {/* Entries List */}
                            {filteredEntries.length === 0 ? (
                                <div className="p-16 text-center text-white/30 bg-white/5 backdrop-blur-md 
                                                border border-white/10 rounded-2xl border-dashed">
                                    <p className="text-lg font-medium mb-1">
                                        {searchQuery ? 'No entries found' : 'No entries yet'}
                                    </p>
                                    <p className="text-sm">
                                        {searchQuery ? 'Try a different search' : 'Start writing your first entry'}
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {/* Pinned entries first */}
                                    {filteredEntries.filter(e => e.pinned).map(entry => (
                                        <EntryCard
                                            key={entry.id}
                                            entry={entry}
                                            topicColor={currentTopic?.color || '#6366f1'}
                                            onClick={() => handleEditEntry(entry)}
                                            onPin={() => togglePinEntry(entry.id)}
                                            onDelete={() => handleDeleteEntry(entry.id)}
                                        />
                                    ))}
                                    {/* Then the rest */}
                                    {filteredEntries.filter(e => !e.pinned).map(entry => (
                                        <EntryCard
                                            key={entry.id}
                                            entry={entry}
                                            topicColor={currentTopic?.color || '#6366f1'}
                                            onClick={() => handleEditEntry(entry)}
                                            onPin={() => togglePinEntry(entry.id)}
                                            onDelete={() => handleDeleteEntry(entry.id)}
                                        />
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Quick Log FAB */}
            <QuickLogFAB
                topics={topics}
                onQuickSave={handleQuickSave}
                onOpenEditor={handleNewEntry}
            />

            {/* Topic Modal */}
            <AnimatePresence>
                {isTopicModalOpen && (
                    <TopicModal
                        isOpen={isTopicModalOpen}
                        topic={editingTopic}
                        onClose={() => setIsTopicModalOpen(false)}
                        onSave={handleSaveTopic}
                    />
                )}
            </AnimatePresence>

            {/* Entry Editor Modal */}
            <AnimatePresence>
                {isEntryEditorOpen && (
                    <EntryEditorModal
                        isOpen={isEntryEditorOpen}
                        entry={editingEntry}
                        topicId={preSelectedDate ? null : selectedTopicId}
                        topics={topics}
                        onClose={() => {
                            setIsEntryEditorOpen(false);
                            setPreSelectedDate(null);
                        }}
                        onSave={(data) => {
                            // If preSelectedDate is set, use it instead
                            const finalData = preSelectedDate
                                ? { ...data, date: preSelectedDate }
                                : data;
                            handleSaveEntry(finalData);
                            setPreSelectedDate(null);
                        }}
                    />
                )}
            </AnimatePresence>

            {/* Day View Modal (Calendar) */}
            <AnimatePresence>
                {isDayViewOpen && (
                    <DayViewModal
                        isOpen={isDayViewOpen}
                        date={selectedCalendarDate}
                        entries={selectedDateEntries}
                        topics={topics}
                        onClose={() => setIsDayViewOpen(false)}
                        onEditEntry={(entry) => {
                            setIsDayViewOpen(false);
                            handleEditEntry(entry);
                        }}
                        onNewEntry={handleDayViewNewEntry}
                        onPinEntry={togglePinEntry}
                        onDeleteEntry={handleDeleteEntry}
                    />
                )}
            </AnimatePresence>

            {/* Reminder Settings Modal */}
            <AnimatePresence>
                {isReminderSettingsOpen && (
                    <ReminderSettings
                        isOpen={isReminderSettingsOpen}
                        onClose={() => setIsReminderSettingsOpen(false)}
                        enabled={reminder.enabled}
                        time={reminder.time}
                        onToggle={setReminderEnabled}
                        onTimeChange={setReminderTime}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default JournalPage;

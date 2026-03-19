import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    Sparkles,
    Loader2,
    X,
    Video,
    Volume2,
    Check,
    Trash2,
    Play,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import { useFocusStore } from '../store/useFocusStore';
import { ENVIRONMENTS, Environment, MAX_SELECTION } from '../data/environments';
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

// =============================================================================
// AI CURATOR SERVICE
// =============================================================================

const getSmartSelection = async (mood: string): Promise<string[]> => {
    try {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        if (!apiKey) return [];

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: SchemaType.ARRAY,
                    items: { type: SchemaType.STRING }
                }
            }
        });

        const availableEnvList = ENVIRONMENTS.map(e => ({
            id: e.id, title: e.title, description: e.description, tags: e.tags.join(", ")
        }));

        const prompt = `Select exactly 6 environment IDs from this list that best match the mood "${mood}": ${JSON.stringify(availableEnvList)}. Return ONLY a JSON array of ID strings.`;
        const result = await model.generateContent(prompt);
        return JSON.parse(result.response.text() || '[]');
    } catch {
        return [];
    }
};

// =============================================================================
// SCOPED STYLES
// =============================================================================

const STORE_STYLES = `
    .env-store ::-webkit-scrollbar { height: 0; width: 0; }
    .env-row-scroll {
        scroll-behavior: smooth;
        -webkit-overflow-scrolling: touch;
        scrollbar-width: none;
    }
    .env-card:hover .env-card-thumb { transform: scale(1.05); }
    .env-card-thumb { transition: transform 0.6s ease, opacity 0.5s ease; }
    .env-card-video { transition: opacity 0.5s ease; }
`;

// =============================================================================
// HERO SECTION
// =============================================================================

interface HeroSectionProps {
    environment: Environment;
    isSelected: boolean;
    onToggle: (id: string) => void;
    onSetActive: (id: string) => void;
    isActive: boolean;
}

const HeroSection: React.FC<HeroSectionProps> = ({ environment, isSelected, onToggle, onSetActive, isActive }) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (videoRef.current && environment.videoUrl) {
            videoRef.current.play().catch(() => { });
        }
    }, [environment.videoUrl, environment.id]);

    return (
        <div className="relative w-full h-[320px] md:h-[380px] overflow-hidden rounded-2xl mb-10">
            {/* Thumbnail */}
            <img src={environment.thumbnailUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />

            {/* Video */}
            {environment.videoUrl && (
                <video
                    ref={videoRef}
                    key={environment.id}
                    src={environment.videoUrl}
                    muted loop playsInline
                    className="absolute inset-0 w-full h-full object-cover"
                />
            )}

            {/* Overlays */}
            <div className="absolute inset-0" style={{
                background: 'linear-gradient(to right, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.55) 45%, rgba(0,0,0,0.2) 100%)'
            }} />
            <div className="absolute bottom-0 left-0 right-0 h-28" style={{
                background: 'linear-gradient(to top, var(--bg, #0f0f13) 0%, transparent 100%)'
            }} />

            {/* Content */}
            <div className="absolute inset-0 flex flex-col justify-end p-8 md:p-10">
                <div className="max-w-md">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/40 mb-2 block">
                        {environment.category}
                    </span>
                    <h1 className="text-2xl md:text-3xl font-bold text-white/95 mb-2 leading-tight">
                        {environment.icon && <span className="mr-2">{environment.icon}</span>}
                        {environment.title}
                    </h1>
                    <p className="text-sm text-white/45 mb-5 leading-relaxed">
                        {environment.description}
                    </p>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1.5 mb-5">
                        {environment.tags.map(tag => (
                            <span key={tag} className="px-2 py-0.5 rounded-full text-[10px] text-white/35 bg-white/5 border border-white/5">
                                {tag}
                            </span>
                        ))}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2.5">
                        <button
                            onClick={() => onSetActive(environment.id)}
                            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium transition-all ${
                                isActive
                                    ? 'bg-white/10 border border-white/15 text-white/70'
                                    : 'bg-white/10 hover:bg-white/15 border border-white/10 text-white/80'
                            }`}
                        >
                            {isActive ? (
                                <><span className="w-1.5 h-1.5 rounded-full bg-green-400/80" /> Playing</>
                            ) : (
                                <><Play size={13} /> Set Active</>
                            )}
                        </button>

                        <button
                            onClick={() => onToggle(environment.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                                isSelected
                                    ? 'bg-white/8 border-white/15 text-white/60'
                                    : 'bg-transparent border-white/8 text-white/45 hover:bg-white/5 hover:text-white/65'
                            }`}
                        >
                            {isSelected ? <><Check size={13} /> Saved</> : '+ Save'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Media badges */}
            <div className="absolute top-4 right-4 flex gap-1.5">
                {environment.video && (
                    <div className="w-7 h-7 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
                        <Video size={11} className="text-white/50" />
                    </div>
                )}
                {environment.audio && (
                    <div className="w-7 h-7 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
                        <Volume2 size={11} className="text-white/50" />
                    </div>
                )}
            </div>
        </div>
    );
};

// =============================================================================
// ENVIRONMENT CARD
// =============================================================================

interface EnvironmentCardProps {
    environment: Environment;
    isSelected: boolean;
    isActive: boolean;
    onToggle: (id: string) => void;
    onSetActive: (id: string) => void;
    onFeature: (env: Environment) => void;
}

const EnvironmentCard: React.FC<EnvironmentCardProps> = ({
    environment, isSelected, isActive, onToggle, onSetActive, onFeature
}) => {
    const [isHovered, setIsHovered] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (videoRef.current) {
            if (isHovered && environment.videoUrl) {
                videoRef.current.play().catch(() => { });
            } else {
                videoRef.current.pause();
                videoRef.current.currentTime = 0;
            }
        }
    }, [isHovered, environment.videoUrl]);

    return (
        <div
            className="env-card group relative flex-shrink-0 w-[210px] md:w-[240px] select-none"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Card media */}
            <div
                onClick={() => onFeature(environment)}
                className={`
                    relative aspect-[16/10] rounded-xl overflow-hidden cursor-pointer transition-all duration-300 border
                    ${isSelected ? 'border-white/20' : isActive ? 'border-white/15' : 'border-transparent hover:border-white/10'}
                `}
            >
                <img
                    src={environment.thumbnailUrl}
                    alt={environment.title}
                    className={`env-card-thumb absolute inset-0 w-full h-full object-cover ${isHovered && environment.videoUrl ? 'opacity-0' : ''}`}
                />

                {environment.videoUrl && (
                    <video
                        ref={videoRef}
                        src={environment.videoUrl}
                        muted loop playsInline
                        className={`env-card-video absolute inset-0 w-full h-full object-cover ${isHovered ? 'opacity-100' : 'opacity-0'}`}
                    />
                )}

                {/* Bottom gradient */}
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent" />

                {/* Selection check */}
                {isSelected && (
                    <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center z-10">
                        <Check size={11} className="text-white/80" strokeWidth={2.5} />
                    </div>
                )}

                {/* Active indicator */}
                {isActive && !isSelected && (
                    <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center z-10">
                        <span className="w-2 h-2 rounded-full bg-green-400/70" />
                    </div>
                )}

                {/* Hover play icon */}
                {!isSelected && !isActive && isHovered && environment.videoUrl && (
                    <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
                        <Play size={8} fill="white" className="text-white/70 ml-0.5" />
                    </div>
                )}

                {/* Hover action buttons */}
                <AnimatePresence>
                    {isHovered && (
                        <motion.div
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 4 }}
                            transition={{ duration: 0.15 }}
                            className="absolute bottom-2 left-2 right-2 flex gap-1.5 z-10"
                        >
                            <button
                                onClick={(e) => { e.stopPropagation(); onSetActive(environment.id); }}
                                className="px-2 py-1 rounded-md text-[9px] font-medium bg-black/40 backdrop-blur-sm text-white/70 hover:text-white border border-white/8 transition-colors"
                            >
                                {isActive ? '● Active' : '▶ Play'}
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); onToggle(environment.id); }}
                                className="px-2 py-1 rounded-md text-[9px] font-medium bg-black/40 backdrop-blur-sm text-white/70 hover:text-white border border-white/8 transition-colors"
                            >
                                {isSelected ? '✓ Saved' : '+ Save'}
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Text */}
            <div className="mt-2 px-0.5">
                <h3 className="text-[12px] font-medium text-white/75 truncate group-hover:text-white/90 transition-colors">
                    {environment.icon && <span className="mr-1">{environment.icon}</span>}
                    {environment.title}
                </h3>
                <p className="text-[10px] text-white/30 mt-0.5 line-clamp-1">{environment.description}</p>
            </div>
        </div>
    );
};

// =============================================================================
// CATEGORY ROW
// =============================================================================

interface CategoryRowProps {
    category: string;
    environments: Environment[];
    savedIds: string[];
    activeEnvironmentId: string | null;
    onToggle: (id: string) => void;
    onSetActive: (id: string) => void;
    onFeature: (env: Environment) => void;
}

const CategoryRow: React.FC<CategoryRowProps> = ({
    category, environments, savedIds, activeEnvironmentId, onToggle, onSetActive, onFeature
}) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const checkScroll = useCallback(() => {
        if (!scrollRef.current) return;
        const el = scrollRef.current;
        setCanScrollLeft(el.scrollLeft > 5);
        setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 5);
    }, []);

    useEffect(() => {
        checkScroll();
        const el = scrollRef.current;
        if (el) el.addEventListener('scroll', checkScroll, { passive: true });
        return () => { el?.removeEventListener('scroll', checkScroll); };
    }, [checkScroll]);

    const scroll = (dir: 'left' | 'right') => {
        if (!scrollRef.current) return;
        scrollRef.current.scrollBy({ left: dir === 'left' ? -500 : 500, behavior: 'smooth' });
    };

    if (environments.length === 0) return null;

    return (
        <div className="mb-8 group/row">
            <div className="flex items-center justify-between mb-3 px-0.5">
                <h2 className="text-[13px] font-semibold text-white/70">
                    {category}
                    <span className="ml-2 text-[11px] font-normal text-white/25">{environments.length}</span>
                </h2>

                <div className="flex gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
                    <button
                        onClick={() => scroll('left')}
                        disabled={!canScrollLeft}
                        className="w-7 h-7 rounded-lg bg-white/4 hover:bg-white/8 flex items-center justify-center text-white/40 hover:text-white/70 disabled:opacity-20 transition-all border border-white/5"
                    >
                        <ChevronLeft size={13} />
                    </button>
                    <button
                        onClick={() => scroll('right')}
                        disabled={!canScrollRight}
                        className="w-7 h-7 rounded-lg bg-white/4 hover:bg-white/8 flex items-center justify-center text-white/40 hover:text-white/70 disabled:opacity-20 transition-all border border-white/5"
                    >
                        <ChevronRight size={13} />
                    </button>
                </div>
            </div>

            <div ref={scrollRef} className="env-row-scroll flex gap-3.5 overflow-x-auto pb-2">
                {environments.map(env => (
                    <EnvironmentCard
                        key={env.id}
                        environment={env}
                        isSelected={savedIds.includes(env.id)}
                        isActive={activeEnvironmentId === env.id}
                        onToggle={onToggle}
                        onSetActive={onSetActive}
                        onFeature={onFeature}
                    />
                ))}
            </div>
        </div>
    );
};

// =============================================================================
// SELECTION DOCK
// =============================================================================

interface SelectionDockProps {
    selectedEnvs: Environment[];
    maxSlots: number;
    onRemove: (id: string) => void;
    onClear: () => void;
    onMix: () => void;
}

const SelectionDock: React.FC<SelectionDockProps> = ({ selectedEnvs, maxSlots, onRemove, onClear, onMix }) => {
    const count = selectedEnvs.length;
    if (count === 0) return null;

    return (
        <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50"
        >
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-black/70 backdrop-blur-xl border border-white/8">
                {/* Count */}
                <div className="flex items-baseline gap-0.5 min-w-[40px] px-1">
                    <span className="text-lg font-bold tabular-nums text-white/80">{count}</span>
                    <span className="text-white/25 text-xs">/{maxSlots}</span>
                </div>

                <div className="w-px h-8 bg-white/8" />

                {/* Thumbnails */}
                <div className="flex items-center gap-1.5">
                    {selectedEnvs.map(env => (
                        <div key={env.id} className="group/t relative">
                            <div className="w-8 h-8 rounded-lg overflow-hidden border border-white/8 group-hover/t:border-white/20 transition-colors">
                                <img src={env.thumbnailUrl} alt={env.title} className="w-full h-full object-cover" />
                            </div>
                            <button
                                onClick={() => onRemove(env.id)}
                                className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-black/80 border border-white/10 flex items-center justify-center opacity-0 group-hover/t:opacity-100 transition-opacity hover:bg-white/20"
                            >
                                <X size={6} className="text-white/70" />
                            </button>
                        </div>
                    ))}

                    {Array.from({ length: maxSlots - count }).map((_, i) => (
                        <div key={`e-${i}`} className="w-8 h-8 rounded-lg border border-dashed border-white/8 flex items-center justify-center">
                            <div className="w-1 h-1 rounded-full bg-white/10" />
                        </div>
                    ))}
                </div>

                <div className="w-px h-8 bg-white/8" />

                {/* Actions */}
                <div className="flex items-center gap-1">
                    <button onClick={onClear} className="p-1.5 rounded-lg hover:bg-white/8 text-white/30 hover:text-white/60 transition-colors" title="Clear">
                        <Trash2 size={13} />
                    </button>
                    <button
                        onClick={onMix}
                        className="flex items-center gap-1.5 bg-white/8 hover:bg-white/12 text-white/70 px-3.5 py-1.5 rounded-lg text-[11px] font-medium transition-all border border-white/6"
                    >
                        <Sparkles size={11} />
                        AI Mix
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

// =============================================================================
// AI CURATOR MODAL
// =============================================================================

interface AICuratorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onApply: (ids: string[]) => void;
}

const AICuratorModal: React.FC<AICuratorModalProps> = ({ isOpen, onClose, onApply }) => {
    const [mood, setMood] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!mood.trim()) return;
        setIsLoading(true);
        setError('');
        try {
            const ids = await getSmartSelection(mood);
            if (ids.length === 6) {
                onApply(ids);
                onClose();
                setMood('');
            } else {
                setError('Could not find enough matches. Try different keywords.');
            }
        } catch {
            setError('AI service unavailable. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const suggestions = [
        { label: '🌧️ Rainy night', value: 'Rainy night coding' },
        { label: '🌿 Nature retreat', value: 'Peaceful nature retreat' },
        { label: '🚀 Futuristic', value: 'Futuristic workspace' },
        { label: '🔥 Cozy evening', value: 'Cozy winter evening' },
    ];

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
        >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            <motion.div
                initial={{ scale: 0.97, y: 10 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.97, y: 10 }}
                className="relative w-full max-w-md rounded-2xl bg-[var(--bg,#0f0f13)]/95 backdrop-blur-xl border border-white/8 overflow-hidden"
            >
                <div className="p-6">
                    <div className="flex justify-between items-start mb-5">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-white/6 flex items-center justify-center border border-white/8">
                                <Sparkles size={16} className="text-white/60" />
                            </div>
                            <div>
                                <h2 className="text-sm font-semibold text-white/90">AI Curator</h2>
                                <p className="text-white/35 text-[11px]">Describe your ideal atmosphere</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/6 text-white/30 hover:text-white/60 transition-colors">
                            <X size={14} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <input
                            type="text" value={mood} onChange={(e) => setMood(e.target.value)}
                            placeholder="e.g., 'Calm forest with rain sounds'"
                            className="w-full bg-white/4 border border-white/8 rounded-xl px-4 py-2.5 text-white/90 text-sm placeholder-white/20 focus:outline-none focus:border-white/15 transition-colors"
                            autoFocus
                        />

                        <div className="flex flex-wrap gap-1.5 mt-3 mb-4">
                            {suggestions.map(s => (
                                <button
                                    key={s.value} type="button" onClick={() => setMood(s.value)}
                                    className="px-2.5 py-1 rounded-lg bg-white/4 hover:bg-white/8 text-white/40 hover:text-white/65 text-[11px] transition-colors border border-white/5"
                                >
                                    {s.label}
                                </button>
                            ))}
                        </div>

                        {error && <p className="text-red-400/80 text-xs mb-3">{error}</p>}

                        <button
                            type="submit" disabled={isLoading || !mood.trim()}
                            className="w-full bg-white/8 hover:bg-white/12 disabled:opacity-30 text-white/80 font-medium py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 text-sm border border-white/6"
                        >
                            {isLoading ? <><Loader2 size={14} className="animate-spin" /> Curating...</> : <><Sparkles size={13} /> Generate</>}
                        </button>
                    </form>
                </div>
            </motion.div>
        </motion.div>
    );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const EnvironmentStoreApp: React.FC = () => {
    const savedIds = useFocusStore((s) => s.savedEnvironmentIds);
    const setSavedIds = useFocusStore((s) => s.setSavedEnvironmentIds);
    const toggleSavedId = useFocusStore((s) => s.toggleSavedEnvironmentId);
    const activeEnvironmentId = useFocusStore((s) => s.activeEnvironmentId);
    const setActiveEnvironmentId = useFocusStore((s) => s.setActiveEnvironmentId);

    const [searchTerm, setSearchTerm] = useState('');
    const [isCuratorOpen, setIsCuratorOpen] = useState(false);
    const [featuredEnv, setFeaturedEnv] = useState<Environment>(() => {
        if (activeEnvironmentId) {
            const active = ENVIRONMENTS.find(e => e.id === activeEnvironmentId);
            if (active) return active;
        }
        return ENVIRONMENTS[Math.floor(Math.random() * ENVIRONMENTS.length)];
    });

    const categories = ['Nature', 'Urban', 'Sci-Fi', 'Abstract'] as const;

    const environmentsByCategory = useMemo(() => {
        const filtered = ENVIRONMENTS.filter(env => {
            if (!searchTerm) return true;
            const q = searchTerm.toLowerCase();
            return env.title.toLowerCase().includes(q) ||
                env.tags.some(t => t.toLowerCase().includes(q)) ||
                env.description.toLowerCase().includes(q);
        });
        const grouped: Record<string, Environment[]> = {};
        categories.forEach(cat => { grouped[cat] = filtered.filter(env => env.category === cat); });
        return grouped;
    }, [searchTerm]);

    const selectedEnvironments = ENVIRONMENTS.filter(env => savedIds.includes(env.id));

    const handleSetActive = (id: string) => {
        setActiveEnvironmentId(activeEnvironmentId === id ? null : id);
    };

    return (
        <div className="env-store min-h-full text-white pb-28 overflow-y-auto">
            <style>{STORE_STYLES}</style>

            {/* Header */}
            <header className="sticky top-0 z-40 bg-[var(--bg,#0f0f13)]/80 backdrop-blur-xl border-b border-white/5">
                <div className="max-w-[1300px] mx-auto px-6 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-white/6 flex items-center justify-center border border-white/6">
                            <Sparkles size={12} className="text-white/50" />
                        </div>
                        <h1 className="font-semibold text-sm text-white/80">Environments</h1>
                    </div>

                    <div className="flex items-center gap-2.5">
                        <div className="relative">
                            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
                            <input
                                type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search..."
                                className="w-40 md:w-48 bg-white/4 border border-white/6 rounded-lg py-1.5 pl-8 pr-3 text-[11px] text-white/80 placeholder-white/20 focus:outline-none focus:border-white/12 transition-colors"
                            />
                        </div>
                        <button
                            onClick={() => setIsCuratorOpen(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/4 hover:bg-white/7 border border-white/6 text-[11px] font-medium text-white/40 hover:text-white/60 transition-all"
                        >
                            <Sparkles size={10} />
                            <span className="hidden md:inline">AI Curator</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Content */}
            <div className="max-w-[1300px] mx-auto px-6 pt-6">
                <HeroSection
                    environment={featuredEnv}
                    isSelected={savedIds.includes(featuredEnv.id)}
                    isActive={activeEnvironmentId === featuredEnv.id}
                    onToggle={toggleSavedId}
                    onSetActive={handleSetActive}
                />

                {categories.map(cat => (
                    <CategoryRow
                        key={cat}
                        category={cat}
                        environments={environmentsByCategory[cat] || []}
                        savedIds={savedIds}
                        activeEnvironmentId={activeEnvironmentId}
                        onToggle={toggleSavedId}
                        onSetActive={handleSetActive}
                        onFeature={env => setFeaturedEnv(env)}
                    />
                ))}

                {Object.values(environmentsByCategory).every(arr => arr.length === 0) && searchTerm && (
                    <div className="text-center py-16">
                        <p className="text-white/30 text-sm">No results for "{searchTerm}"</p>
                        <button onClick={() => setSearchTerm('')} className="mt-2 text-white/40 hover:text-white/60 text-xs transition-colors">
                            Clear search
                        </button>
                    </div>
                )}
            </div>

            {/* Dock */}
            <AnimatePresence>
                {selectedEnvironments.length > 0 && (
                    <SelectionDock
                        selectedEnvs={selectedEnvironments}
                        maxSlots={MAX_SELECTION}
                        onRemove={toggleSavedId}
                        onClear={() => setSavedIds([])}
                        onMix={() => setIsCuratorOpen(true)}
                    />
                )}
            </AnimatePresence>

            {/* AI Curator */}
            <AnimatePresence>
                {isCuratorOpen && (
                    <AICuratorModal isOpen={isCuratorOpen} onClose={() => setIsCuratorOpen(false)} onApply={setSavedIds} />
                )}
            </AnimatePresence>
        </div>
    );
};

export default EnvironmentStoreApp;

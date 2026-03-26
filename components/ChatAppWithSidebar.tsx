import React, { useState, useEffect, useRef } from 'react';
import { Search, Phone, Video, MoreVertical, Paperclip, Smile, Mic, Send, ArrowLeft, MessageSquare, Users, Settings, Bell } from 'lucide-react';
import { callOllamaCloud } from '../services/ollamaCloudService';

// --- TYPES ---

export interface User {
    id: string;
    name: string;
    avatar: string;
    status: 'online' | 'offline' | 'busy';
    lastSeen?: string;
}

export interface Message {
    id: string;
    senderId: string; // 'me' or user.id
    text: string;
    timestamp: string;
    isRead: boolean;
}

export interface ChatSession {
    id: string;
    type: 'group' | 'person';
    participants: User[]; // For person, length is 1 (the other person)
    messages: Message[];
    unreadCount: number;
    lastMessagePreview?: string;
    lastMessageTime?: string;
    name: string; // Display name (group name or person name)
    avatar: string; // Display avatar
}

export const CURRENT_USER_ID = 'me';

type NavSection = 'messages' | 'groups' | 'notifications' | 'settings';

export const generateAIResponse = async (
    prompt: string,
    history: { role: 'user' | 'model'; parts: { text: string }[] }[]
): Promise<string> => {
    return await callOllamaCloud([
        {
            role: 'system',
            content: "You are 'Wealth', a helpful and friendly friend in a chat app. Keep your responses concise, casual, and conversational, like a text message."
        },
        ...history.map((entry) => ({
            role: entry.role === 'model' ? 'assistant' as const : 'user' as const,
            content: entry.parts.map((part) => part.text).join('\n')
        })),
        {
            role: 'user',
            content: prompt
        }
    ], 500);
};

// --- COMPONENTS ---

// Sidebar Component
const Sidebar: React.FC<{ activeSection: NavSection; onSectionChange: (section: NavSection) => void }> = ({ activeSection, onSectionChange }) => {
    const navItems: { id: NavSection; icon: typeof MessageSquare; label: string }[] = [
        { id: 'messages', icon: MessageSquare, label: 'Messages' },
        { id: 'groups', icon: Users, label: 'Groups' },
        { id: 'notifications', icon: Bell, label: 'Notifications' },
        { id: 'settings', icon: Settings, label: 'Settings' },
    ];

    return (
        <div className="w-20 flex flex-col items-center gap-4 shrink-0">
            {/* Logo/Profile Section */}
            <div className="w-full bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-4 shadow-2xl">
                <div className="w-12 h-12 mx-auto bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/20">
                    <MessageSquare className="w-6 h-6 text-white" />
                </div>
            </div>

            {/* Navigation Items */}
            <div className="flex-1 w-full bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-3 shadow-2xl flex flex-col gap-2">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeSection === item.id;

                    return (
                        <button
                            key={item.id}
                            onClick={() => onSectionChange(item.id)}
                            className={`
                group relative p-4 rounded-2xl transition-all duration-300
                ${isActive
                                    ? 'bg-gradient-to-br from-white/20 to-white/10 border border-white/30 shadow-lg'
                                    : 'hover:bg-white/5 border border-transparent hover:border-white/10'
                                }
              `}
                            title={item.label}
                        >
                            <Icon
                                className={`w-6 h-6 transition-colors ${isActive ? 'text-white' : 'text-white/40 group-hover:text-white/70'
                                    }`}
                            />

                            {/* Active Indicator */}
                            {isActive && (
                                <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
                            )}
                        </button>
                    );
                })}
            </div>

            {/* User Avatar */}
            <div className="w-full bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-3 shadow-2xl">
                <div className="relative">
                    <img
                        src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&dpr=2&q=80"
                        alt="You"
                        className="w-12 h-12 rounded-full object-cover ring-2 ring-white/10 shadow-lg mx-auto"
                    />
                    <div className="absolute bottom-0 right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-900 shadow-[0_0_10px_rgba(34,197,94,0.6)]" />
                </div>
            </div>
        </div>
    );
};

// ChatListItem Component
const ChatListItem: React.FC<{ session: ChatSession; isActive: boolean; onClick: () => void }> = ({ session, isActive, onClick }) => {
    return (
        <div
            onClick={onClick}
            className={`p-4 rounded-3xl flex items-center gap-4 cursor-pointer transition-all duration-300 group ${isActive
                    ? 'bg-gradient-to-r from-white/15 to-white/5 border border-white/20 shadow-lg backdrop-blur-xl translate-x-1'
                    : 'hover:bg-white/5 border border-transparent hover:border-white/5'
                }`}
        >
            <div className="relative shrink-0">
                <img
                    src={session.avatar}
                    alt={session.name}
                    className="w-12 h-12 rounded-full object-cover bg-gray-700 shadow-lg ring-2 ring-white/10"
                />
                {session.type === 'person' && session.name === 'Wealth' && (
                    <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-gray-800 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                )}
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-1">
                    <h4 className={`font-semibold text-sm truncate ${isActive ? 'text-white' : 'text-white/80'}`}>
                        {session.name}
                    </h4>
                    <span className={`text-[10px] font-medium ${isActive ? 'text-green-300' : 'text-white/30'}`}>
                        {session.lastMessageTime}
                    </span>
                </div>
                <div className="flex justify-between items-center">
                    <p className={`text-xs truncate max-w-[140px] ${isActive ? 'text-white/70' : 'text-white/40'}`}>
                        {session.lastMessagePreview}
                    </p>
                    {session.unreadCount > 0 && (
                        <div className="w-5 h-5 bg-white/20 border border-white/10 rounded-full flex items-center justify-center text-[10px] text-white font-bold shadow-lg backdrop-blur-sm">
                            {session.unreadCount}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ChatList Component (Left Panel)
const ChatList: React.FC<{ sessions: ChatSession[]; activeSessionId: string; onSelectSession: (id: string) => void; activeSection: NavSection }> = ({ sessions, activeSessionId, onSelectSession, activeSection }) => {
    const [searchTerm, setSearchTerm] = useState('');

    // Filter sessions based on active section
    let filteredSessions = sessions;
    if (activeSection === 'messages') {
        filteredSessions = sessions.filter(s => s.type === 'person');
    } else if (activeSection === 'groups') {
        filteredSessions = sessions.filter(s => s.type === 'group');
    }

    filteredSessions = filteredSessions.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const getSectionTitle = () => {
        switch (activeSection) {
            case 'messages':
                return 'Messages';
            case 'groups':
                return 'Groups';
            case 'notifications':
                return 'Notifications';
            case 'settings':
                return 'Settings';
            default:
                return 'Messages';
        }
    };

    return (
        <div className="w-full md:w-[24rem] lg:w-[26rem] flex flex-col gap-4 h-full shrink-0">

            {/* Floating Search Bar */}
            <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-5 shadow-2xl">
                <div className="mb-4">
                    <h2 className="text-white font-bold text-xl tracking-wide">{getSectionTitle()}</h2>
                </div>
                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-white/70 transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder="Search contacts..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-black/20 text-white placeholder-white/30 pl-12 pr-4 py-3.5 rounded-2xl border border-white/5 focus:outline-none focus:border-white/20 focus:bg-black/40 transition-all text-sm shadow-inner"
                    />
                </div>
            </div>

            {/* Floating Contacts List */}
            <div className="flex-1 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-4 shadow-2xl overflow-hidden flex flex-col">
                <div className="flex-1 overflow-y-auto space-y-2 px-2 scrollbar-hide">
                    {activeSection === 'messages' || activeSection === 'groups' ? (
                        filteredSessions.length > 0 ? (
                            filteredSessions.map(session => (
                                <ChatListItem
                                    key={session.id}
                                    session={session}
                                    isActive={session.id === activeSessionId}
                                    onClick={() => onSelectSession(session.id)}
                                />
                            ))
                        ) : (
                            <div className="text-center text-white/30 mt-12">
                                <p>No {activeSection} found</p>
                            </div>
                        )
                    ) : activeSection === 'notifications' ? (
                        <div className="space-y-3 mt-2">
                            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                                <p className="text-white/80 text-sm">New message from Amarae</p>
                                <p className="text-white/40 text-xs mt-1">2 minutes ago</p>
                            </div>
                            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                                <p className="text-white/80 text-sm">Wealth is online</p>
                                <p className="text-white/40 text-xs mt-1">15 minutes ago</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4 mt-2">
                            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                                <p className="text-white/80 font-medium text-sm mb-2">Account</p>
                                <p className="text-white/40 text-xs">Manage your account settings</p>
                            </div>
                            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                                <p className="text-white/80 font-medium text-sm mb-2">Privacy</p>
                                <p className="text-white/40 text-xs">Control your privacy preferences</p>
                            </div>
                            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                                <p className="text-white/80 font-medium text-sm mb-2">Appearance</p>
                                <p className="text-white/40 text-xs">Customize your theme</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ChatWindow Component (Right Panel)
const ChatWindow: React.FC<{ session: ChatSession; onSendMessage: (text: string) => void; isTyping?: boolean }> = ({ session, onSendMessage, isTyping }) => {
    const [inputText, setInputText] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [session.messages, isTyping]);

    const handleSend = () => {
        if (inputText.trim()) {
            onSendMessage(inputText);
            setInputText('');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const isAIChat = session.name === 'Wealth';

    return (
        <div className="flex-1 flex flex-col gap-4 h-full min-w-0">

            {/* Floating Header */}
            <div className="h-20 shrink-0 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2rem] px-6 md:px-8 flex items-center justify-between shadow-2xl z-10">
                <div className="flex items-center gap-4">
                    <div className="relative group cursor-pointer">
                        <img
                            src={session.avatar}
                            alt={session.name}
                            className="w-11 h-11 rounded-full object-cover ring-2 ring-white/10 shadow-lg group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-900 shadow-[0_0_10px_rgba(34,197,94,0.6)]"></div>
                    </div>
                    <div>
                        <h2 className="text-white font-bold text-lg tracking-wide leading-tight">{session.name}</h2>
                        <p className="text-green-400/80 text-[11px] flex items-center gap-1 font-medium tracking-wide mt-0.5">
                            ONLINE <span className="text-white/20 mx-0.5">•</span> {session.lastMessageTime}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-1 text-white/50">
                    <button className="p-3 hover:bg-white/10 hover:text-white rounded-full transition-all"><Phone size={18} /></button>
                    <button className="p-3 hover:bg-white/10 hover:text-white rounded-full transition-all"><Video size={18} /></button>
                    <div className="w-px h-5 bg-white/10 mx-2"></div>
                    <button className="p-3 hover:bg-white/10 hover:text-white rounded-full transition-all"><MoreVertical size={18} /></button>
                </div>
            </div>

            {/* Floating Messages Area */}
            <div className="flex-1 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-4 md:p-8 shadow-2xl overflow-hidden relative flex flex-col z-0">
                <div className="flex-1 overflow-y-auto space-y-6 pr-2 scroll-smooth custom-scrollbar">

                    <div className="flex justify-center mb-6 opacity-60">
                        <span className="bg-black/30 text-white/50 text-[10px] font-bold px-4 py-1.5 rounded-full backdrop-blur-sm tracking-wider uppercase">Today</span>
                    </div>

                    {session.messages.map((msg, idx) => {
                        const isMe = msg.senderId === CURRENT_USER_ID;
                        return (
                            <div key={msg.id} className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'} group animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                                <div className={`flex max-w-[85%] md:max-w-[70%] gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'} items-end`}>

                                    {/* Bubble */}
                                    <div className={`
                    relative px-5 py-3.5 text-[15px] leading-relaxed shadow-lg transition-all
                    ${isMe
                                            ? 'bg-gradient-to-br from-[#2a2a2a] to-[#1a1a1a] text-white rounded-[1.5rem] rounded-tr-sm border border-white/10'
                                            : 'bg-white/10 backdrop-blur-md text-white/90 rounded-[1.5rem] rounded-tl-sm border border-white/5 hover:bg-white/15'
                                        }
                  `}>
                                        {msg.text}
                                        <div className={`text-[10px] mt-1.5 text-right font-medium tracking-wide ${isMe ? 'text-white/30' : 'text-white/30'}`}>
                                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            {isMe && <span className="ml-1 text-green-400">✓✓</span>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {isTyping && (
                        <div className="flex justify-start w-full">
                            <div className="bg-white/10 backdrop-blur-md px-5 py-4 rounded-[1.5rem] rounded-tl-sm border border-white/5 flex gap-1.5 shadow-lg">
                                <div className="w-1.5 h-1.5 bg-white/60 rounded-full animate-bounce"></div>
                                <div className="w-1.5 h-1.5 bg-white/60 rounded-full animate-bounce delay-100"></div>
                                <div className="w-1.5 h-1.5 bg-white/60 rounded-full animate-bounce delay-200"></div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Floating Input Area */}
            <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-2 pr-3 flex items-center gap-2 shadow-2xl shrink-0 z-10 group hover:bg-white/10 transition-colors duration-500">

                {/* Icons Left */}
                <div className="flex items-center gap-1 px-3 border-r border-white/10 mr-1">
                    <button className="p-2.5 text-white/40 hover:text-yellow-400 hover:bg-white/5 rounded-full transition-colors">
                        <Smile size={20} />
                    </button>
                    <button className="p-2.5 text-white/40 hover:text-blue-400 hover:bg-white/5 rounded-full transition-colors">
                        <Paperclip size={20} />
                    </button>
                </div>

                <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={isAIChat ? "Ask Wealth anything..." : "Type your message here..."}
                    className="flex-1 bg-transparent text-white placeholder-white/20 border-none focus:ring-0 text-sm py-4 px-2 font-light"
                />

                <div className="flex items-center gap-2">
                    {!inputText ? (
                        <button className="p-3 text-white/40 hover:text-white hover:bg-white/10 rounded-full transition-colors">
                            <Mic size={20} />
                        </button>
                    ) : (
                        <button
                            onClick={handleSend}
                            className="p-3 bg-white text-black rounded-full shadow-[0_0_15px_rgba(255,255,255,0.3)] hover:shadow-[0_0_20px_rgba(255,255,255,0.5)] transition-all transform hover:scale-110 active:scale-95"
                        >
                            <Send size={18} fill="currentColor" className="ml-0.5" />
                        </button>
                    )}
                </div>
            </div>

            {isAIChat && (
                <div className="text-center -mt-2 mb-1">
                    <span className="text-[9px] text-white/10 uppercase tracking-[0.2em] font-medium">Powered by Gemini AI</span>
                </div>
            )}
        </div>
    );
};


// --- MOCK DATA ---
const MOCK_USERS: Record<string, User> = {
    'wealth': { id: 'wealth', name: 'Wealth', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&dpr=2&q=80', status: 'online', lastSeen: 'Online' },
    'amarae': { id: 'amarae', name: 'Amarae', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&dpr=2&q=80', status: 'online', lastSeen: '2:45pm' },
    'blessing': { id: 'blessing', name: 'Blessing', avatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=200&dpr=2&q=80', status: 'offline', lastSeen: '11:02am' },
    'tee': { id: 'tee', name: 'Tee', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&dpr=2&q=80', status: 'busy', lastSeen: '12:41pm' },
    'team': { id: 'team', name: 'Kinplus Internship Team', avatar: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=200&dpr=2&q=80', status: 'online', lastSeen: 'Today' },
    'fun': { id: 'fun', name: 'Just fun', avatar: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=200&dpr=2&q=80', status: 'online', lastSeen: 'Yesterday' },
};

const INITIAL_SESSIONS: ChatSession[] = [
    {
        id: '1',
        type: 'group',
        name: 'Kinplus Internship Team',
        avatar: MOCK_USERS['team'].avatar,
        participants: [],
        unreadCount: 0,
        lastMessagePreview: 'On my way',
        lastMessageTime: 'Today, 2:41pm',
        messages: []
    },
    {
        id: '2',
        type: 'group',
        name: 'Just fun',
        avatar: MOCK_USERS['fun'].avatar,
        participants: [],
        unreadCount: 10,
        lastMessagePreview: 'Yo... what are you guys up to?',
        lastMessageTime: 'Yesterday, 12:41pm',
        messages: []
    },
    {
        id: '3',
        type: 'person',
        name: 'Amarae',
        avatar: MOCK_USERS['amarae'].avatar,
        participants: [MOCK_USERS['amarae']],
        unreadCount: 1,
        lastMessagePreview: 'Are you coming today?',
        lastMessageTime: 'Today, 2:45pm',
        messages: [
            { id: 'm1', senderId: 'amarae', text: 'Hey! Are you coming today?', timestamp: new Date(Date.now() - 3600000).toISOString(), isRead: false }
        ]
    },
    {
        id: '4',
        type: 'person',
        name: 'Wealth', // This is our AI Agent
        avatar: MOCK_USERS['wealth'].avatar,
        participants: [MOCK_USERS['wealth']],
        unreadCount: 0,
        lastMessagePreview: 'Because I\'m sitting at the back',
        lastMessageTime: '2:46pm',
        messages: [
            { id: 'm1', senderId: 'wealth', text: 'What\'s up?', timestamp: new Date(Date.now() - 1000000).toISOString(), isRead: true },
            { id: 'm2', senderId: CURRENT_USER_ID, text: 'Good you?', timestamp: new Date(Date.now() - 900000).toISOString(), isRead: true },
            { id: 'm3', senderId: 'wealth', text: 'I\'m fine', timestamp: new Date(Date.now() - 800000).toISOString(), isRead: true },
            { id: 'm4', senderId: 'wealth', text: 'What you up to?', timestamp: new Date(Date.now() - 750000).toISOString(), isRead: true },
            { id: 'm5', senderId: CURRENT_USER_ID, text: 'I\'m in class', timestamp: new Date(Date.now() - 600000).toISOString(), isRead: true },
            { id: 'm6', senderId: 'wealth', text: 'Hahaha...and u are texting', timestamp: new Date(Date.now() - 500000).toISOString(), isRead: true },
            { id: 'm7', senderId: CURRENT_USER_ID, text: 'Yup', timestamp: new Date(Date.now() - 400000).toISOString(), isRead: true },
            { id: 'm8', senderId: CURRENT_USER_ID, text: 'Because I\'m sitting at the back', timestamp: new Date(Date.now() - 300000).toISOString(), isRead: true },
        ]
    },
    {
        id: '5',
        type: 'person',
        name: 'Blessing',
        avatar: MOCK_USERS['blessing'].avatar,
        participants: [MOCK_USERS['blessing']],
        unreadCount: 0,
        lastMessagePreview: 'I saw the girl this morning',
        lastMessageTime: 'Today, 11:02am',
        messages: []
    },
    {
        id: '6',
        type: 'person',
        name: 'Tee',
        avatar: MOCK_USERS['tee'].avatar,
        participants: [MOCK_USERS['tee']],
        unreadCount: 1,
        lastMessagePreview: 'I think I\'m coming back next week',
        lastMessageTime: 'Yesterday, 12:41pm',
        messages: []
    },
];

// --- APP COMPONENT ---
const App: React.FC = () => {
    const [sessions, setSessions] = useState<ChatSession[]>(INITIAL_SESSIONS);
    const [activeSessionId, setActiveSessionId] = useState<string>('4'); // Default to Wealth (AI)
    const [activeSection, setActiveSection] = useState<NavSection>('messages');
    const [isTyping, setIsTyping] = useState<boolean>(false);

    const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];

    const handleSendMessage = async (text: string) => {
        const newMessage: Message = {
            id: Date.now().toString(),
            senderId: CURRENT_USER_ID,
            text,
            timestamp: new Date().toISOString(),
            isRead: true
        };

        // Update state with user message
        setSessions(prev => prev.map(s => {
            if (s.id === activeSessionId) {
                return {
                    ...s,
                    messages: [...s.messages, newMessage],
                    lastMessagePreview: text,
                    lastMessageTime: 'Just now'
                };
            }
            return s;
        }));

        // If talking to Wealth (AI)
        if (activeSession.name === 'Wealth') {
            setIsTyping(true);

            // Prepare history for Gemini
            const history = activeSession.messages.map(m => ({
                role: m.senderId === CURRENT_USER_ID ? 'user' as const : 'model' as const,
                parts: [{ text: m.text }]
            }));

            // Get response
            const aiResponseText = await generateAIResponse(text, history);

            setIsTyping(false);

            const aiMessage: Message = {
                id: (Date.now() + 1).toString(),
                senderId: 'wealth',
                text: aiResponseText,
                timestamp: new Date().toISOString(),
                isRead: false
            };

            setSessions(prev => prev.map(s => {
                if (s.id === activeSessionId) {
                    return {
                        ...s,
                        messages: [...s.messages, aiMessage],
                        lastMessagePreview: aiResponseText,
                        lastMessageTime: 'Just now'
                    };
                }
                return s;
            }));
        }
    };

    return (
        <div className="h-screen w-full flex items-center justify-center relative bg-black overflow-hidden p-4 md:p-6 lg:p-10">
            {/* Background Image - Dark Green/Leafy Theme */}
            <div
                className="absolute inset-0 z-0 bg-cover bg-center"
                style={{
                    backgroundImage: `url('https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=2000&auto=format&fit=crop')`,
                    filter: 'blur(30px) brightness(0.6)'
                }}
            ></div>

            {/* Floating Layout Container - Now with Sidebar */}
            <div className="w-full h-full max-w-[1600px] flex gap-4 md:gap-6 z-10 relative">

                {/* Sidebar */}
                <Sidebar activeSection={activeSection} onSectionChange={setActiveSection} />

                {/* Middle Panel - ChatList */}
                <ChatList
                    sessions={sessions}
                    activeSessionId={activeSessionId}
                    onSelectSession={setActiveSessionId}
                    activeSection={activeSection}
                />

                {/* Right Panel - ChatWindow */}
                <ChatWindow
                    session={activeSession}
                    onSendMessage={handleSendMessage}
                    isTyping={isTyping}
                />
            </div>
        </div>
    );
};

export default App;

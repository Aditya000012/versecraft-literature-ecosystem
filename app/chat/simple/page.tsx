'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, arrayUnion, serverTimestamp, collection, getDocs, deleteDoc, orderBy, query } from 'firebase/firestore';
import html2canvas from 'html2canvas';

interface Message {
  role: 'user' | 'model' | 'system';
  content: string;
  timestamp?: Date | string | number | null;
}

const companionModes = [
  { id: 'default', name: 'Warm Companion', icon: '🍷', desc: 'Discuss books & literature' },
  { id: 'poetry', name: 'Poetry Mode', icon: '✒️', desc: 'Create beautiful verses' },
  { id: 'duel', name: 'Verse Duel', icon: '⚔️', desc: 'Rhyming verse combat' },
  { id: 'story', name: 'Story Seed', icon: '🌱', desc: 'Atmospheric story starters' },
  { id: 'analysis', name: 'Literary Analysis', icon: '📚', desc: 'Scholarly critique' },
  { id: 'judgement', name: 'Judgement Mode', icon: '⚖️', desc: 'Rigorous critique' },
];

const moodConfigs: Record<string, { genre: string; era: string; style: string }> = {
  melancholy: {
    genre: 'reflective and melancholy',
    era: 'introspective',
    style: 'an AI that speaks softly, acknowledges weight, and recommends introspective literature',
  },
  euphoric: {
    genre: 'vibrant and celebratory',
    era: 'joyous',
    style: 'an AI that is warm and celebratory, suggesting uplifting poetry and stories',
  },
  restless: {
    genre: 'searching and dynamic',
    era: 'exploratory',
    style: 'an AI that is curious and probing, asking what the user is searching for',
  },
  nostalgic: {
    genre: 'gentle and reminiscent',
    era: 'reminiscent',
    style: 'an AI that is gentle and reminiscent, speaking of timeless classics',
  },
  curious: {
    genre: 'enthusiastic and exploratory',
    era: 'open',
    style: 'an AI that is enthusiastic and exploratory, ready to dive into any topic',
  },
  dark: {
    genre: 'gothic and philosophical',
    era: 'deep',
    style: 'an AI that leans into gothic and philosophical territory, deep and unflinching',
  }
};

interface SidebarChatSession {
  id: string;
  type: 'simple' | 'advanced';
  mode: string;
  createdAt?: { seconds: number; nanoseconds: number } | null;
  messages: { role: string; content: string; timestamp?: Date | string | number | null }[];
}

interface LocalChatSidebarProps {
  currentChatId: string | null;
  chatType: 'simple' | 'advanced';
}

function LocalChatSidebar({ currentChatId, chatType }: LocalChatSidebarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sidebarParam = searchParams.get('sidebar') === 'open';

  const [isHovered, setIsHovered] = useState(false);
  const [sessions, setSessions] = useState<SidebarChatSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sidebarParam) {
      setIsHovered(true);
    }
  }, [sidebarParam]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const chatsRef = collection(db, 'users', user.uid, 'chats');
          const q = query(chatsRef, orderBy('createdAt', 'desc'));
          const querySnap = await getDocs(q);
          const chatsList: SidebarChatSession[] = [];
          querySnap.forEach((docSnap) => {
            const data = docSnap.data();
            chatsList.push({
              id: docSnap.id,
              type: data.type || 'simple',
              mode: data.mode || 'poetry',
              createdAt: data.createdAt,
              messages: data.messages || [],
            });
          });
          setSessions(chatsList);
        } catch (err) {
          console.error('Error fetching sessions in sidebar:', err);
        } finally {
          setLoading(false);
        }
      } else {
        setSessions([]);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    e.preventDefault();
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    try {
      const docRef = doc(db, 'users', currentUser.uid, 'chats', sessionId);
      await deleteDoc(docRef);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch (err) {
      console.error('Error deleting session:', err);
    }
  };

  return (
    <motion.div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      animate={{ width: isHovered ? 280 : 28 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="fixed left-0 bottom-0 z-40 select-none overflow-hidden flex flex-col justify-between"
      style={{
        top: '80px',
        height: 'calc(100vh - 80px)',
        background: '#1a1a1a',
        borderRight: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      {!isHovered ? (
        <div 
          className="w-full h-full flex flex-col justify-center items-center cursor-pointer"
        >
          <span 
            style={{
              writingMode: 'vertical-rl',
              transform: 'rotate(180deg)',
              color: '#F8F4E9',
              fontSize: '9px',
              textTransform: 'uppercase',
              letterSpacing: '2px',
              fontWeight: 'bold',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            HISTORY
          </span>
        </div>
      ) : (
        <div className="flex-grow flex flex-col min-w-[280px] p-5 overflow-hidden h-full">
          {/* Header */}
          <div className="mb-6 flex-shrink-0">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#F8F4E9] font-playfair">
              Chat History
            </h3>
            <p className="font-inter text-[10px] text-[#F8F4E9]/60 mt-1 font-light">
              Your literary sessions
            </p>
          </div>

          {/* Session List */}
          <div className="flex-grow overflow-y-auto pr-1 space-y-2 no-scrollbar">
            {loading ? (
              <div className="py-8 flex justify-center items-center">
                <div className="w-4 h-4 border border-[#F8F4E9] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : sessions.length === 0 ? (
              <p className="text-[11px] text-[#F8F4E9]/60 font-inter italic text-center py-6">
                No sessions recorded
              </p>
            ) : (
              sessions.map((s) => {
                const isActive = s.id === currentChatId;
                const firstUserMsg = s.messages.find(m => m.role === 'user');
                const rawTitle = firstUserMsg?.content || `Session (${s.mode})`;
                const sessionTitle = rawTitle.length > 40 ? rawTitle.slice(0, 40) + '...' : rawTitle;
                
                let sessionDate: Date;
                if (s.createdAt) {
                  if ('seconds' in s.createdAt && typeof s.createdAt.seconds === 'number') {
                    sessionDate = new Date(s.createdAt.seconds * 1000);
                  } else if (typeof s.createdAt === 'string' || typeof s.createdAt === 'number' || s.createdAt instanceof Date) {
                    sessionDate = new Date(s.createdAt as string | number | Date);
                  } else {
                    sessionDate = new Date();
                  }
                } else {
                  sessionDate = new Date();
                }
                const formattedDate = sessionDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

                return (
                  <div
                    key={s.id}
                    onClick={() => router.push(`/chat/${s.type}?session=${s.id}`)}
                    className={`group relative flex justify-between items-center p-3 rounded-lg border border-transparent transition-all cursor-pointer ${
                      isActive 
                        ? 'bg-[rgba(255,255,255,0.08)] border-l-2 border-l-[#F8F4E9]' 
                        : 'hover:bg-[rgba(255,255,255,0.04)]'
                    }`}
                  >
                    <div className="flex-grow min-w-0 pr-6">
                      <h4 className="font-playfair text-xs text-[#F8F4E9] font-medium truncate">
                        {sessionTitle}
                      </h4>
                      <span className="font-inter text-[9px] text-[#F8F4E9]/60 block mt-1">
                        {formattedDate} • <span className="capitalize">{s.mode}</span>
                      </span>
                    </div>

                    {/* Delete row button */}
                    <button
                      onClick={(e) => handleDeleteSession(e, s.id)}
                      style={{ color: '#cc0000' }}
                      className="absolute right-2 opacity-0 group-hover:opacity-100 p-1 transition-opacity"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* New Chat Trigger */}
          <div className="pt-4 border-t border-[rgba(255,255,255,0.1)] flex-shrink-0">
            <button
              onClick={() => router.push(`/chat/${chatType}`)}
              className="w-full py-2.5 bg-[#F8F4E9] hover:bg-[#FAF6EC] rounded-lg text-[10px] uppercase font-bold tracking-wider font-inter text-[#1a1a1a] transition-all flex items-center justify-center gap-1.5"
            >
              <span>✦</span> New Chat
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

interface TypewriterTextProps {
  content: string;
  speed?: number;
  onComplete?: () => void;
}

function TypewriterText({ content, speed = 12, onComplete }: TypewriterTextProps) {
  const [displayedText, setDisplayedText] = useState('');
  
  useEffect(() => {
    let index = 0;
    setDisplayedText('');
    
    const interval = setInterval(() => {
      setDisplayedText((prev) => prev + content.charAt(index));
      index++;
      if (index >= content.length) {
        clearInterval(interval);
        if (onComplete) onComplete();
      }
    }, speed);
    
    return () => clearInterval(interval);
  }, [content, speed, onComplete]);

  return <>{displayedText}</>;
}

function InkDropSplat({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<'falling' | 'splatting' | 'done'>('falling');

  useEffect(() => {
    const fallTimer = setTimeout(() => {
      setPhase('splatting');
    }, 350);

    const splatTimer = setTimeout(() => {
      setPhase('done');
      onComplete();
    }, 750);

    return () => {
      clearTimeout(fallTimer);
      clearTimeout(splatTimer);
    };
  }, [onComplete]);

  if (phase === 'done') return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden z-10">
      {phase === 'falling' && (
        <motion.div
          initial={{ y: -60, scale: 1.2, opacity: 0 }}
          animate={{ y: 0, scale: 1, opacity: 1 }}
          transition={{ duration: 0.35, ease: 'easeIn' }}
          className="w-4 h-5 bg-[#1a1a1a] rounded-full"
          style={{
            clipPath: 'polygon(50% 0%, 100% 70%, 100% 100%, 0% 100%, 0% 70%)',
          }}
        />
      )}
      {phase === 'splatting' && (
        <motion.div
          initial={{ scale: 0.2, opacity: 1 }}
          animate={{ scale: 2.2, opacity: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="w-12 h-12 bg-[#1a1a1a] rounded-full filter blur-[1px]"
          style={{
            borderRadius: '42% 56% 35% 55% / 45% 45% 55% 55%',
          }}
        />
      )}
    </div>
  );
}

function SimpleChatPageContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlChatId = searchParams.get('id');
  const sessionParam = searchParams.get('session') || '';
  const moodParam = searchParams.get('mood') || '';
  const bookParam = searchParams.get('book') || '';
  const authorParam = searchParams.get('author') || '';

  const [chatId, setChatId] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [currentMode, setCurrentMode] = useState('default');
  const [aiLoading, setAiLoading] = useState(false);
  const [saveSuccessId, setSaveSuccessId] = useState<string | null>(null);
  const [activeMood, setActiveMood] = useState<{ genre: string; era: string; style: string } | null>(null);
  const [inkDropMessageIndex, setInkDropMessageIndex] = useState<number | null>(null);
  const [currentlyTypingIndex, setCurrentlyTypingIndex] = useState<number | null>(null);
  const [showGateway, setShowGateway] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setShowGateway(false);
    }, 1200);
    return () => clearTimeout(t);
  }, []);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Protected route check
  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth?mode=login');
    }
  }, [user, loading, router]);

  // Load chat session if ID is provided, otherwise initialize a new one with BEGIN_SESSION fetch
  useEffect(() => {
    if (!user) return;

    const loadSession = async () => {
      setAiLoading(true);
      
      if (moodParam && moodConfigs[moodParam]) {
        const config = moodConfigs[moodParam];
        setActiveMood(config);
      }

      const targetChatId = sessionParam || urlChatId;
      if (targetChatId) {
        try {
          const docRef = doc(db, 'users', user.uid, 'chats', targetChatId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setChatId(targetChatId);
            setCurrentMode(data.mode || 'default');
            setMessages(data.messages || []);
            
            if (data.filters && data.filters.authorStyle) {
              const matchedConfig = Object.values(moodConfigs).find(c => c.style === data.filters.authorStyle);
              if (matchedConfig) setActiveMood(matchedConfig);
            }
            
            setAiLoading(false);
            return;
          }
        } catch (err) {
          console.error('Error loading chat session:', err);
        }
      }
      
      // Initialize new chat with dynamic BEGIN_SESSION fetch
      const newId = `chat_${Math.random().toString(36).substring(2, 15)}`;
      setChatId(newId);
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: 'BEGIN_SESSION',
            mode: currentMode,
            history: [],
            filters: null
          })
        });
        if (res.ok) {
          const data = await res.json();
          setMessages([
            {
              role: 'model',
              content: data.response || 'Welcome. Scribe your thoughts and let us begin.',
              timestamp: new Date()
            }
          ]);
          setInkDropMessageIndex(0);
        } else {
          throw new Error('Failed to fetch dynamic greeting');
        }
      } catch (err) {
        console.error('Error fetching greeting:', err);
        setMessages([
          {
            role: 'model',
            content: 'Welcome. Scribe your thoughts and let us begin.',
            timestamp: new Date()
          }
        ]);
        setInkDropMessageIndex(0);
      } finally {
        setAiLoading(false);
      }
    };

    loadSession();
  }, [user, urlChatId, sessionParam, moodParam, bookParam, authorParam]);

  // Scroll to bottom of chat on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || aiLoading || !user) return;

    const userText = input.trim();
    const userMessage: Message = {
      role: 'user',
      content: userText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    setAiLoading(true);

    try {
      // Format history matching standard roles
      const clientHistory = messages
        .filter((msg, idx) => !(idx === 0 && msg.role === 'model'))
        .map((msg) => ({
          role: msg.role,
          content: msg.content,
        }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          mode: currentMode,
          history: clientHistory,
          filters: (activeMood && currentMode === 'default') ? {
            genre: activeMood.genre,
            era: activeMood.era,
            authorStyle: activeMood.style
          } : undefined
        }),
      });

      if (!res.ok) {
        throw new Error('Server responded with an error');
      }

      const data = await res.json();
      const aiMessage: Message = {
        role: 'model',
        content: data.response || 'The ink ran dry. Please try again.',
        timestamp: new Date(),
      };

      setMessages((prev) => {
        const nextIndex = prev.length;
        setInkDropMessageIndex(nextIndex);
        return [...prev, aiMessage];
      });

      // Save session to Firestore
      const chatDocRef = doc(db, 'users', user.uid, 'chats', chatId);
      const chatDocSnap = await getDoc(chatDocRef);

      const savedMessageList = [
        ...messages,
        userMessage,
        aiMessage,
      ]
      .filter((msg, idx) => !(idx === 0 && msg.role === 'model'))
      .map((msg) => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp instanceof Date ? msg.timestamp : new Date(),
      }));

      if (!chatDocSnap.exists()) {
        await setDoc(chatDocRef, {
          mode: currentMode,
          type: 'simple',
          createdAt: serverTimestamp(),
          messages: savedMessageList,
          filters: activeMood ? {
            genre: activeMood.genre,
            era: activeMood.era,
            authorStyle: activeMood.style
          } : null
        });
      } else {
        await updateDoc(chatDocRef, {
          messages: savedMessageList,
        });
      }
    } catch (error) {
      console.error('Error in Simple Chat sending:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'model',
          content: 'Alas, the connection to the muse broke. Let us try sending your prompt again.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  const handleSaveToAnthology = async (msgContent: string, index: number) => {
    if (!user) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      const anthologyItem = {
        id: `anth_${Math.random().toString(36).substring(2, 9)}`,
        mode: currentMode,
        prompt: messages[index - 1]?.content || 'Open dialogue',
        response: msgContent,
        savedAt: new Date().toISOString(),
      };
      
      await updateDoc(userRef, {
        anthology: arrayUnion(anthologyItem),
      });

      setSaveSuccessId(`save_${index}`);
      setTimeout(() => setSaveSuccessId(null), 3000);
    } catch (err) {
      console.error('Error saving to anthology:', err);
    }
  };

  const handleShareCard = async (content: string) => {
    const words = content.split(' ');
    const chunks: string[] = [];
    let current = '';
    for (const word of words) {
      if ((current + ' ' + word).length > 1500) {
        chunks.push(current.trim());
        current = word;
      } else {
        current += ' ' + word;
      }
    }
    if (current.trim()) chunks.push(current.trim());

    for (let i = 0; i < chunks.length; i++) {
      const card = document.createElement('div');
      card.style.cssText = `
        position: fixed;
        top: -9999px;
        left: -9999px;
        width: 800px;
        padding: 48px;
        background: linear-gradient(135deg, #0a0a1a 0%, #1a0a2e 100%);
        border: 1px solid rgba(201, 168, 76, 0.3);
        border-radius: 16px;
        font-family: Georgia, serif;
        color: #f5f0e8;
      `;
      card.innerHTML = `
        <div style="color: #c9a84c; font-size: 12px; letter-spacing: 3px; margin-bottom: 24px; text-transform: uppercase;">✦ Versecraft ${chunks.length > 1 ? `(${i + 1}/${chunks.length})` : ''}</div>
        <div style="font-size: 14px; line-height: 1.7; font-style: italic; color: #f5f0e8; margin-bottom: 32px;">${chunks[i]}</div>
        <div style="color: #c9a84c; font-size: 11px; letter-spacing: 2px; border-top: 1px solid rgba(201, 168, 76, 0.2); padding-top: 16px;">versecraft.app</div>
      `;
      document.body.appendChild(card);
      try {
        const canvas = await html2canvas(card, { backgroundColor: null, scale: 2 });
        const link = document.createElement('a');
        link.download = chunks.length > 1 ? `versecraft-verse-${i + 1}.png` : 'versecraft-verse.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
        await new Promise(resolve => setTimeout(resolve, 500));
      } finally {
        document.body.removeChild(card);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F4E9] flex items-center justify-center relative z-10">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-t-2 border-[#1a1a1a] border-r-2 animate-spin" />
          <span className="font-playfair text-lg text-[#1a1a1a] font-medium italic">Opening companion channel...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-10 w-full min-h-screen bg-[#F8F4E9] flex flex-col pt-20">
      {/* Ruled paper lines */}
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={`ruled-line-${i}`}
          style={{
            position: 'absolute',
            height: '1px',
            background: 'rgba(26, 26, 26, 0.04)',
            left: 0,
            right: 0,
            top: `${80 + i * 48}px`,
            zIndex: 0,
            pointerEvents: 'none'
          }}
        />
      ))}

      <div
        className="font-playfair fixed md:absolute"
        style={{
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: '320px',
          fontWeight: 'bold',
          fontStyle: 'italic',
          color: 'rgba(26, 26, 26, 0.025)',
          userSelect: 'none',
          pointerEvents: 'none',
          zIndex: 0
        }}
      >
        V
      </div>

      {/* Cinematic Gateway Open/Reveal Transition Overlay */}
      {showGateway && (
        <div className="fixed inset-0 z-50 pointer-events-none flex overflow-hidden">
          {/* Left split-leaf page */}
          <motion.div 
            initial={{ x: 0 }}
            animate={{ x: '-100%' }}
            transition={{ duration: 0.85, delay: 0.2, ease: [0.19, 1, 0.22, 1] }}
            className="w-1/2 h-full bg-[#FAF6EC] border-r border-[#1a1a1a]/10 flex items-center justify-end pr-12 md:pr-20 shadow-[12px_0_35px_rgba(0,0,0,0.12)] pointer-events-auto"
          >
            <div className="text-right max-w-xs space-y-3 select-none">
              <span className="font-playfair text-xs italic opacity-40">Chamber portal...</span>
              <h2 className="font-playfair text-2xl font-bold tracking-tight text-[#1a1a1a]">
                Opening Journal
              </h2>
            </div>
          </motion.div>

          {/* Right split-leaf page */}
          <motion.div 
            initial={{ x: 0 }}
            animate={{ x: '100%' }}
            transition={{ duration: 0.85, delay: 0.2, ease: [0.19, 1, 0.22, 1] }}
            className="w-1/2 h-full bg-[#FAF6EC] border-l border-[#1a1a1a]/10 flex items-center justify-start pl-12 md:pl-20 shadow-[-12px_0_35px_rgba(0,0,0,0.12)] pointer-events-auto"
          >
            <div className="text-left max-w-xs space-y-2 select-none">
              <span className="font-inter text-[9px] uppercase tracking-[0.25em] opacity-50">VERSECRAFT</span>
              <p className="font-inter text-xs italic text-[#1a1a1a]/60">
                “The Companion awaits...”
              </p>
            </div>
          </motion.div>
        </div>
      )}

      <LocalChatSidebar currentChatId={chatId || null} chatType="simple" />
      
      {/* Session Header Bar */}
      <div className="py-3 px-6 border-b border-[rgba(26,26,26,0.1)] bg-[#F8F4E9] fixed top-20 left-0 right-0 z-30 flex justify-between items-center max-w-7xl mx-auto rounded-b-xl">
        <div className="flex flex-col items-start gap-1">
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="text-xs text-[#6b6b6b] hover:text-[#1a1a1a] transition-colors flex items-center gap-1 font-inter font-medium"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
              Dashboard
            </Link>
            <span className="text-[rgba(26,26,26,0.2)]">|</span>
            <span className="text-xs font-semibold text-[#1a1a1a] font-inter tracking-wide capitalize flex items-center gap-1.5">
              <span>{companionModes.find((m) => m.id === currentMode)?.icon}</span>
              {companionModes.find((m) => m.id === currentMode)?.name}
            </span>
          </div>
          {bookParam && authorParam && (
            <span className="text-[10px] text-[#1a1a1a] font-inter font-medium flex items-center gap-1 mt-0.5">
              📖 Discussing: <span className="italic">{bookParam}</span> by {authorParam}
            </span>
          )}
        </div>

        <button
          onClick={async () => {
            setAiLoading(true);
            setMessages([]);
            const newId = `chat_${Math.random().toString(36).substring(2, 15)}`;
            setChatId(newId);
            try {
              const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  message: 'BEGIN_SESSION',
                  mode: currentMode,
                  history: [],
                  filters: null
                })
              });
              if (res.ok) {
                const data = await res.json();
                setMessages([
                  {
                    role: 'model',
                    content: data.response || 'Welcome. Scribe your thoughts and let us begin.',
                    timestamp: new Date()
                  }
                ]);
                setInkDropMessageIndex(0);
              }
            } catch (err) {
              console.error(err);
            } finally {
              setAiLoading(false);
            }
            router.replace('/chat/simple');
          }}
          style={{
            border: '1px solid #1a1a1a',
          }}
          className="px-3 py-1 bg-white hover:bg-[#f0ebe0] rounded-md text-[10px] uppercase font-bold tracking-wider font-inter text-[#1a1a1a] transition-colors"
        >
          New Scroll
        </button>
      </div>

      {/* Main Chat Stream */}
      <div className="relative z-10 flex-grow overflow-y-auto pb-36 pt-16 px-4 max-w-4xl w-full mx-auto flex flex-col justify-start">
        <div className="flex-grow space-y-6 pt-6">
          {messages.map((msg, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                style={{
                  border: msg.role === 'user' ? 'none' : '1px solid rgba(26, 26, 26, 0.15)',
                  background: msg.role === 'user' ? '#1a1a1a' : '#ebdcb9',
                }}
                className={`max-w-[85%] sm:max-w-xl p-5 rounded-2xl transition-all relative ${
                  msg.role === 'user'
                    ? 'text-white rounded-br-none'
                    : 'text-[#1a1a1a] rounded-bl-none shadow-sm'
                }`}
              >
                {msg.role === 'model' && index === inkDropMessageIndex && (
                  <InkDropSplat
                    onComplete={() => {
                      setInkDropMessageIndex(null);
                      setCurrentlyTypingIndex(index);
                    }}
                  />
                )}

                {msg.role === 'model' && (
                  <div className="flex justify-between items-center mb-3 border-b border-[rgba(26, 26, 26, 0.1)] pb-2">
                    <span className="text-[9px] uppercase tracking-widest text-[#6b6b6b] font-bold font-inter">
                      COMPANION
                    </span>
                  </div>
                )}

                <p className={`font-inter text-sm leading-relaxed whitespace-pre-wrap ${msg.role === 'model' ? 'italic font-playfair text-base text-[#1a1a1a] font-normal' : 'text-white font-light'}`}>
                  {index === 0 && msg.role === 'model' ? (
                    <span className="relative px-6 py-2 block font-playfair text-lg text-[#1a1a1a]">
                      <span className="absolute left-0 top-[-8px] text-4xl text-[#6b6b6b]/40 font-serif">“</span>
                      <span className={index === inkDropMessageIndex ? 'opacity-0' : 'opacity-100 transition-opacity duration-300'}>
                        {index === currentlyTypingIndex ? (
                          <TypewriterText content={msg.content} onComplete={() => setCurrentlyTypingIndex(null)} />
                        ) : (
                          msg.content
                        )}
                      </span>
                      <span className="absolute right-0 bottom-[-8px] text-4xl text-[#6b6b6b]/40 font-serif">”</span>
                    </span>
                  ) : (
                    <span className={index === inkDropMessageIndex ? 'opacity-0' : 'opacity-100 transition-opacity duration-300'}>
                      {index === currentlyTypingIndex ? (
                        <TypewriterText content={msg.content} onComplete={() => setCurrentlyTypingIndex(null)} />
                      ) : (
                        msg.content
                      )}
                    </span>
                  )}
                </p>

                {msg.role === 'model' && index > 0 && (
                  <div className="flex justify-end gap-3 mt-4 border-t border-[rgba(26, 26, 26, 0.1)] pt-2 text-[10px] font-bold font-inter text-[#6b6b6b]">
                    <button
                      onClick={() => handleSaveToAnthology(msg.content, index)}
                      className="hover:text-[#1a1a1a] flex items-center gap-1 transition-colors"
                    >
                      {saveSuccessId === `save_${index}` ? '✅ Saved!' : '📜 Save to Anthology'}
                    </button>
                    <span>•</span>
                    <button
                      onClick={() => handleShareCard(msg.content)}
                      className="hover:text-[#1a1a1a] flex items-center gap-1 transition-colors"
                    >
                      🎨 Share Card
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
          
          {aiLoading && (
            <div className="flex justify-start">
              <div className="bg-white border border-[rgba(26,26,26,0.1)] p-5 rounded-2xl rounded-bl-none flex items-center gap-1.5">
                <span className="text-[#6b6b6b] text-xl font-bold animate-pulse">...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Persistent Input Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#F8F4E9] border-t border-[#1a1a1a]/15 py-4 px-4 z-20">
        <div className="max-w-4xl mx-auto flex flex-col gap-3">
          
          {/* Mode Selector Chips */}
          <div className="flex gap-2 overflow-x-auto pb-1.5 no-scrollbar scroll-smooth">
            {companionModes.map((mode) => (
              <button
                key={mode.id}
                onClick={async () => {
                  setCurrentMode(mode.id);
                  // Trigger BEGIN_SESSION for the new mode to dynamically greet the user starting completely fresh
                  setAiLoading(true);
                  try {
                    const res = await fetch('/api/chat', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        message: 'BEGIN_SESSION',
                        mode: mode.id,
                        history: [],
                        filters: null
                      })
                    });
                    if (res.ok) {
                      const data = await res.json();
                      setMessages([
                        {
                          role: 'model',
                          content: data.response || 'Welcome. Scribe your thoughts and let us begin.',
                          timestamp: new Date()
                        }
                      ]);
                      setInkDropMessageIndex(0); // Trigger ink drop on welcome message!
                    }
                  } catch (err) {
                    console.error(err);
                  } finally {
                    setAiLoading(false);
                  }
                }}
                style={{
                  border: currentMode === mode.id ? '1px solid #1a1a1a' : '1px solid rgba(26,26,26,0.15)',
                }}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider font-inter transition-all flex-shrink-0 ${
                  currentMode === mode.id
                    ? 'bg-[#1a1a1a] text-white shadow shadow-black/10'
                    : 'bg-white text-[#6b6b6b] hover:bg-[#f0ebe0]'
                }`}
              >
                <span>{mode.icon}</span>
                {mode.name}
              </button>
            ))}
          </div>

          {/* Form Input */}
          <form onSubmit={handleSendMessage} className="flex gap-3 relative items-center">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleTextareaInput}
              onKeyDown={handleKeyPress}
              placeholder={`Scribe your response... (${companionModes.find((m) => m.id === currentMode)?.desc})`}
              rows={1}
              style={{
                background: 'white',
                border: '1px solid rgba(26, 26, 26, 0.2)',
                color: '#1a1a1a',
              }}
              className="flex-grow px-4 py-3.5 text-sm rounded-xl outline-none resize-none overflow-y-auto placeholder-[#9b9b9b] focus:!border-[rgba(26,26,26,0.5)] focus:border-opacity-50 transition-colors"
              disabled={aiLoading}
            />
            <button
              type="submit"
              disabled={aiLoading || !input.trim()}
              className="px-5 py-3.5 bg-[#1a1a1a] hover:bg-[#2d2d2d] disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold rounded-xl text-xs uppercase tracking-wider font-inter transition-all flex-shrink-0"
            >
              Send
            </button>
          </form>
        </div>
      </div>


    </div>
  );
}

export default function SimpleChatPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F8F4E9] flex items-center justify-center relative z-10">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-t-2 border-[#1a1a1a] border-r-2 animate-spin" />
          <span className="font-playfair text-lg text-[#1a1a1a] font-medium italic">Attuning chamber frequencies...</span>
        </div>
      </div>
    }>
      <SimpleChatPageContent />
    </Suspense>
  );
}

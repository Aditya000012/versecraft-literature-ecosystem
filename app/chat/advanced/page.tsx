'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  arrayUnion, 
  serverTimestamp,
  collection,
  getDocs,
  deleteDoc,
  orderBy,
  query
} from 'firebase/firestore';
import html2canvas from 'html2canvas';

interface Message {
  role: 'user' | 'model' | 'system';
  content: string;
  timestamp?: Date | string | number | null;
}

const genres = [
  { id: 'romance', name: 'Romance' },
  { id: 'gothic', name: 'Gothic' },
  { id: 'horror', name: 'Horror' },
  { id: 'mystery', name: 'Mystery' },
  { id: 'fantasy', name: 'Fantasy' },
  { id: 'realism', name: 'Realism' },
  { id: 'sufi', name: 'Sufi' },
  { id: 'classical', name: 'Classical' },
  { id: 'science-fiction', name: 'Science Fiction' },
  { id: 'dystopian', name: 'Dystopian' },
  { id: 'magical-realism', name: 'Magical Realism' },
  { id: 'historical-fiction', name: 'Historical Fiction' },
  { id: 'psychological-thriller', name: 'Psychological Thriller' },
  { id: 'adventure', name: 'Adventure' },
  { id: 'satire', name: 'Satire' },
  { id: 'tragedy', name: 'Tragedy' },
  { id: 'comedy', name: 'Comedy' },
  { id: 'epic', name: 'Epic' },
  { id: 'noir', name: 'Noir' },
  { id: 'existential', name: 'Existential' },
  { id: 'supernatural', name: 'Supernatural' },
  { id: 'war-literature', name: 'War Literature' },
  { id: 'political-fiction', name: 'Political Fiction' },
  { id: 'philosophical-fiction', name: 'Philosophical Fiction' },
  { id: 'literary-fiction', name: 'Literary Fiction' },
];

const eras = [
  { id: 'ancient', name: 'Ancient (before 500 AD)' },
  { id: 'medieval', name: 'Medieval (500-1400)' },
  { id: 'renaissance', name: 'Renaissance (1400-1600)' },
  { id: 'baroque', name: 'Baroque (1600-1700)' },
  { id: 'enlightenment', name: 'Enlightenment (1700-1800)' },
  { id: 'romantic', name: 'Romantic Period (1800-1850)' },
  { id: 'victorian', name: 'Victorian (1850-1900)' },
  { id: 'edwardian', name: 'Edwardian (1900-1914)' },
  { id: 'modernist', name: 'Modernist (1914-1945)' },
  { id: 'mid-century', name: 'Mid-Century (1945-1970)' },
  { id: 'postmodern', name: 'Postmodern (1970-1990)' },
  { id: 'contemporary', name: 'Contemporary (1990-2010)' },
  { id: 'present-day', name: 'Present Day (2010 onwards)' },
];

const languages = [
  { id: 'english', name: 'English' },
  { id: 'urdu', name: 'Urdu (اردو)' },
  { id: 'hindi', name: 'Hindi (हिन्दी)' },
  { id: 'french', name: 'French (Français)' },
  { id: 'spanish', name: 'Spanish (Español)' },
];

const companionModes = [
  { id: 'poetry', name: 'Poetry Mode', icon: '✒️', desc: 'Create beautiful verses' },
  { id: 'duel', name: 'Verse Duel', icon: '⚔️', desc: 'Poetic combat' },
  { id: 'story', name: 'Story Seed', icon: '🌱', desc: 'Nurture narratives' },
  { id: 'analysis', name: 'Literary Analysis', icon: '📚', desc: 'Deep scholarly critique' },
  { id: 'judgement', name: 'Judgement Mode', icon: '⚖️', desc: 'Rigorous critique' },
];

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

const getChatTheme = (genre: string, era: string) => {
  const g = genre.toLowerCase();
  const e = era.toLowerCase();
  
  if (g === 'gothic' && e === 'victorian') {
    return {
      gradient: 'linear-gradient(135deg, #1a0505 0%, #2d0a0a 100%)',
      textColor: '#f5f0e8',
      isDark: true
    };
  }
  if (g === 'gothic') {
    return {
      gradient: 'linear-gradient(135deg, #0d0d1a 0%, #1a0a1a 100%)',
      textColor: '#f5f0e8',
      isDark: true
    };
  }
  if (g === 'sufi' && e === 'ancient') {
    return {
      gradient: 'linear-gradient(135deg, #0d0a1a 0%, #1a0d2e 100%)',
      textColor: '#f5f0e8',
      isDark: true
    };
  }
  if (g === 'fantasy' && e === 'renaissance') {
    return {
      gradient: 'linear-gradient(135deg, #0a1a0a 0%, #0d2b0d 100%)',
      textColor: '#f5f0e8',
      isDark: true
    };
  }
  if (g === 'romance') {
    return {
      gradient: 'linear-gradient(135deg, #1a0a0f 0%, #2d0d1a 100%)',
      textColor: '#f5f0e8',
      isDark: true
    };
  }
  if (g === 'horror') {
    return {
      gradient: 'linear-gradient(135deg, #0a0a1a 0%, #1a0505 100%)',
      textColor: '#f5f0e8',
      isDark: true
    };
  }
  if (g === 'noir') {
    return {
      gradient: 'linear-gradient(135deg, #0a0a1a 0%, #1a1a1a 100%)',
      textColor: '#f5f0e8',
      isDark: true
    };
  }
  return {
    gradient: '#F8F4E9',
    textColor: '#1a1a1a',
    isDark: false
  };
};

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

  const filteredSessions = sessions.filter(s => s.type === chatType);

  return (
    <motion.div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      animate={{ width: isHovered ? 280 : 28 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="fixed left-0 bottom-0 z-40 select-none overflow-hidden flex flex-col justify-between border-r border-[#1a1a1a]/10"
      style={{
        top: '80px',
        height: 'calc(100vh - 80px)',
        background: isHovered ? '#F8F4E9' : 'rgba(248, 244, 233, 0.95)',
      }}
    >
      {!isHovered ? (
        <div 
          className="w-full h-full flex flex-col justify-center items-center cursor-pointer"
        >
          <span 
            className="font-inter font-bold text-[9px] uppercase tracking-[2px] text-[#1a1a1a] select-none"
            style={{
              writingMode: 'vertical-rl',
              transform: 'rotate(180deg)',
            }}
          >
            HISTORY
          </span>
        </div>
      ) : (
        <div className="flex-grow flex flex-col min-w-[280px] p-5 overflow-hidden h-full text-[#1a1a1a]">
          {/* Header */}
          <div className="mb-6 flex-shrink-0">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#1a1a1a] font-playfair">
              Chat History
            </h3>
            <p className="font-inter text-[10px] text-[#6b6b6b] mt-1 font-light">
              Your advanced sessions
            </p>
          </div>

          {/* Session List */}
          <div className="flex-grow overflow-y-auto pr-1 space-y-2 no-scrollbar">
            {loading ? (
              <div className="py-8 flex justify-center items-center">
                <div className="w-4 h-4 border border-[#1a1a1a] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredSessions.length === 0 ? (
              <p className="text-[11px] text-[#6b6b6b] font-inter italic text-center py-6">
                No sessions recorded
              </p>
            ) : (
              filteredSessions.map((s) => {
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
                        ? 'bg-[rgba(26,26,26,0.06)] border-l-2 border-l-[#1a1a1a]' 
                        : 'hover:bg-[rgba(26,26,26,0.03)]'
                    }`}
                  >
                    <div className="flex-grow min-w-0 pr-6">
                      <h4 className="font-playfair text-xs text-[#1a1a1a] font-medium truncate">
                        {sessionTitle}
                      </h4>
                      <span className="font-inter text-[9px] text-[#6b6b6b] block mt-1">
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
          <div className="pt-4 border-t border-[#1a1a1a]/10 flex-shrink-0">
            <button
              onClick={() => router.push(`/chat/${chatType}`)}
              className="w-full py-2.5 bg-[#1a1a1a] hover:bg-[#2d2d2d] rounded-lg text-[10px] uppercase font-bold tracking-wider font-inter text-white transition-all flex items-center justify-center gap-1.5"
            >
              <span>✦</span> New Chat
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

function AdvancedChatPageContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlChatId = searchParams.get('id');
  const sessionParam = searchParams.get('session') || '';

  const [chatId, setChatId] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [currentMode, setCurrentMode] = useState('poetry');
  const [aiLoading, setAiLoading] = useState(false);
  
  // Selection wizard state
  const [wizardActive, setWizardActive] = useState(true);
  const [selectedGenre, setSelectedGenre] = useState('');
  const [selectedEra, setSelectedEra] = useState('');
  const [authorStyle, setAuthorStyle] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('english');

  const [saveSuccessId, setSaveSuccessId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Dynamic Theme Styling Resolution
  const theme = getChatTheme(selectedGenre, selectedEra);

  // Protected route check
  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth?mode=login');
    }
  }, [user, loading, router]);

  // Load chat session if ID is provided
  useEffect(() => {
    if (!user) return;

    const loadSession = async () => {
      const targetChatId = sessionParam || urlChatId;
      if (targetChatId) {
        try {
          const docRef = doc(db, 'users', user.uid, 'chats', targetChatId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setChatId(targetChatId);
            setCurrentMode(data.mode || 'poetry');
            setMessages(data.messages || []);
            
            if (data.filters) {
              setSelectedGenre(data.filters.genre || '');
              setSelectedEra(data.filters.era || '');
              setAuthorStyle(data.filters.authorStyle || '');
              setSelectedLanguage(data.filters.language || 'english');
            }
            setWizardActive(false);
            return;
          }
        } catch (err) {
          console.error('Error loading advanced session:', err);
        }
      }
    };

    loadSession();
  }, [user, urlChatId, sessionParam]);

  // Autostart from URL parameters
  useEffect(() => {
    if (!user || urlChatId) return;

    const genreParam = searchParams.get('genre') || '';
    const eraParam = searchParams.get('era') || '';
    const autostartParam = searchParams.get('autostart') === 'true';

    if (genreParam && eraParam) {
      const matchedGenre = genres.find(g => g.name.toLowerCase() === genreParam.toLowerCase() || g.id.toLowerCase() === genreParam.toLowerCase())?.id || genreParam.toLowerCase();
      const matchedEra = eras.find(e => e.name.toLowerCase() === eraParam.toLowerCase() || e.id.toLowerCase() === eraParam.toLowerCase())?.id || eraParam.toLowerCase();

      setSelectedGenre(matchedGenre);
      setSelectedEra(matchedEra);

      if (autostartParam) {
        const autoLaunch = async () => {
          const newChatId = `chat_adv_${Math.random().toString(36).substring(2, 15)}`;
          setChatId(newChatId);

          const genreObj = genres.find(g => g.id === matchedGenre) || { name: matchedGenre };
          const eraObj = eras.find(e => e.id === matchedEra) || { name: matchedEra };

          const greetingText = `Welcome. I'm glad you've found your way here. I have prepared our workspace for our journey into ${genreObj.name} literature from the ${eraObj.name} era. We will converse in English. What are you reading, writing, or thinking about today?`;

          const initialMessages: Message[] = [
            {
              role: 'model',
              content: greetingText,
              timestamp: new Date(),
            },
          ];

          setMessages(initialMessages);
          setWizardActive(false);

          try {
            const chatDocRef = doc(db, 'users', user.uid, 'chats', newChatId);
            await setDoc(chatDocRef, {
              mode: 'poetry',
              type: 'advanced',
              filters: {
                genre: matchedGenre,
                era: matchedEra,
                authorStyle: '',
                language: 'english',
              },
              createdAt: serverTimestamp(),
              messages: initialMessages.map((msg) => ({
                role: msg.role,
                content: msg.content,
                timestamp: new Date(),
              })),
            });
          } catch (err) {
            console.error('Failed to initialize autostart advanced session:', err);
          }
        };

        autoLaunch();
      }
    }
  }, [user, urlChatId, searchParams]);

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleLaunchChamber = async () => {
    if (!selectedGenre || !selectedEra || !user) return;

    const newChatId = `chat_adv_${Math.random().toString(36).substring(2, 15)}`;
    setChatId(newChatId);

    const genreObj = genres.find(g => g.id === selectedGenre) || { name: selectedGenre };
    const eraObj = eras.find(e => e.id === selectedEra) || { name: selectedEra };
    const langObj = languages.find(l => l.id === selectedLanguage) || { name: selectedLanguage };

    const greetingText = `Welcome. I'm glad you've found your way here. I have prepared our workspace for our journey into ${genreObj.name} literature from the ${eraObj.name} era${authorStyle ? `, inspired by the distinct voice of ${authorStyle}` : ''}. We will converse in ${langObj.name}. What are you reading, writing, or thinking about today?`;

    const initialMessages: Message[] = [
      {
        role: 'model',
        content: greetingText,
        timestamp: new Date(),
      },
    ];

    setMessages(initialMessages);
    setWizardActive(false);

    try {
      // Initialize Firestore document
      const chatDocRef = doc(db, 'users', user.uid, 'chats', newChatId);
      await setDoc(chatDocRef, {
        mode: currentMode,
        type: 'advanced',
        filters: {
          genre: selectedGenre,
          era: selectedEra,
          authorStyle,
          language: selectedLanguage,
        },
        createdAt: serverTimestamp(),
        messages: initialMessages.map((msg) => ({
          role: msg.role,
          content: msg.content,
          timestamp: new Date(),
        })),
      });
    } catch (err) {
      console.error('Failed to initialize advanced session:', err);
    }
  };

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
      const clientHistory = messages.map((msg) => ({
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
          filters: {
            genre: selectedGenre,
            era: selectedEra,
            authorStyle,
            language: selectedLanguage,
          },
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

      setMessages((prev) => [...prev, aiMessage]);

      // Save advanced session to Firestore
      const chatDocRef = doc(db, 'users', user.uid, 'chats', chatId);
      const savedMessageList = [
        ...messages,
        userMessage,
        aiMessage,
      ].map((msg) => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp instanceof Date ? msg.timestamp : new Date(),
      }));

      await updateDoc(chatDocRef, {
        messages: savedMessageList,
      });
    } catch (error) {
      console.error('Error in Advanced Chat sending:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'model',
          content: 'The link with the muse cracked under absolute pressure. Scribe your message again.',
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
        id: `anth_adv_${Math.random().toString(36).substring(2, 9)}`,
        mode: currentMode,
        genre: selectedGenre,
        era: selectedEra,
        prompt: messages[index - 1]?.content || 'Open dialogue',
        response: msgContent,
        savedAt: new Date(),
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

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#F8F4E9] flex items-center justify-center relative z-10">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-t-2 border-[#1a1a1a] border-r-2 animate-spin" />
          <span className="font-playfair text-lg text-[#1a1a1a] font-medium italic">Attuning chamber frequencies...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-10 w-full min-h-screen bg-[#F8F4E9] flex flex-col pt-20 text-[#1a1a1a]">
      {/* Ruled paper lines (only when paper theme is active) */}
      {!theme.isDark && Array.from({ length: 12 }).map((_, i) => (
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

      {/* Watermark V (only when paper theme is active) */}
      {!theme.isDark && (
        <div
          className="font-playfair"
          style={{
            position: 'absolute',
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
      )}

      <LocalChatSidebar currentChatId={chatId || null} chatType="advanced" />
      <AnimatePresence mode="wait">
        {wizardActive ? (
          /* PART A: The Selection Wizard */
          <motion.div
            key="wizard"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.6 }}
            className="flex-grow max-w-5xl w-full mx-auto px-4 py-8 flex flex-col justify-center bg-[#F8F4E9] text-[#1a1a1a]"
          >
            <div className="text-center mb-10 select-none">
              <span className="text-[10px] tracking-[0.25em] uppercase font-bold text-[#1a1a1a]/80 block mb-2 font-inter">THE SECRET ARCHIVES</span>
              <h1 className="font-playfair text-4xl sm:text-5xl font-bold text-[#1a1a1a]">Advanced Chambers</h1>
              <p className="font-inter text-sm text-[#6b6b6b] mt-3 max-w-xl mx-auto font-light leading-relaxed italic">
                Set your literary atmosphere before entering
              </p>
            </div>

            <div className="bg-white border border-[#1a1a1a]/15 rounded-2xl p-6 sm:p-8 space-y-8 shadow-sm">
              {/* Genre Selector */}
              <div>
                <label className="block text-xs uppercase tracking-widest text-[#1a1a1a] font-bold mb-3 font-inter">1. Select Literary Genre</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-64 overflow-y-auto pr-1 no-scrollbar">
                  {genres.map((g) => (
                    <button
                      key={g.id}
                      onClick={() => setSelectedGenre(g.id)}
                      className={`p-3.5 rounded-lg border text-left transition-all font-inter text-xs ${
                        selectedGenre === g.id
                          ? 'bg-[#1a1a1a] border-[#1a1a1a] text-white shadow-md'
                          : 'bg-white border-[#1a1a1a]/15 text-[#1a1a1a] hover:bg-[#f0ebe0]'
                      }`}
                    >
                      {g.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Era Selector */}
              <div>
                <label className="block text-xs uppercase tracking-widest text-[#1a1a1a] font-bold mb-3 font-inter">2. Choose Historical Era</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-64 overflow-y-auto pr-1 no-scrollbar">
                  {eras.map((e) => (
                    <button
                      key={e.id}
                      onClick={() => setSelectedEra(e.id)}
                      className={`p-3.5 rounded-lg border text-left transition-all font-inter text-xs ${
                        selectedEra === e.id
                          ? 'bg-[#1a1a1a] border-[#1a1a1a] text-white shadow-md'
                          : 'bg-white border-[#1a1a1a]/15 text-[#1a1a1a] hover:bg-[#f0ebe0]'
                      }`}
                    >
                      {e.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Advanced Controls Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-[#1a1a1a]/10">
                {/* Author Persona Mimicry */}
                <div>
                  <label className="block text-xs uppercase tracking-widest text-[#1a1a1a] font-bold mb-2 font-inter">3. Author Style Mimicry (Optional)</label>
                  <p className="text-[10px] text-[#6b6b6b] mb-3 font-light">Input a writer&apos;s name to enforce their syntax and vocabulary structure.</p>
                  <input
                    type="text"
                    placeholder="e.g. Oscar Wilde, Edgar Allan Poe, Rumi..."
                    value={authorStyle}
                    onChange={(e) => setAuthorStyle(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-[#1a1a1a] bg-white text-[#1a1a1a] placeholder-[#9b9b9b] outline-none text-sm"
                  />
                </div>

                {/* Output Language */}
                <div>
                  <label className="block text-xs uppercase tracking-widest text-[#1a1a1a] font-bold mb-2 font-inter">4. Output Language</label>
                  <p className="text-[10px] text-[#6b6b6b] mb-3 font-light">Force the literary model to think and respond inside a specific dialect or language framework.</p>
                  <select
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-[#1a1a1a] bg-white text-[#1a1a1a] outline-none text-sm cursor-pointer"
                  >
                    {languages.map((l) => (
                      <option key={l.id} value={l.id} className="text-[#1a1a1a]">
                        {l.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Submit Trigger */}
              <div className="pt-6 text-center">
                <button
                  onClick={handleLaunchChamber}
                  disabled={!selectedGenre || !selectedEra}
                  className="w-full py-4 bg-[#1a1a1a] disabled:bg-[#ebdcb9] disabled:text-[#1a1a1a]/30 hover:bg-[#2d2d2d] text-white font-bold uppercase tracking-widest rounded-xl font-playfair text-base transition-all select-none shadow-md"
                >
                  Begin Session
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          /* PART B & C: Theme-Locked Immersive Chat UI */
          <motion.div
            key="chamber-chat"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="flex-grow flex flex-col"
          >
            {/* Top Bar matching theme styles */}
            <div className="py-3 px-6 border-b border-[#1a1a1a]/15 bg-[#F8F4E9] fixed top-20 left-0 right-0 z-30 flex justify-between items-center max-w-7xl mx-auto rounded-b-xl select-none">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setWizardActive(true)}
                  className="text-xs text-[#1a1a1a] hover:underline transition-colors flex items-center gap-1 font-inter font-medium"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                  </svg>
                  Recalibrate Frequencies
                </button>
                <span className="text-[#1a1a1a]/20">|</span>
                <span className="text-[10px] font-bold text-[#1a1a1a] font-inter tracking-wider uppercase flex items-center gap-1.5">
                  {selectedGenre} • {selectedEra}
                </span>
                {authorStyle && (
                  <>
                    <span className="text-[#1a1a1a]/10 hidden sm:inline">•</span>
                    <span className="text-[10px] text-[#1a1a1a]/60 font-bold uppercase font-inter hidden sm:inline">
                      Style: {authorStyle}
                    </span>
                  </>
                )}
              </div>

              <button
                onClick={() => {
                  setMessages([
                    {
                      role: 'model',
                      content: `The room has reset. Our parameters are preserved: ${selectedGenre.toUpperCase()} + ${selectedEra.toUpperCase()}${authorStyle ? ` in the style of ${authorStyle}` : ''}. Scribe your next invocation.`,
                      timestamp: new Date(),
                    },
                  ]);
                }}
                className="px-3 py-1 bg-white border border-[#1a1a1a] rounded-md text-[10px] uppercase font-bold tracking-wider font-inter text-[#1a1a1a] hover:bg-[#f0ebe0] transition-colors"
              >
                Reset Scroll
              </button>
            </div>

            {/* Message Stream */}
            <div 
              style={{
                background: theme.gradient,
                color: theme.textColor,
                minHeight: 'calc(100vh - 80px)'
              }}
              className="flex-grow overflow-y-auto pb-48 pt-20 px-4 transition-all duration-1000 select-text"
            >
              <div className="max-w-4xl w-full mx-auto flex flex-col justify-start space-y-6 pt-6">
                {messages.map((msg, index) => {
                  const isUser = msg.role === 'user';
                  
                  let bubbleStyle: React.CSSProperties = {};
                  let bubbleClass = '';
                  
                  if (isUser) {
                    if (theme.isDark) {
                      bubbleStyle = {
                        background: 'rgba(255, 255, 255, 0.15)',
                        color: '#f5f0e8',
                        border: 'none'
                      };
                    } else {
                      bubbleStyle = {
                        background: '#1a1a1a',
                        color: '#ffffff',
                        border: 'none'
                      };
                    }
                    bubbleClass = 'rounded-br-none';
                  } else {
                    if (theme.isDark) {
                      bubbleStyle = {
                        background: 'rgba(255, 255, 255, 0.08)',
                        color: '#f5f0e8',
                        border: '1px solid rgba(255, 255, 255, 0.1)'
                      };
                    } else {
                      bubbleStyle = {
                        background: '#ebdcb9',
                        color: '#1a1a1a',
                        border: '1px solid rgba(26, 26, 26, 0.15)'
                      };
                    }
                    bubbleClass = 'rounded-bl-none shadow-sm';
                  }
                  
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6 }}
                      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        style={bubbleStyle}
                        className={`max-w-[85%] sm:max-w-xl p-5 rounded-2xl transition-all relative ${bubbleClass}`}
                      >
                        {msg.role === 'model' && (
                          <div 
                            className="flex justify-between items-center mb-3 pb-2"
                            style={{ borderBottom: theme.isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(26, 26, 26, 0.1)' }}
                          >
                            <span 
                              className="text-[9px] uppercase tracking-widest font-bold font-inter"
                              style={{ color: theme.isDark ? 'rgba(255,255,255,0.4)' : '#6b6b6b' }}
                            >
                              COMPANION
                            </span>
                          </div>
                        )}

                        <p className={`font-inter text-sm leading-relaxed whitespace-pre-wrap ${msg.role === 'model' ? 'italic font-playfair text-base font-normal' : 'font-light'}`}>
                          {msg.content}
                        </p>

                        {msg.role === 'model' && index > 0 && (
                          <div 
                            className="flex justify-end gap-3 mt-4 pt-2 text-[10px] font-bold font-inter"
                            style={{ 
                              borderTop: theme.isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(26, 26, 26, 0.1)',
                              color: theme.isDark ? 'rgba(255,255,255,0.4)' : '#6b6b6b'
                            }}
                          >
                            <button
                              onClick={() => handleSaveToAnthology(msg.content, index)}
                              className="hover:text-gold flex items-center gap-1 transition-colors"
                            >
                              {saveSuccessId === `save_${index}` ? '✅ Saved!' : '📜 Save to Anthology'}
                            </button>
                            <span>•</span>
                            <button
                              onClick={() => handleShareCard(msg.content)}
                              className="hover:text-gold flex items-center gap-1 transition-colors"
                            >
                              🎨 Share Card
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}

                {aiLoading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-start"
                  >
                    <div 
                      style={{
                        background: theme.isDark ? 'rgba(255, 255, 255, 0.08)' : '#ebdcb9',
                        border: theme.isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(26, 26, 26, 0.15)'
                      }}
                      className="p-5 rounded-2xl rounded-bl-none flex items-center gap-2"
                    >
                      <div className="w-1.5 h-1.5 bg-black/40 dark:bg-white/40 rounded-full animate-bounce" />
                      <div className="w-1.5 h-1.5 bg-black/40 dark:bg-white/40 rounded-full animate-bounce [animation-delay:0.2s]" />
                      <div className="w-1.5 h-1.5 bg-black/40 dark:bg-white/40 rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </motion.div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input Bar - Keeps clean paper aesthetic always */}
            <div className="fixed bottom-0 left-0 right-0 bg-[#F8F4E9] border-t border-[#1a1a1a]/15 py-4 px-4 z-20 select-none">
              <div className="max-w-4xl mx-auto flex flex-col gap-3">
                {/* Mode Selector Chips */}
                <div className="flex gap-2 overflow-x-auto pb-1.5 no-scrollbar scroll-smooth">
                  {companionModes.map((mode) => (
                    <button
                      key={mode.id}
                      onClick={() => setCurrentMode(mode.id)}
                      style={{
                        border: currentMode === mode.id ? '1px solid #1a1a1a' : '1px solid rgba(26,26,26,0.15)',
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider font-inter border transition-all flex-shrink-0 ${
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
                    placeholder={`Scribe your response inside the locked room... Mode: ${companionModes.find((m) => m.id === currentMode)?.name}`}
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function AdvancedChatPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F8F4E9] flex items-center justify-center relative z-10">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-t-2 border-[#1a1a1a] border-r-2 animate-spin" />
          <span className="font-playfair text-lg text-[#1a1a1a] font-medium italic">Attuning advanced frequencies...</span>
        </div>
      </div>
    }>
      <AdvancedChatPageContent />
    </Suspense>
  );
}

'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';
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

function SimpleChatPageContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlChatId = searchParams.get('id');
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
      
      let initialFilters: { genre: string; era: string; authorStyle: string } | undefined = undefined;
      if (moodParam && moodConfigs[moodParam]) {
        const config = moodConfigs[moodParam];
        setActiveMood(config);
        initialFilters = {
          genre: config.genre,
          era: config.era,
          authorStyle: config.style
        };
      }

      if (urlChatId) {
        try {
          const docRef = doc(db, 'users', user.uid, 'chats', urlChatId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setChatId(urlChatId);
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
        const messageText = bookParam && authorParam
          ? `The user wants to discuss the book '${bookParam}' by ${authorParam}. Open the conversation by warmly introducing this book — share something intriguing about it, its themes, its author, or its place in literary history. Then invite the user to share their thoughts or questions about it.`
          : 'BEGIN_SESSION';

        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: messageText,
            mode: 'default',
            history: [],
            filters: initialFilters
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
      } finally {
        setAiLoading(false);
      }
    };

    loadSession();
  }, [user, urlChatId, moodParam, bookParam, authorParam]);

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

      setMessages((prev) => [...prev, aiMessage]);

      // Save session to Firestore
      const chatDocRef = doc(db, 'users', user.uid, 'chats', chatId);
      const chatDocSnap = await getDoc(chatDocRef);

      const savedMessageList = [
        ...messages,
        userMessage,
        aiMessage,
      ].map((msg) => ({
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
      if ((current + ' ' + word).length > 800) {
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
      <div className="min-h-screen bg-navy flex items-center justify-center relative z-10">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-t-2 border-gold border-r-2 animate-spin" />
          <span className="font-playfair text-lg text-gold font-medium italic">Opening companion channel...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-10 w-full min-h-screen flex flex-col pt-20">
      
      {/* Session Header Bar */}
      <div className="glass-card py-3 px-6 border-b border-white/5 fixed top-20 left-0 right-0 z-30 flex justify-between items-center max-w-7xl mx-auto rounded-b-xl">
        <div className="flex flex-col items-start gap-1">
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="text-xs text-cream/60 hover:text-gold transition-colors flex items-center gap-1 font-inter font-medium"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
              Dashboard
            </Link>
            <span className="text-white/20">|</span>
            <span className="text-xs font-semibold text-gold font-inter tracking-wide capitalize flex items-center gap-1.5">
              <span>{companionModes.find((m) => m.id === currentMode)?.icon}</span>
              {companionModes.find((m) => m.id === currentMode)?.name}
            </span>
          </div>
          {bookParam && authorParam && (
            <span className="text-[10px] text-gold font-inter font-medium flex items-center gap-1 mt-0.5">
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
                  filters: (activeMood && currentMode === 'default') ? {
                    genre: activeMood.genre,
                    era: activeMood.era,
                    authorStyle: activeMood.style
                  } : undefined
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
              }
            } catch (err) {
              console.error(err);
            } finally {
              setAiLoading(false);
            }
            router.replace('/chat/simple');
          }}
          className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-md text-[10px] uppercase font-bold tracking-wider font-inter text-cream transition-colors"
        >
          New Scroll
        </button>
      </div>

      {/* Main Chat Stream */}
      <div className="flex-grow overflow-y-auto pb-36 pt-16 px-4 max-w-4xl w-full mx-auto flex flex-col justify-start">
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
                className={`max-w-[85%] sm:max-w-xl p-5 rounded-2xl border transition-all ${
                  msg.role === 'user'
                    ? 'bg-gold/10 border-gold/30 text-cream rounded-br-none'
                    : 'glass-card border-white/5 text-cream rounded-bl-none'
                }`}
              >
                {msg.role === 'model' && (
                  <div className="flex justify-between items-center mb-3 border-b border-white/5 pb-2">
                    <span className="text-[9px] uppercase tracking-wider text-gold font-bold font-inter">
                      Companion
                    </span>
                  </div>
                )}

                <p className={`font-inter text-sm leading-relaxed whitespace-pre-wrap font-light ${msg.role === 'model' ? 'italic text-cream-light font-playfair text-base' : ''}`}>
                  {msg.content}
                </p>

                {msg.role === 'model' && index > 0 && (
                  <div className="flex justify-end gap-3 mt-4 border-t border-white/5 pt-2 text-[10px] font-bold font-inter text-cream/40">
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
          ))}
          
          {aiLoading && (
            <div className="flex justify-start">
              <div className="glass-card border-white/5 p-5 rounded-2xl rounded-bl-none flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-gold rounded-full animate-bounce" />
                <div className="w-1.5 h-1.5 bg-gold rounded-full animate-bounce [animation-delay:0.2s]" />
                <div className="w-1.5 h-1.5 bg-gold rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Persistent Input Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#05050f]/80 backdrop-blur-xl border-t border-white/5 py-4 px-4 z-20">
        <div className="max-w-4xl mx-auto flex flex-col gap-3">
          
          {/* Mode Selector Chips */}
          <div className="flex gap-2 overflow-x-auto pb-1.5 no-scrollbar scroll-smooth">
            {companionModes.map((mode) => (
              <button
                key={mode.id}
                onClick={async () => {
                  setCurrentMode(mode.id);
                  // Trigger BEGIN_SESSION for the new mode to dynamically greet the user
                  setAiLoading(true);
                  try {
                    const res = await fetch('/api/chat', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        message: 'BEGIN_SESSION',
                        mode: mode.id,
                        history: messages.filter(m => m.content !== 'BEGIN_SESSION'),
                        filters: (activeMood && mode.id === 'default') ? {
                          genre: activeMood.genre,
                          era: activeMood.era,
                          authorStyle: activeMood.style
                        } : undefined
                      })
                    });
                    if (res.ok) {
                      const data = await res.json();
                      setMessages((prev) => [
                        ...prev,
                        {
                          role: 'model',
                          content: data.response || 'Chamber mode adjusted.',
                          timestamp: new Date()
                        }
                      ]);
                    }
                  } catch (err) {
                    console.error(err);
                  } finally {
                    setAiLoading(false);
                  }
                }}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider font-inter border transition-all flex-shrink-0 ${
                  currentMode === mode.id
                    ? 'bg-gold border-transparent text-navy shadow shadow-gold/15'
                    : 'bg-white/5 border-white/5 text-cream/60 hover:text-gold hover:border-gold/30'
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
              className="flex-grow px-4 py-3.5 text-sm rounded-xl outline-none glass-input resize-none overflow-y-auto"
              disabled={aiLoading}
            />
            <button
              type="submit"
              disabled={aiLoading || !input.trim()}
              className="px-5 py-3.5 bg-gold hover:bg-gold-light disabled:bg-gray-800 disabled:text-cream/30 text-navy font-bold rounded-xl text-xs uppercase tracking-wider font-inter transition-all flex-shrink-0"
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
      <div className="min-h-screen bg-navy flex items-center justify-center relative z-10">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-t-2 border-gold border-r-2 animate-spin" />
          <span className="font-playfair text-lg text-gold font-medium italic">Attuning chamber frequencies...</span>
        </div>
      </div>
    }>
      <SimpleChatPageContent />
    </Suspense>
  );
}

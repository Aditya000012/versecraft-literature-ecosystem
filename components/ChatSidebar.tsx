'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  collection, 
  getDocs, 
  deleteDoc, 
  doc, 
  orderBy, 
  query 
} from 'firebase/firestore';
import { motion } from 'framer-motion';

const sidebarStyles = `
  @keyframes pulse-once {
    0%, 100% { opacity: 0.15; }
    50% { opacity: 0.4; }
  }
  .pulse-sidebar-tab {
    animation: pulse-once 2s ease-in-out 2;
  }
  @keyframes fade-in-out {
    0% { opacity: 0; transform: translateX(-10px); }
    15% { opacity: 1; transform: translateX(0); }
    85% { opacity: 1; transform: translateX(0); }
    100% { opacity: 0; transform: translateX(-10px); }
  }
  .sidebar-tooltip {
    animation: fade-in-out 4s ease-in-out forwards;
  }
`;

interface ChatSession {
  id: string;
  type: 'simple' | 'advanced';
  mode: string;
  createdAt?: { seconds: number; nanoseconds: number } | null;
  messages: { role: string; content: string; timestamp?: Date | string | number | null }[];
}

interface ChatSidebarProps {
  currentChatId: string | null;
  chatType: 'simple' | 'advanced';
}

export default function ChatSidebar({ currentChatId, chatType }: ChatSidebarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sidebarParam = searchParams.get('sidebar') === 'open';

  const [isHovered, setIsHovered] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTooltip, setShowTooltip] = useState(false);

  // Addition 2 — Start expanded if sidebar=open is in the URL
  useEffect(() => {
    if (sidebarParam) {
      setIsHovered(true);
    }
  }, [sidebarParam]);

  // First-visit tooltip showing after 2 seconds and fading after 4 seconds
  useEffect(() => {
    const tooltipSeen = localStorage.getItem('sidebar_tooltip_seen') === 'true';
    if (!tooltipSeen) {
      const timer = setTimeout(() => {
        setShowTooltip(true);
        localStorage.setItem('sidebar_tooltip_seen', 'true');
      }, 2000);
      const hideTimer = setTimeout(() => {
        setShowTooltip(false);
      }, 6000);
      return () => {
        clearTimeout(timer);
        clearTimeout(hideTimer);
      };
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const chatsRef = collection(db, 'users', user.uid, 'chats');
          const q = query(chatsRef, orderBy('createdAt', 'desc'));
          const querySnap = await getDocs(q);
          const chatsList: ChatSession[] = [];
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
    <>
      <style dangerouslySetInnerHTML={{ __html: sidebarStyles }} />
      
      {showTooltip && !isHovered && (
        <div className="fixed left-[40px] top-[120px] z-50 bg-[#0a0a1a]/95 backdrop-blur border border-[#c9a84c]/30 px-3 py-2 rounded-lg shadow-xl shadow-black/80 sidebar-tooltip pointer-events-none">
          <span className="font-inter text-[10px] italic text-[#c9a84c] whitespace-nowrap tracking-wide">
            ← Hover for chat history
          </span>
        </div>
      )}

      <motion.div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        animate={{ width: isHovered ? 280 : 28 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="fixed left-0 bottom-0 z-40 bg-[#0a0a1a]/95 backdrop-blur-xl border-r border-[#c9a84c]/15 select-none overflow-hidden flex flex-col justify-between"
        style={{
          top: '64px',
          height: 'calc(100vh - 64px)',
        }}
      >
        {!isHovered ? (
          <div 
            className="w-full h-full flex flex-col justify-center items-center cursor-pointer pulse-sidebar-tab"
            style={{
              background: 'rgba(201, 168, 76, 0.15)',
              borderRight: '1px solid rgba(201, 168, 76, 0.4)',
            }}
          >
            <span 
              style={{
                writingMode: 'vertical-rl',
                transform: 'rotate(180deg)',
                color: '#c9a84c',
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
            <h3 className="font-playfair text-xs font-bold uppercase tracking-widest text-[#c9a84c]">
              Chat History
            </h3>
            <p className="font-inter text-[10px] text-[#f5f0e8]/50 mt-1 font-light">
              Your literary sessions
            </p>
          </div>

          {/* Session List */}
          <div className="flex-grow overflow-y-auto pr-1 space-y-2 no-scrollbar">
            {loading ? (
              <div className="py-8 flex justify-center items-center">
                <div className="w-4 h-4 border border-[#c9a84c] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : sessions.length === 0 ? (
              <p className="text-[11px] text-[#f5f0e8]/30 font-inter italic text-center py-6">
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
                        ? 'bg-white/5 border-l-2 border-l-[#c9a84c] border-white/5' 
                        : 'hover:bg-white/5 hover:border-white/5'
                    }`}
                  >
                    <div className="flex-grow min-w-0 pr-6">
                      <h4 className="font-inter text-xs text-[#f5f0e8]/90 font-medium truncate">
                        {sessionTitle}
                      </h4>
                      <span className="font-inter text-[9px] text-[#f5f0e8]/40 block mt-1">
                        {formattedDate} • <span className="capitalize">{s.mode}</span>
                      </span>
                    </div>

                    {/* Delete row button */}
                    <button
                      onClick={(e) => handleDeleteSession(e, s.id)}
                      className="absolute right-2 opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 text-[#f5f0e8]/40 transition-opacity"
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
          <div className="pt-4 border-t border-[#c9a84c]/10 flex-shrink-0">
            <button
              onClick={() => router.push(`/chat/${chatType}`)}
              className="w-full py-2.5 bg-[#c9a84c]/10 hover:bg-[#c9a84c]/20 border border-[#c9a84c]/30 rounded-lg text-[10px] uppercase font-bold tracking-wider font-inter text-[#c9a84c] transition-all flex items-center justify-center gap-1.5"
            >
              <span>✦</span> New Chat
            </button>
        </div>
      </div>
      )}
    </motion.div>
    </>
  );
}

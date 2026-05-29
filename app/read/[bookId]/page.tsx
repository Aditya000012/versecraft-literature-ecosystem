'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { User } from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  arrayUnion
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';

// Google and custom fonts
const FONT_LINK = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,700;1,400;1,700&display=swap';

// exact requested sanitizeHTML function
const sanitizeHTML = (html: string): string => {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<link[^>]*rel=["']stylesheet["'][^>]*>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/style=["'][^"']*["']/gi, '')
    .replace(/<meta[^>]*>/gi, '')
    .replace(/<html[^>]*>/gi, '')
    .replace(/<\/html>/gi, '')
    .replace(/<head\b[^<]*(?:(?!<\/head>)<[^<]*)*<\/head>/gi, '');
};

interface Chapter {
  id: string;
  text: string;
  tag: string;
}

interface Message {
  role: 'user' | 'ai';
  content: string;
}

export default function BookReaderPage() {
  const params = useParams();
  const router = useRouter();
  const bookId = params.bookId as string;

  // Authentication & Firestore
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // Book Data State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [bookTitle, setBookTitle] = useState('');
  const [bookAuthor, setBookAuthor] = useState('');
  const [cleanHtml, setCleanHtml] = useState('');
  const [chapters, setChapters] = useState<Chapter[]>([]);

  // UI state
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false);
  const [showCompanion, setShowCompanion] = useState(false);
  const [activeChapterId, setActiveChapterId] = useState('');

  // Companion Chat state
  const [conversation, setConversation] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  // Selection state
  const [selectedText, setSelectedText] = useState('');
  const [toolbarCoords, setToolbarCoords] = useState<{ x: number; y: number } | null>(null);
  const [savePassageLoading, setSavePassageLoading] = useState(false);
  const [saveConfirmation, setSaveConfirmation] = useState(false);

  // Refs for scroll and DOM tracking
  const progressBarRef = useRef<HTMLDivElement>(null);
  const progressTextRef = useRef<HTMLDivElement>(null);
  const savedScrollPositionRef = useRef(0);
  const restoreHappened = useRef(false);
  const lastSaveTime = useRef(0);
  const readingAreaRef = useRef<HTMLDivElement>(null);
  const isScrollingToChapterRef = useRef<boolean>(false);

  // Track authenticated user
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u);
      setLoadingUser(false);
    });
    return () => unsubscribe();
  }, []);

  // Fetch book and load/initialize Firestore reading session
  useEffect(() => {
    if (loadingUser) return;
    if (!bookId) return;

    const loadVolumeAndSession = async () => {
      setLoading(true);
      setError(false);
      try {
        // 1. Fetch volume html and metadata
        const res = await fetch(`/api/gutenberg?action=read&bookId=${bookId}`);
        if (!res.ok) throw new Error('Failed to fetch volume from Gutenberg');
        const data = await res.json();
        if (data.error || !data.html) throw new Error('Volume content not found');

        setBookTitle(data.title);
        setBookAuthor(data.author);

        // 2. Sanitize HTML
        const cleanContent = sanitizeHTML(data.html);

        // 3. Extract Table of Contents headings using browser DOMParser
        const parser = new DOMParser();
        const docNode = parser.parseFromString(cleanContent, 'text/html');
        const headingNodes = docNode.querySelectorAll('h2, h3');
        const extractedChapters: Chapter[] = [];

        headingNodes.forEach((node, idx) => {
          const id = `chapter-${idx}`;
          node.setAttribute('id', id);
          extractedChapters.push({
            id,
            text: node.textContent?.trim() || `Section ${idx + 1}`,
            tag: node.tagName.toLowerCase()
          });
        });

        setChapters(extractedChapters);
        setCleanHtml(docNode.body.innerHTML);

        // 4. Fetch/Initialize reading session if user is logged in
        if (user) {
          const sessionRef = doc(db, 'users', user.uid, 'readingSessions', bookId);
          const sessionSnap = await getDoc(sessionRef);

          if (sessionSnap.exists()) {
            const sessionData = sessionSnap.data();
            if (sessionData.conversation) {
              setConversation(sessionData.conversation);
            }
            if (sessionData.lastScrollPosition) {
              savedScrollPositionRef.current = sessionData.lastScrollPosition;
            }
          } else {
            // Create a new reading session
            await setDoc(sessionRef, {
              startedAt: serverTimestamp(),
              bookTitle: data.title,
              bookAuthor: data.author,
              conversation: [],
              savedPassages: [],
              lastScrollPosition: 0,
              lastReadAt: serverTimestamp()
            });
          }
        }
      } catch (err) {
        console.error('Error loading Gutenberg reader volume:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    loadVolumeAndSession();
  }, [user, loadingUser, bookId]);

  // Track active chapter during scroll
  useEffect(() => {
    if (chapters.length === 0 || loading) return;

    const handleActiveChapterScroll = () => {
      if (isScrollingToChapterRef.current) return;

      let currentId = chapters[0].id;
      for (const chapter of chapters) {
        const el = document.getElementById(chapter.id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 120) {
            currentId = chapter.id;
          } else {
            break;
          }
        }
      }
      setActiveChapterId(currentId);
    };

    window.addEventListener('scroll', handleActiveChapterScroll);
    return () => window.removeEventListener('scroll', handleActiveChapterScroll);
  }, [chapters, loading]);

  // Fix 1 — Prevent Firestore saves from causing re-renders
  const saveProgress = useCallback(async (scrollPos: number) => {
    const now = Date.now();
    if (now - lastSaveTime.current < 5000) return;
    lastSaveTime.current = now;
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid, 'readingSessions', bookId), {
        lastScrollPosition: scrollPos,
        lastReadAt: new Date()
      });
    } catch {
      // silent fail
    }
  }, [user, bookId]);

  // Fix 2 — Reading progress bar must not cause re-renders
  const handleScroll = useCallback(() => {
    if (loading) return;

    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight;
    const clientHeight = document.documentElement.clientHeight;
    const denominator = scrollHeight - clientHeight;
    const percentage = denominator > 0 ? (scrollTop / denominator) * 100 : 0;

    if (progressBarRef.current) {
      progressBarRef.current.style.width = `${percentage}%`;
    }
    if (progressTextRef.current) {
      progressTextRef.current.textContent = `${Math.round(percentage)}% READ`;
    }

    saveProgress(Math.round(scrollTop));
  }, [loading, saveProgress]);

  // Fix 3 — Scroll position restore must happen after content is fully rendered
  useEffect(() => {
    if (cleanHtml && savedScrollPositionRef.current > 0 && !restoreHappened.current) {
      restoreHappened.current = true;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.scrollTo(0, savedScrollPositionRef.current);
          
          // Initial DOM sync for progress indicator upon restoration
          const scrollTop = savedScrollPositionRef.current;
          const scrollHeight = document.documentElement.scrollHeight;
          const clientHeight = document.documentElement.clientHeight;
          const denominator = scrollHeight - clientHeight;
          const percentage = denominator > 0 ? (scrollTop / denominator) * 100 : 0;
          if (progressBarRef.current) {
            progressBarRef.current.style.width = `${percentage}%`;
          }
          if (progressTextRef.current) {
            progressTextRef.current.textContent = `${Math.round(percentage)}% READ`;
          }
        });
      });
    }
  }, [cleanHtml]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      // Final save on exit/unmount without touching state
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      if (user && bookId && scrollTop > 0) {
        updateDoc(doc(db, 'users', user.uid, 'readingSessions', bookId), {
          lastScrollPosition: Math.round(scrollTop),
          lastReadAt: new Date()
        }).catch(() => {});
      }
    };
  }, [handleScroll, user, bookId]);

  // Smooth scroll to chapter
  const scrollToChapter = (id: string) => {
    isScrollingToChapterRef.current = true;
    setActiveChapterId(id);
    const element = document.getElementById(id);
    if (element) {
      const topOffset = element.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top: topOffset, behavior: 'smooth' });
    }
    // Release scroll block after smooth animation finishes
    setTimeout(() => {
      isScrollingToChapterRef.current = false;
    }, 800);
  };

  // Text selection handler
  const handleTextSelection = () => {
    const selection = window.getSelection();
    const text = selection ? selection.toString().trim() : '';

    if (text.length > 0) {
      const range = selection?.getRangeAt(0);
      if (range) {
        const rect = range.getBoundingClientRect();
        // Position toolbar floating centered horizontally above the highlighted range
        setToolbarCoords({
          x: rect.left + rect.width / 2 + window.scrollX,
          y: rect.top + window.scrollY - 48
        });
        setSelectedText(text);
      }
    } else {
      setToolbarCoords(null);
    }
  };

  // Clear selection on clicking elsewhere
  useEffect(() => {
    const handleDocumentMouseDown = (e: MouseEvent) => {
      const toolbar = document.getElementById('floating-selection-toolbar');
      if (toolbar && toolbar.contains(e.target as Node)) {
        return;
      }
      const selection = window.getSelection();
      const text = selection ? selection.toString().trim() : '';
      if (!text) {
        setToolbarCoords(null);
        setSelectedText('');
      }
    };

    document.addEventListener('mousedown', handleDocumentMouseDown);
    return () => document.removeEventListener('mousedown', handleDocumentMouseDown);
  }, []);

  // Pre-fill prompt for Companion
  const handlePreFillCompanion = (promptText: string) => {
    setShowCompanion(true);
    setChatInput(promptText);
    setToolbarCoords(null);
  };

  // Save selected passage to readingSession and main anthology
  const handleSavePassage = async () => {
    if (!user) {
      router.push('/auth?mode=login');
      return;
    }
    if (!selectedText) return;

    setSavePassageLoading(true);
    try {
      const sessionRef = doc(db, 'users', user.uid, 'readingSessions', bookId);
      const userRef = doc(db, 'users', user.uid);

      const passageId = `pass_${Math.random().toString(36).substring(2, 9)}`;
      const savedItem = {
        id: passageId,
        text: selectedText,
        savedAt: new Date().toISOString(),
        chapterName: chapters.find(c => c.id === activeChapterId)?.text || 'General'
      };

      // 1. Add to readingSession's savedPassages
      await updateDoc(sessionRef, {
        savedPassages: arrayUnion(savedItem)
      });

      // 2. Add to user's main anthology array
      const anthologyItem = {
        id: `anth_${Math.random().toString(36).substring(2, 9)}`,
        mode: 'reading',
        prompt: `Saved passage from ${bookTitle}`,
        response: selectedText,
        savedAt: new Date().toISOString()
      };

      await updateDoc(userRef, {
        anthology: arrayUnion(anthologyItem)
      });

      setSaveConfirmation(true);
      setTimeout(() => {
        setSaveConfirmation(false);
        setToolbarCoords(null);
        setSelectedText('');
        window.getSelection()?.removeAllRanges();
      }, 2000);
    } catch (err) {
      console.error('Error saving passage:', err);
    } finally {
      setSavePassageLoading(false);
    }
  };

  // Send AI Chat Message
  const handleSendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    if (!user) {
      router.push('/auth?mode=login');
      return;
    }

    const currentMessageText = chatInput.trim();
    const currentSelectedText = selectedText;

    const userMessage: Message = {
      role: 'user',
      content: currentSelectedText
        ? `Regarding this passage: "${currentSelectedText}" — ${currentMessageText}`
        : currentMessageText
    };

    const newConversation = [...conversation, userMessage];
    setConversation(newConversation);
    setChatInput('');
    setSelectedText('');
    setToolbarCoords(null);
    setChatLoading(true);

    try {
      const activeChapter = chapters.find(c => c.id === activeChapterId)?.text || 'Unknown Chapter';

      const res = await fetch('/api/reader-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: currentMessageText,
          selectedText: currentSelectedText || null,
          bookTitle,
          bookAuthor,
          chapterContext: activeChapter,
          conversation: conversation
        })
      });

      if (!res.ok) throw new Error('Chat generation failed');
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const aiResponse: Message = {
        role: 'ai',
        content: data.response
      };

      const finalConversation = [...newConversation, aiResponse];
      setConversation(finalConversation);

      // Persist conversation to Firestore
      const sessionRef = doc(db, 'users', user.uid, 'readingSessions', bookId);
      await updateDoc(sessionRef, {
        conversation: finalConversation
      });
    } catch (err) {
      console.error('Companion chat error:', err);
      setConversation((prev) => [
        ...prev,
        { role: 'ai', content: 'Forgive me, but my literary thoughts have strayed. Please try asking again.' }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-[#F8F4E9] flex items-center justify-center relative z-50">
        <link href={FONT_LINK} rel="stylesheet" />
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-t-2 border-[#1a1a1a] border-r-2 animate-spin rounded-full mx-auto" />
          <p className="font-playfair text-[#1a1a1a] italic text-lg font-medium animate-pulse">
            Opening the volume...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full min-h-screen bg-[#F8F4E9] flex items-center justify-center p-6 relative z-50">
        <link href={FONT_LINK} rel="stylesheet" />
        <div className="text-center max-w-md glass-card p-8 border border-[#1a1a1a]/10 rounded-xl shadow-lg">
          <span className="text-4xl block mb-4">🕯️</span>
          <p className="font-playfair text-xl text-[#1a1a1a] font-bold italic mb-6">
            This volume could not be opened.
          </p>
          <button
            onClick={() => router.push('/library')}
            className="px-6 py-3 bg-[#1a1a1a] text-white hover:bg-[#2d2d2d] rounded-xl text-xs font-bold uppercase tracking-wider font-inter transition-all"
          >
            ← Return to Library
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F4E9] text-[#1a1a1a] font-inter relative flex flex-col">
      <link href={FONT_LINK} rel="stylesheet" />

      {/* Styled overrides for Gutenberg HTML content */}
      <style dangerouslySetInnerHTML={{ __html: `
        .prose-gutenberg {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 1.125rem;
          line-height: 1.9;
          color: #1a1a1a;
        }
        .prose-gutenberg p {
          margin-bottom: 1.6rem;
          text-align: justify;
          text-justify: inter-word;
        }
        .prose-gutenberg h1, 
        .prose-gutenberg h2, 
        .prose-gutenberg h3, 
        .prose-gutenberg h4, 
        .prose-gutenberg h5, 
        .prose-gutenberg h6 {
          font-family: 'Playfair Display', Georgia, serif;
          font-weight: 700;
          color: #1a1a1a;
          margin-top: 2.8rem;
          margin-bottom: 1.4rem;
          line-height: 1.3;
        }
        .prose-gutenberg h2 {
          font-size: 1.5rem;
          border-bottom: 1px solid rgba(26,26,26,0.1);
          padding-bottom: 0.5rem;
        }
        .prose-gutenberg h3 {
          font-size: 1.25rem;
        }
        .prose-gutenberg a {
          color: #1a1a1a;
          text-decoration: underline;
        }
        .prose-gutenberg img {
          max-width: 100%;
          height: auto;
          margin: 1.5rem auto;
          display: block;
          border-radius: 4px;
        }
        .prose-gutenberg pre, .prose-gutenberg code {
          background-color: rgba(26,26,26,0.05);
          font-size: 0.9rem;
          padding: 2px 4px;
          border-radius: 3px;
        }
      `}} />

      {/* Top sticky bar */}
      <div className="fixed top-0 left-0 right-0 h-14 bg-[#F8F4E9]/95 backdrop-blur-sm border-b border-[#1a1a1a]/10 flex items-center justify-between px-6 z-30 select-none">
        {/* Left Side: Back & Progress Indicator */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/library')}
            className="text-xs font-bold text-[#1a1a1a] hover:underline flex items-center gap-1 font-inter uppercase tracking-wider"
          >
            ← Library
          </button>
          <span className="h-4 w-px bg-[#1a1a1a]/15 hidden md:block" />
          <span className="text-xs font-semibold text-[#1a1a1a]/50 truncate max-w-[200px] md:max-w-xs font-inter hidden sm:block">
            {bookTitle}
          </span>
        </div>

        {/* Center: Reading progress percentage */}
        <div
          ref={progressTextRef}
          className="absolute left-1/2 transform -translate-x-1/2 text-xs font-bold font-inter"
        >
          0% READ
        </div>

        {/* Right Side: Toggle Companion */}
        <div>
          <button
            onClick={() => setShowCompanion(!showCompanion)}
            className="text-xs font-bold border border-[#1a1a1a]/30 px-3 py-1.5 rounded-lg hover:bg-[#1a1a1a] hover:text-white transition-all uppercase tracking-wider font-inter"
          >
            {showCompanion ? 'Close Companion' : 'Companion'}
          </button>
        </div>

        {/* Reading progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#1a1a1a]/10">
          <div
            ref={progressBarRef}
            className="h-full bg-[#1a1a1a] transition-all duration-75"
            style={{ width: '0%' }}
          />
        </div>
      </div>

      {/* Dynamic Main Layout */}
      <div className="flex-1 flex flex-row pt-14 min-h-screen relative select-text">

        {/* LEFT COLLAPSIBLE OUTLINE SIDEBAR */}
        <motion.div
          animate={{ width: leftSidebarCollapsed ? 44 : 240 }}
          className="fixed left-0 top-14 bottom-0 bg-[#F1ECE1] border-r border-[#1a1a1a]/10 flex flex-col z-20 overflow-hidden select-none"
        >
          {/* Header & Toggle */}
          <div className="p-3 border-b border-[#1a1a1a]/10 flex justify-between items-center bg-[#eae4d6] h-11 shrink-0">
            {!leftSidebarCollapsed && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#1a1a1a]/50 font-inter">
                Contents
              </span>
            )}
            <button
              onClick={() => setLeftSidebarCollapsed(!leftSidebarCollapsed)}
              className="text-[#1a1a1a]/60 hover:text-[#1a1a1a] p-1 font-bold text-xs rounded hover:bg-[#1a1a1a]/5 mx-auto font-inter"
            >
              {leftSidebarCollapsed ? '→' : '←'}
            </button>
          </div>

          {/* Chapters List / Vertical text */}
          {leftSidebarCollapsed ? (
            <div className="flex-1 flex items-center justify-center py-6">
              <span
                className="uppercase tracking-widest font-bold text-xs text-[#1a1a1a]/30 font-inter whitespace-nowrap"
                style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
              >
                ✦ CONTENTS ✦
              </span>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              {chapters.length === 0 ? (
                <p className="text-xs text-[#1a1a1a]/40 italic font-inter">
                  No chapters mapped.
                </p>
              ) : (
                chapters.map((chapter) => (
                  <button
                    key={chapter.id}
                    onClick={() => scrollToChapter(chapter.id)}
                    className={`w-full text-left block text-xs font-inter py-1.5 px-2 hover:bg-[#1a1a1a]/5 rounded transition-all truncate ${
                      chapter.tag === 'h3' ? 'pl-5 text-[#1a1a1a]/70 font-light' : 'font-semibold text-[#1a1a1a]'
                    } ${
                      activeChapterId === chapter.id
                        ? 'border-l-2 border-[#1a1a1a] bg-[#1a1a1a]/5 pl-3 font-bold !text-[#1a1a1a]'
                        : ''
                    }`}
                  >
                    {chapter.text}
                  </button>
                ))
              )}
            </div>
          )}
        </motion.div>

        {/* MIDDLE MAIN READING FRAME */}
        <div
          className="flex-1 flex justify-center pb-24 transition-all duration-300"
          style={{
            paddingLeft: leftSidebarCollapsed ? '44px' : '240px',
            paddingRight: showCompanion ? '320px' : '0px'
          }}
        >
          <div
            ref={readingAreaRef}
            onMouseUp={handleTextSelection}
            className="w-full max-w-[680px] px-6 sm:px-10 md:px-14 py-16 flex flex-col justify-start select-text"
          >
            {/* Header info */}
            <div className="mb-12 border-b border-[#1a1a1a]/10 pb-6 text-center select-none">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#1a1a1a]/40 font-inter">
                Volume {bookId}
              </span>
              <h1 className="font-playfair text-3xl font-bold text-[#1a1a1a] mt-2 mb-1">
                {bookTitle}
              </h1>
              <p className="font-playfair italic text-sm text-[#1a1a1a]/60">
                by {bookAuthor}
              </p>
            </div>

            {/* Content injection */}
            <div
              className="prose-gutenberg select-text"
              dangerouslySetInnerHTML={{ __html: cleanHtml }}
            />

            {/* End of book sign */}
            <div className="mt-20 border-t border-[#1a1a1a]/15 pt-8 text-center select-none">
              <span className="text-xl">✦</span>
              <p className="font-playfair italic text-sm text-[#1a1a1a]/40 mt-1">
                Finis Volume
              </p>
            </div>
          </div>
        </div>

        {/* FLOATING TEXT SELECTION TOOLBAR */}
        <AnimatePresence>
          {toolbarCoords && selectedText && (
            <motion.div
              id="floating-selection-toolbar"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.15 }}
              style={{
                position: 'absolute',
                left: `${toolbarCoords.x}px`,
                top: `${toolbarCoords.y}px`,
                transform: 'translate(-50%, -100%)',
                zIndex: 100
              }}
              className="bg-white border border-[#1a1a1a]/15 rounded-xl shadow-xl flex items-center p-1.5 gap-1 select-none"
            >
              {saveConfirmation ? (
                <div className="px-3 py-1.5 text-xs text-emerald-600 font-semibold font-inter animate-pulse flex items-center gap-1">
                  <span>📜</span> Saved to Anthology!
                </div>
              ) : (
                <>
                  <button
                    onClick={() => handlePreFillCompanion('Explain this passage.')}
                    className="px-2.5 py-1.5 text-[11px] font-bold font-inter text-[#1a1a1a] hover:bg-[#1a1a1a]/5 rounded-lg transition-colors"
                  >
                    Explain
                  </button>
                  <button
                    onClick={() => handlePreFillCompanion('Provide a literary analysis.')}
                    className="px-2.5 py-1.5 text-[11px] font-bold font-inter text-[#1a1a1a] hover:bg-[#1a1a1a]/5 rounded-lg transition-colors"
                  >
                    Analyse
                  </button>
                  <button
                    onClick={() => handlePreFillCompanion("Let's discuss this passage.")}
                    className="px-2.5 py-1.5 text-[11px] font-bold font-inter text-[#1a1a1a] hover:bg-[#1a1a1a]/5 rounded-lg transition-colors"
                  >
                    Discuss
                  </button>
                  <span className="w-px h-4 bg-[#1a1a1a]/15 mx-0.5" />
                  <button
                    onClick={handleSavePassage}
                    disabled={savePassageLoading}
                    className="px-2.5 py-1.5 text-[11px] font-bold font-inter text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
                  >
                    {savePassageLoading ? 'Saving...' : 'Save Passage'}
                  </button>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* RIGHT COMPANION DRAWER PANEL */}
        <AnimatePresence>
          {showCompanion && (
            <motion.div
              initial={{ x: 320, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 320, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed right-0 top-14 bottom-0 w-[320px] bg-[#F8F4E9] border-l border-[#1a1a1a]/10 flex flex-col z-20 shadow-2xl select-none"
            >
              {/* Drawer Header */}
              <div className="p-4 border-b border-[#1a1a1a]/10 flex justify-between items-center bg-[#F1ECE1] shrink-0 h-14">
                <div>
                  <div className="text-[9px] uppercase tracking-wider font-bold text-[#1a1a1a]/40 font-inter">
                    Literary Companion
                  </div>
                  <div className="text-xs font-playfair font-bold text-[#1a1a1a] truncate max-w-[220px]">
                    {bookTitle}
                  </div>
                </div>
                <button
                  onClick={() => setShowCompanion(false)}
                  className="text-[#1a1a1a]/50 hover:text-[#1a1a1a] font-bold p-1 rounded hover:bg-[#1a1a1a]/5 font-inter text-sm"
                >
                  ✕
                </button>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#F8F4E9] select-text">
                {conversation.length === 0 ? (
                  <div className="text-center py-10 space-y-2 select-none">
                    <span className="text-2xl block">✒️</span>
                    <p className="font-playfair italic text-xs text-[#1a1a1a]/60">
                      Your companion is sitting alongside you. Highlight a passage or write a query to begin discussing this volume.
                    </p>
                  </div>
                ) : (
                  conversation.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-xl p-3.5 text-xs font-inter leading-relaxed shadow-sm ${
                          msg.role === 'user'
                            ? 'bg-[#1a1a1a] text-[#F8F4E9] rounded-br-none'
                            : 'bg-white text-[#1a1a1a] border border-[#1a1a1a]/10 rounded-bl-none'
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))
                )}
                {chatLoading && (
                  <div className="flex justify-start select-none">
                    <div className="bg-white text-[#1a1a1a] border border-[#1a1a1a]/10 rounded-xl rounded-bl-none p-3 text-xs font-inter italic shadow-sm animate-pulse">
                      ✍️ Scribing literary thoughts...
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input Container */}
              <div className="p-4 border-t border-[#1a1a1a]/10 bg-[#F1ECE1] shrink-0">
                {selectedText && (
                  <div className="mb-2.5 p-2 bg-white/70 border border-[#1a1a1a]/10 rounded text-[9px] font-inter text-[#1a1a1a]/60 flex justify-between items-center select-none">
                    <span className="truncate max-w-[220px]">
                      Context: &ldquo;{selectedText}&rdquo;
                    </span>
                    <button
                      onClick={() => setSelectedText('')}
                      className="text-[#1a1a1a]/50 hover:text-[#1a1a1a] font-bold ml-2 px-1 hover:bg-[#1a1a1a]/5 rounded"
                    >
                      ✕
                    </button>
                  </div>
                )}
                <div className="flex gap-2">
                  <textarea
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask about themes, characters, historical context..."
                    rows={2}
                    className="flex-1 bg-white border border-[#1a1a1a]/20 rounded-lg p-2.5 text-xs font-inter text-[#1a1a1a] focus:outline-none focus:border-[#1a1a1a]/50 resize-none placeholder-[#1a1a1a]/40"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendChat();
                      }
                    }}
                  />
                  <button
                    onClick={handleSendChat}
                    disabled={chatLoading || !chatInput.trim()}
                    className="px-3.5 bg-[#1a1a1a] text-white hover:bg-[#2d2d2d] text-xs font-semibold rounded-lg transition-colors disabled:opacity-30 flex items-center justify-center font-inter select-none"
                  >
                    Send
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* FLOATING COMPANION BUTTON */}
        <button
          onClick={() => setShowCompanion(!showCompanion)}
          className="fixed bottom-6 right-6 w-12 h-12 rounded-full bg-[#1a1a1a] text-white shadow-xl flex items-center justify-center z-50 hover:scale-105 active:scale-95 transition-all select-none border border-[#F8F4E9]/20"
          title={showCompanion ? 'Close Literary Companion' : 'Open Literary Companion'}
        >
          {showCompanion ? (
            <span className="font-bold text-sm">✕</span>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          )}
        </button>

      </div>
    </div>
  );
}

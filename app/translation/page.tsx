'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import html2canvas from 'html2canvas';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { getSourceLanguages, getTargetLanguages, getLanguageByCodeOrName } from '@/lib/languages';

interface RecentTranslation {
  sourceLanguage: string;
  targetLanguage: string;
  sourceText: string;
  translation: string;
  translatorsNote: string;
  preserveStyle: boolean;
}

export default function TranslationChamberPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [sourceText, setSourceText] = useState('');
  const [sourceLanguage, setSourceLanguage] = useState('auto');
  const [targetLanguage, setTargetLanguage] = useState('en');
  const [preserveStyle, setPreserveStyle] = useState(true);
  const [translating, setTranslating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [translationResult, setTranslationResult] = useState<{
    translation: string;
    translatorsNote: string;
  } | null>(null);

  // States for interactive features
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [recentTranslations, setRecentTranslations] = useState<RecentTranslation[]>([]);
  const [reflectionExpanded, setReflectionExpanded] = useState(true);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Protected route check
  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth?mode=login');
    }
  }, [user, loading, router]);

  const handleSourceTextInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSourceText(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 400)}px`;
    }
  };

  const handleTranslate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceText.trim()) return;

    setTranslating(true);
    setErrorMsg('');
    try {
      const response = await fetch('/api/translation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: sourceText,
          sourceLanguage: getLanguageByCodeOrName(sourceLanguage)?.name || 'Auto Detect',
          targetLanguage: getLanguageByCodeOrName(targetLanguage)?.name || 'English',
          preserveStyle,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Translation failed');
      }

      setTranslationResult({
        translation: data.translation,
        translatorsNote: data.translatorsNote,
      });

      // Update source language dropdown to detected language if Auto Detect is active and matches options exactly
      if (data.detectedLanguage && sourceLanguage === 'auto') {
        const cleanedDetected = data.detectedLanguage.trim();
        const exactMatch = getLanguageByCodeOrName(cleanedDetected);
        if (exactMatch && exactMatch.code !== 'auto') {
          setSourceLanguage(exactMatch.code);
        }
      }

      // Add to session history
      const newHistoryItem: RecentTranslation = {
        sourceLanguage,
        targetLanguage,
        sourceText,
        translation: data.translation,
        translatorsNote: data.translatorsNote,
        preserveStyle,
      };

      setRecentTranslations((prev) => {
        const updated = [newHistoryItem, ...prev];
        return updated.slice(0, 5);
      });
    } catch (err) {
      console.error(err);
      setErrorMsg((err as Error).message || 'The alchemical translation failed. Please try again.');
    } finally {
      setTranslating(false);
    }
  };

  const handleCopyTranslation = () => {
    if (!translationResult) return;
    navigator.clipboard.writeText(translationResult.translation);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  const handleSaveToAnthology = async () => {
    if (!user || !translationResult) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      const anthologyItem = {
        id: `anth_${Math.random().toString(36).substring(2, 9)}`,
        mode: 'translation',
        prompt: sourceText,
        response: translationResult.translation,
        savedAt: new Date().toISOString(),
      };

      await updateDoc(userRef, {
        anthology: arrayUnion(anthologyItem),
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving to anthology:', err);
    }
  };

  const handleDownloadShareCard = async (content: string) => {
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
        background: #F8F4E9;
        border: 1px solid rgba(26, 26, 26, 0.15);
        border-radius: 16px;
        font-family: Georgia, serif;
        color: #1a1a1a;
      `;
      card.innerHTML = `
        <div style="color: #1a1a1a; opacity: 0.5; font-size: 12px; letter-spacing: 3px; margin-bottom: 24px; text-transform: uppercase;">✦ Versecraft Translation ${chunks.length > 1 ? `(${i + 1}/${chunks.length})` : ''}</div>
        <div style="font-size: 18px; line-height: 1.8; font-style: italic; color: #1a1a1a; margin-bottom: 32px;">${chunks[i]}</div>
        <div style="color: #1a1a1a; opacity: 0.4; font-size: 11px; letter-spacing: 2px; border-top: 1px solid rgba(26, 26, 26, 0.1); padding-top: 16px;">versecraft.app</div>
      `;
      document.body.appendChild(card);
      try {
        const canvas = await html2canvas(card, { backgroundColor: null, scale: 2 });
        const link = document.createElement('a');
        link.download = chunks.length > 1 ? `versecraft-translation-${i + 1}.png` : 'versecraft-translation.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
        await new Promise(resolve => setTimeout(resolve, 500));
      } finally {
        document.body.removeChild(card);
      }
    }
  };

  const handleLoadHistory = (item: RecentTranslation) => {
    setSourceText(item.sourceText);
    
    const resolvedSource = getLanguageByCodeOrName(item.sourceLanguage);
    const resolvedTarget = getLanguageByCodeOrName(item.targetLanguage);
    
    setSourceLanguage(resolvedSource?.code || 'auto');
    setTargetLanguage(resolvedTarget?.code || 'en');
    
    setPreserveStyle(item.preserveStyle);
    setTranslationResult({
      translation: item.translation,
      translatorsNote: item.translatorsNote,
    });

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 400)}px`;
      }
    }, 50);
  };

  if (loading || (!user && !loading)) {
    return (
      <div className="min-h-screen bg-[#F8F4E9] flex items-center justify-center relative z-10">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="relative w-12 h-12 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border border-[#1a1a1a] opacity-25" />
            <div className="w-8 h-8 rounded-full border-t-2 border-[#1a1a1a] animate-spin" />
          </div>
          <span className="font-playfair text-base text-[#1a1a1a] font-medium italic">Listening to the language…</span>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Cream background base */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: '#F8F4E9',
          zIndex: 0,
          pointerEvents: 'none',
        }}
      />

      {/* Linguistic Constellations Background Ambience */}
      <motion.div
        initial={{ opacity: 0.8 }}
        animate={{ opacity: [0.8, 1, 0.8] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="fixed inset-0 pointer-events-none select-none z-0 overflow-hidden"
      >
        <svg
          className="w-full h-full text-[#1a1a1a]"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 1200 800"
          preserveAspectRatio="xMidYMid slice"
        >
          {/* Delicately connected thin constellation lines */}
          <line x1="100" y1="280" x2="220" y2="220" stroke="currentColor" strokeWidth="0.8" opacity="0.14" />
          <line x1="100" y1="280" x2="150" y2="360" stroke="currentColor" strokeWidth="0.8" opacity="0.14" />
          <line x1="150" y1="360" x2="80" y2="450" stroke="currentColor" strokeWidth="0.8" opacity="0.14" />
          <line x1="80" y1="450" x2="180" y2="520" stroke="currentColor" strokeWidth="0.8" opacity="0.14" />
          <line x1="180" y1="520" x2="120" y2="750" stroke="currentColor" strokeWidth="0.8" opacity="0.14" />
          <line x1="120" y1="750" x2="250" y2="820" stroke="currentColor" strokeWidth="0.8" opacity="0.14" />
          
          <line x1="1050" y1="120" x2="950" y2="220" stroke="currentColor" strokeWidth="0.8" opacity="0.14" />
          <line x1="950" y1="220" x2="1100" y2="280" stroke="currentColor" strokeWidth="0.8" opacity="0.14" />
          <line x1="1100" y1="280" x2="1120" y2="480" stroke="currentColor" strokeWidth="0.8" opacity="0.14" />
          <line x1="1120" y1="480" x2="980" y2="560" stroke="currentColor" strokeWidth="0.8" opacity="0.14" />
          <line x1="980" y1="560" x2="1050" y2="780" stroke="currentColor" strokeWidth="0.8" opacity="0.14" />
          <line x1="1050" y1="780" x2="920" y2="850" stroke="currentColor" strokeWidth="0.8" opacity="0.14" />

          {/* Multilingual Nodes in Margins */}
          <text x="100" y="280" fontFamily="Georgia, serif" fontSize="13" fontStyle="italic" fill="currentColor" opacity="0.22" textAnchor="middle">love</text>
          <text x="220" y="220" fontFamily="Georgia, serif" fontSize="13" fontStyle="italic" fill="currentColor" opacity="0.22" textAnchor="middle">amour</text>
          <text x="150" y="360" fontFamily="Georgia, serif" fontSize="13" fontStyle="italic" fill="currentColor" opacity="0.22" textAnchor="middle">amor</text>
          <text x="80" y="450" fontFamily="Georgia, serif" fontSize="13" fontStyle="italic" fill="currentColor" opacity="0.22" textAnchor="middle">silence</text>
          <text x="180" y="520" fontFamily="System-UI, sans-serif" fontSize="12" fill="currentColor" opacity="0.22" textAnchor="middle">静けさ</text>
          <text x="120" y="750" fontFamily="Georgia, serif" fontSize="13" fontStyle="italic" fill="currentColor" opacity="0.22" textAnchor="middle">dream</text>
          <text x="250" y="820" fontFamily="Georgia, serif" fontSize="13" fontStyle="italic" fill="currentColor" opacity="0.22" textAnchor="middle">sueño</text>

          <text x="1050" y="120" fontFamily="System-UI, sans-serif" fontSize="13" fill="currentColor" opacity="0.22" textAnchor="middle">प्रेम</text>
          <text x="950" y="220" fontFamily="Georgia, serif" fontSize="13" fontStyle="italic" fill="currentColor" opacity="0.22" textAnchor="middle">λόγος</text>
          <text x="1100" y="280" fontFamily="Georgia, serif" fontSize="13" fontStyle="italic" fill="currentColor" opacity="0.22" textAnchor="middle">word</text>
          <text x="1120" y="480" fontFamily="System-UI, sans-serif" fontSize="13" fill="currentColor" opacity="0.22" textAnchor="middle">روح</text>
          <text x="980" y="560" fontFamily="Georgia, serif" fontSize="13" fontStyle="italic" fill="currentColor" opacity="0.22" textAnchor="middle">soul</text>
          <text x="1050" y="780" fontFamily="System-UI, sans-serif" fontSize="13" fill="currentColor" opacity="0.22" textAnchor="middle">حب</text>
          <text x="920" y="850" fontFamily="Georgia, serif" fontSize="13" fontStyle="italic" fill="currentColor" opacity="0.22" textAnchor="middle">palabra</text>
        </svg>
      </motion.div>

      <div className="relative z-10 w-full min-h-screen pt-28 pb-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Dashboard Back Link */}
        <div className="mb-6 max-w-6xl mx-auto text-left">
          <Link
            href="/dashboard"
            className="text-xs text-[#1a1a1a]/70 hover:text-[#1a1a1a] transition-all inline-flex items-center gap-1 font-inter font-semibold"
          >
            ← Dashboard
          </Link>
        </div>

        {/* Main Headers */}
        <div className="text-center mb-12 max-w-2xl mx-auto space-y-4">
          <h1 className="font-playfair text-4xl sm:text-5xl font-bold text-[#1a1a1a] tracking-wide">
            The Translation Chamber
          </h1>
          <div className="h-[1px] w-24 bg-[#1a1a1a]/20 mx-auto" />
          <div className="space-y-1">
            <p className="font-playfair italic text-[#1a1a1a]/90 text-base sm:text-lg">
              Where words cross borders without losing their soul
            </p>
            <p className="font-inter text-[#6b6b6b] text-[10px] uppercase tracking-wider">
              Translate poetry, prose, letters, and literature with emotional fidelity.
            </p>
          </div>
        </div>

        {/* Main Desk Layout */}
        <div className="flex flex-col lg:flex-row items-stretch border border-[#1a1a1a]/15 rounded-2xl bg-white/40 backdrop-blur-md overflow-hidden shadow-xl max-w-6xl mx-auto mb-12">
          
          {/* Left Column: Input Chamber */}
          <div className="flex-1 p-6 sm:p-8 flex flex-col justify-between space-y-6">
            <form onSubmit={handleTranslate} className="space-y-6 flex-grow flex flex-col justify-between">
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-widest text-[#1a1a1a]/70 mb-2 font-inter">
                    Original Text
                  </label>
                  <textarea
                    ref={textareaRef}
                    value={sourceText}
                    onChange={handleSourceTextInput}
                    placeholder="Bring a poem, a letter, a memory, a fragment of language…"
                    style={{ minHeight: '200px' }}
                    dir={sourceLanguage === 'auto' ? 'auto' : (getLanguageByCodeOrName(sourceLanguage)?.direction || 'ltr')}
                    className="w-full px-4 py-3 rounded-xl outline-none bg-white/80 border border-[#1a1a1a]/15 text-sm text-[#1a1a1a] placeholder-[#1a1a1a]/30 resize-none leading-relaxed transition-all focus:border-[#1a1a1a] font-serif"
                  />
                </div>

                {/* Language Selectors (Language Bridge) */}
                <div className="border border-[#1a1a1a]/10 rounded-xl p-4 bg-white/60 shadow-sm">
                  <label className="block text-[9px] uppercase font-bold tracking-widest text-[#1a1a1a]/60 mb-3 font-inter text-center">
                    Language Bridge
                  </label>
                  <div className="flex items-center gap-3">
                    <select
                      value={sourceLanguage}
                      onChange={(e) => setSourceLanguage(e.target.value)}
                      className="flex-1 min-w-0 px-3 py-2.5 rounded-lg outline-none bg-[#F8F4E9]/50 border border-[#1a1a1a]/15 text-[#1a1a1a] text-xs font-serif focus:border-[#1a1a1a] transition-all cursor-pointer"
                    >
                      {getSourceLanguages().map((lang) => (
                        <option key={lang.code} value={lang.code} className="text-[#1a1a1a] bg-[#F8F4E9]">
                          {lang.name} {lang.nativeName && lang.nativeName !== lang.name ? `(${lang.nativeName})` : ''}
                        </option>
                      ))}
                    </select>
                    
                    <span className="text-[#1a1a1a]/40 text-xs font-serif select-none">✦</span>
                    
                    <select
                      value={targetLanguage}
                      onChange={(e) => setTargetLanguage(e.target.value)}
                      className="flex-1 min-w-0 px-3 py-2.5 rounded-lg outline-none bg-[#F8F4E9]/50 border border-[#1a1a1a]/15 text-[#1a1a1a] text-xs font-serif focus:border-[#1a1a1a] transition-all cursor-pointer"
                    >
                      {getTargetLanguages().map((lang) => (
                        <option key={lang.code} value={lang.code} className="text-[#1a1a1a] bg-[#F8F4E9]">
                          {lang.name} {lang.nativeName && lang.nativeName !== lang.name ? `(${lang.nativeName})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Translation Philosophy */}
                <div className="border border-[#1a1a1a]/10 rounded-xl p-4 bg-white/60 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-[#1a1a1a]/70 font-inter">
                      Translation Philosophy
                    </span>
                    <span className="text-[10px] text-[#6b6b6b] font-inter italic">
                      {preserveStyle ? "Literary Preservation" : "Literal Clarity"}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-center gap-4 py-1">
                    <button
                      type="button"
                      onClick={() => setPreserveStyle(false)}
                      className={`text-xs font-serif transition-all ${
                        !preserveStyle ? 'font-bold text-[#1a1a1a] underline decoration-[#1a1a1a]/50 underline-offset-4' : 'text-[#1a1a1a]/40 hover:text-[#1a1a1a]/70'
                      }`}
                    >
                      Literal Clarity
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setPreserveStyle(!preserveStyle)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        preserveStyle ? 'bg-[#1a1a1a]' : 'bg-[#1a1a1a]/15'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-[#F8F4E9] shadow-sm ring-0 transition duration-200 ease-in-out ${
                          preserveStyle ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>

                    <button
                      type="button"
                      onClick={() => setPreserveStyle(true)}
                      className={`text-xs font-serif transition-all ${
                        preserveStyle ? 'font-bold text-[#1a1a1a] underline decoration-[#1a1a1a]/50 underline-offset-4' : 'text-[#1a1a1a]/40 hover:text-[#1a1a1a]/70'
                      }`}
                    >
                      Literary Preservation
                    </button>
                  </div>
                  <p className="text-[10px] text-[#6b6b6b] text-center font-inter leading-normal">
                    Preserve rhythm, imagery, and emotional cadence.
                  </p>
                </div>
              </div>

              {/* Submit button */}
              <div className="pt-6">
                <button
                  type="submit"
                  disabled={translating || !sourceText.trim()}
                  className={`w-full py-3.5 bg-[#1a1a1a] hover:bg-[#2d2d2d] text-[#F8F4E9] text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-2 border border-[#1a1a1a] ${
                    translating || !sourceText.trim() ? 'opacity-40 cursor-not-allowed' : 'active:scale-[0.98]'
                  }`}
                >
                  {translating ? (
                    <>
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-[#F8F4E9] border-t-transparent animate-spin" />
                      <span>Carrying meaning across...</span>
                    </>
                  ) : (
                    'Interpret Across Languages'
                  )}
                </button>
              </div>
            </form>

            {/* Error Message */}
            {errorMsg && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-center text-xs text-red-700">
                {errorMsg}
              </div>
            )}
          </div>

          {/* Center Divider */}
          <div className="flex lg:flex-col items-center justify-center py-4 lg:py-0 px-6 lg:px-0">
            <div className="h-[1px] w-full lg:w-[1px] lg:h-full bg-[#1a1a1a]/10" />
            <span className="px-3 py-1 text-xs text-[#1a1a1a]/40 select-none font-serif">✦</span>
            <div className="h-[1px] w-full lg:w-[1px] lg:h-full bg-[#1a1a1a]/10" />
          </div>

          {/* Right Column: Output / Welcome Panel */}
          <div className="flex-1 p-6 sm:p-8 flex flex-col justify-between bg-white/5 space-y-6 min-h-[460px]">
            <AnimatePresence mode="wait">
              {translating ? (
                /* Loading State */
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center text-center my-auto py-16 space-y-6"
                >
                  <div className="relative w-16 h-16 flex items-center justify-center">
                    <motion.div
                      animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.35, 0.15] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute inset-0 rounded-full border border-[#1a1a1a]"
                    />
                    <span className="text-xs text-[#1a1a1a]/60 select-none font-serif">✦</span>
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-playfair text-base italic text-[#1a1a1a] animate-pulse">
                      Carrying meaning across…
                    </h3>
                    <p className="text-[9px] text-[#6b6b6b]/80 font-inter tracking-wider uppercase">
                      Listening to the language
                    </p>
                  </div>
                </motion.div>
              ) : !translationResult ? (
                /* Welcome / Empty State */
                <motion.div
                  key="welcome"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex flex-col items-center justify-center text-center my-auto py-12 space-y-6"
                >
                  <span className="text-2xl text-[#1a1a1a] opacity-80">✦</span>
                  <div className="space-y-4 max-w-md">
                    <h3 className="font-playfair text-lg text-[#1a1a1a] font-bold">The Interpretation Desk</h3>
                    <p className="font-playfair italic text-sm text-[#1a1a1a]/70 leading-relaxed">
                      &quot;Paste any text on the left — a poem, a passage, a letter — and I will carry it across languages while telling you what survives the crossing and what is inevitably transformed. Every translation is an interpretation. Let us begin.&quot;
                    </p>
                  </div>
                </motion.div>
              ) : (
                /* Output State */
                <motion.div
                  key="output"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="space-y-8 flex-grow flex flex-col justify-between"
                >
                  <div className="space-y-8 flex-grow flex flex-col justify-center">
                    {/* Visual Hero Translation Segment */}
                    <div className="flex-grow flex flex-col justify-center py-6">
                      <label className="block text-[10px] uppercase font-bold tracking-widest text-[#1a1a1a]/40 mb-4 font-inter text-center">
                        Translated Passage
                      </label>
                      <div className="max-w-prose mx-auto text-center px-4">
                        <p
                          dir={getLanguageByCodeOrName(targetLanguage)?.direction || 'ltr'}
                          className="font-playfair italic text-lg sm:text-xl md:text-2xl leading-loose text-[#1a1a1a] whitespace-pre-wrap"
                        >
                          {translationResult.translation}
                        </p>
                      </div>
                      
                      {/* Subtle Metadata Sub-bar */}
                      <div className="mt-8 text-center space-y-1">
                        <div className="text-[10px] uppercase font-bold tracking-wider text-[#1a1a1a]/40 font-inter">
                          {getLanguageByCodeOrName(sourceLanguage)?.name || sourceLanguage} ✦ {getLanguageByCodeOrName(targetLanguage)?.name || targetLanguage}
                        </div>
                        <div className="text-[9px] text-[#6b6b6b] font-inter italic">
                          Interpreted with {preserveStyle ? "Literary Preservation" : "Literal Clarity"}
                        </div>
                      </div>
                    </div>

                    {/* Translator's Reflection Collapsible Card */}
                    <div className="border border-[#1a1a1a]/10 rounded-xl overflow-hidden bg-white/40 shadow-sm">
                      <button
                        type="button"
                        onClick={() => setReflectionExpanded(!reflectionExpanded)}
                        className="w-full px-4 py-3 flex items-center justify-between hover:bg-[#1a1a1a]/5 transition-all text-left"
                      >
                        <span className="text-[10px] uppercase font-bold tracking-widest text-[#1a1a1a]/70 font-inter">
                          Translator&apos;s Reflection
                        </span>
                        <span className="text-[10px] text-[#1a1a1a]/55 select-none">
                          {reflectionExpanded ? '▼' : '▲'}
                        </span>
                      </button>
                      
                      <AnimatePresence initial={false}>
                        {reflectionExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="border-t border-[#1a1a1a]/10"
                          >
                            <div className="p-4 bg-white/20">
                              <p className="font-inter text-xs text-[#555555] leading-relaxed whitespace-pre-wrap">
                                {translationResult.translatorsNote}
                              </p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Interactive Options Toolbar */}
                  <div className="pt-4 border-t border-[#1a1a1a]/10 flex flex-col sm:flex-row gap-3 items-center justify-between w-full">
                    <div className="flex gap-2 w-full sm:w-auto justify-center">
                      <button
                        type="button"
                        onClick={handleCopyTranslation}
                        className="flex-1 sm:flex-none px-4 py-2 bg-white/60 hover:bg-white/90 border border-[#1a1a1a]/15 text-[#1a1a1a] rounded-lg text-[10px] uppercase font-bold tracking-wider font-inter transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                      >
                        {copyFeedback ? '✨ Copied!' : '📋 Copy Passage'}
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveToAnthology}
                        className="flex-1 sm:flex-none px-4 py-2 bg-[#1a1a1a] hover:bg-[#2d2d2d] text-[#F8F4E9] border border-[#1a1a1a] rounded-lg text-[10px] uppercase font-bold tracking-wider font-inter transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                      >
                        {saveSuccess ? '✅ Saved!' : '📜 Save to Anthology'}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDownloadShareCard(translationResult.translation)}
                      className="w-full sm:w-auto px-4 py-2 bg-white/60 hover:bg-white/90 border border-[#1a1a1a]/15 text-[#1a1a1a] text-[10px] font-bold uppercase tracking-wider rounded-lg font-inter transition-all flex items-center justify-center gap-1 shadow-sm active:scale-95"
                    >
                      🎨 Download Card
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>

        {/* Session History Segment */}
        {recentTranslations.length > 0 && (
          <div className="mt-12 bg-white/40 backdrop-blur-md border border-[#1a1a1a]/15 rounded-2xl p-6 sm:p-8 shadow-sm text-[#1a1a1a] max-w-6xl mx-auto">
            <h3 className="font-playfair text-xl font-bold text-[#1a1a1a] border-b border-[#1a1a1a]/10 pb-2.5 mb-6">
              Recent Translations
            </h3>
            <div className="space-y-4">
              {recentTranslations.map((item, idx) => (
                <div
                  key={idx}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-white/50 border border-[#1a1a1a]/10 rounded-xl hover:border-[#1a1a1a]/25 transition-all gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-[#1a1a1a] font-inter bg-[#1a1a1a]/5 px-2.5 py-1 rounded-full border border-[#1a1a1a]/10">
                        {item.sourceLanguage} → {item.targetLanguage}
                      </span>
                      {item.preserveStyle && (
                        <span className="text-[9px] uppercase font-bold tracking-widest text-[#6b6b6b] font-inter">
                          • Style Preserved
                        </span>
                      )}
                    </div>
                    <p className="font-playfair italic text-sm text-[#1a1a1a]/70 leading-relaxed line-clamp-1">
                      &quot;{item.sourceText.length > 80 ? `${item.sourceText.slice(0, 80)}...` : item.sourceText}&quot;
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleLoadHistory(item)}
                    className="w-full sm:w-auto px-4 py-2 bg-[#1a1a1a] hover:bg-[#2d2d2d] text-[#F8F4E9] text-[10px] font-bold uppercase tracking-wider rounded-lg font-inter transition-all shadow-sm hover:opacity-90 active:scale-95"
                  >
                    Load Passage
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </>
  );
}

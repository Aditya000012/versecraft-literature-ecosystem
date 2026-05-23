'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';

interface Message {
  role: 'user' | 'model' | 'system';
  content: string;
  timestamp?: Date | string | number | null;
}

const genres = [
  { id: 'gothic', name: 'Gothic', desc: 'Dark shadows & ancient secrets' },
  { id: 'sufi', name: 'Sufi', desc: 'Divine longing & mystical wisdom' },
  { id: 'fantasy', name: 'Fantasy', desc: 'Mythic realms & courtly magic' },
  { id: 'romance', name: 'Romance', desc: 'Nuanced connections & soft sighs' },
  { id: 'horror', name: 'Horror', desc: 'Creeping dread & macabre wonders' },
  { id: 'mystery', name: 'Mystery', desc: 'Conspiracies & deductive logic' },
  { id: 'realism', name: 'Realism', desc: 'Unvarnished truth & human grit' },
  { id: 'classical', name: 'Classical', desc: 'Symmetrical grace & high tragedy' },
];

const eras = [
  { id: 'victorian', name: 'Victorian', desc: 'Formal elegance & industrial gloom' },
  { id: 'ancient', name: 'Ancient', desc: 'Clay tablets, deserts & starlight' },
  { id: 'renaissance', name: 'Renaissance', desc: 'Humanist rebirth & courtly rhetoric' },
  { id: 'modernist', name: 'Modernist', desc: 'Fragmented streams & silver rain' },
  { id: 'romantic', name: 'Romantic Period', desc: 'Sublime nature & intense passion' },
  { id: 'contemporary', name: 'Contemporary', desc: 'Metamodern ironies & quiet mirrors' },
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

// Theme configurations for background gradients and accent colors
const themeStyles: Record<string, {
  bgClass: string;
  accentClass: string;
  cardClass: string;
  borderClass: string;
  glowClass: string;
  icon: string;
  headingFont: string;
}> = {
  'gothic-victorian': {
    bgClass: 'from-[#050000] via-[#100305] to-[#040103]',
    accentClass: 'text-red-500 hover:text-red-400',
    cardClass: 'bg-black/80 border-red-950/40 backdrop-blur-xl',
    borderClass: 'border-red-900/30',
    glowClass: 'shadow-[0_0_20px_rgba(185,28,28,0.07)]',
    icon: '🕯️',
    headingFont: 'font-serif tracking-tight',
  },
  'sufi-ancient': {
    bgClass: 'from-[#0e071e] via-[#05020c] to-[#020105]',
    accentClass: 'text-amber-500 hover:text-amber-400',
    cardClass: 'bg-[#0a0518]/75 border-amber-900/30 backdrop-blur-xl',
    borderClass: 'border-amber-700/20',
    glowClass: 'shadow-[0_0_20px_rgba(245,158,11,0.07)]',
    icon: '✨',
    headingFont: 'font-serif tracking-widest',
  },
  'fantasy-renaissance': {
    bgClass: 'from-[#021008] via-[#010502] to-[#010201]',
    accentClass: 'text-emerald-500 hover:text-emerald-400',
    cardClass: 'bg-black/75 border-emerald-950/40 backdrop-blur-xl',
    borderClass: 'border-emerald-800/30',
    glowClass: 'shadow-[0_0_20px_rgba(16,185,129,0.07)]',
    icon: '🌲',
    headingFont: 'font-serif',
  },
  'romance-modernist': {
    bgClass: 'from-[#140b12] via-[#0b050c] to-[#050206]',
    accentClass: 'text-rose-400 hover:text-rose-300',
    cardClass: 'bg-black/70 border-rose-950/30 backdrop-blur-xl',
    borderClass: 'border-rose-900/20',
    glowClass: 'shadow-[0_0_20px_rgba(251,113,133,0.07)]',
    icon: '🌧️',
    headingFont: 'font-serif tracking-normal',
  },
};

const defaultTheme = {
  bgClass: 'from-[#0a0a1a] via-[#05050f] to-[#020206]',
  accentClass: 'text-gold hover:text-gold-light',
  cardClass: 'bg-navy/65 border-white/5 backdrop-blur-xl',
  borderClass: 'border-white/5',
  glowClass: 'shadow-[0_0_20px_rgba(201,168,76,0.05)]',
  icon: '📜',
  headingFont: 'font-playfair',
};

function AdvancedChatPageContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlChatId = searchParams.get('id');

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

  // Sharing states
  const [shareText, setShareText] = useState('');
  const [shareMode, setShareMode] = useState(false);
  const [saveSuccessId, setSaveSuccessId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Dynamic Theme Styling Resolution
  const getActiveThemeKey = () => {
    if (!selectedGenre || !selectedEra) return 'default';
    const key = `${selectedGenre.toLowerCase()}-${selectedEra.toLowerCase()}`;
    return themeStyles[key] ? key : 'default';
  };

  const themeKey = getActiveThemeKey();
  const currentTheme = themeKey !== 'default' ? themeStyles[themeKey] : defaultTheme;

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
      if (urlChatId) {
        try {
          const docRef = doc(db, 'users', user.uid, 'chats', urlChatId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setChatId(urlChatId);
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
  }, [user, urlChatId]);

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

  const triggerExportCard = (text: string) => {
    setShareText(text);
    setShareMode(true);
  };

  const handleExportPNG = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background Gradient (Dark Obsidian matching advanced layout)
    const bgGrad = ctx.createLinearGradient(0, 0, 800, 600);
    if (selectedGenre === 'gothic' && selectedEra === 'victorian') {
      bgGrad.addColorStop(0, '#050000');
      bgGrad.addColorStop(1, '#100305');
      ctx.strokeStyle = '#b91c1c'; // crimson borders
    } else if (selectedGenre === 'sufi' && selectedEra === 'ancient') {
      bgGrad.addColorStop(0, '#0e071e');
      bgGrad.addColorStop(1, '#05020c');
      ctx.strokeStyle = '#d97706'; // deep amber/gold borders
    } else if (selectedGenre === 'fantasy' && selectedEra === 'renaissance') {
      bgGrad.addColorStop(0, '#021008');
      bgGrad.addColorStop(1, '#010201');
      ctx.strokeStyle = '#10b981'; // emerald borders
    } else if (selectedGenre === 'romance' && selectedEra === 'modernist') {
      bgGrad.addColorStop(0, '#140b12');
      bgGrad.addColorStop(1, '#050206');
      ctx.strokeStyle = '#fb7185'; // soft rose borders
    } else {
      bgGrad.addColorStop(0, '#0a0a1a');
      bgGrad.addColorStop(1, '#05050f');
      ctx.strokeStyle = '#c9a84c'; // classic gold borders
    }

    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 800, 600);

    // Gold Border Filigree
    ctx.lineWidth = 3;
    ctx.strokeRect(30, 30, 740, 540);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.strokeRect(40, 40, 720, 520);

    // Draw Corner Accents
    const drawCorner = (x: number, y: number, r: number) => {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = ctx.strokeStyle as string;
      ctx.fill();
    };
    drawCorner(40, 40, 4);
    drawCorner(760, 40, 4);
    drawCorner(40, 560, 4);
    drawCorner(760, 560, 4);

    // Title: Versecraft
    ctx.fillStyle = ctx.strokeStyle as string;
    ctx.font = 'bold 28px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('VERSECRAFT', 400, 95);

    // Subtitle
    ctx.fillStyle = 'rgba(245, 240, 232, 0.4)';
    ctx.font = '10px sans-serif';
    ctx.fillText(`${selectedGenre.toUpperCase()} • ${selectedEra.toUpperCase()} CHAMBER`, 400, 115);

    // Drawing quote marks
    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.font = 'italic 160px Georgia, serif';
    ctx.fillText('“', 400, 260);

    // Wrap quote text
    ctx.fillStyle = '#f5f0e8';
    ctx.font = 'italic 20px Georgia, serif';
    ctx.textAlign = 'center';

    const words = shareText.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    const maxWidth = 600;

    for (let i = 0; i < words.length; i++) {
      const testLine = currentLine + words[i] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && i > 0) {
        lines.push(currentLine);
        currentLine = words[i] + ' ';
      } else {
        currentLine = testLine;
      }
    }
    lines.push(currentLine);

    // Print lines
    let startY = 300 - (lines.length * 15);
    lines.forEach((line) => {
      ctx.fillText(line.trim(), 400, startY);
      startY += 32;
    });

    // Drawing closing quote marks
    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.font = 'italic 120px Georgia, serif';
    ctx.fillText('”', 400, startY + 50);

    // Footer signature
    ctx.fillStyle = ctx.strokeStyle as string;
    ctx.font = 'italic 14px Georgia, serif';
    ctx.fillText(`Advanced Dialogue • ${currentMode.toUpperCase()}`, 400, 520);

    // Convert and Download
    const dataUrl = canvas.toDataURL('image/png');
    const downloadLink = document.createElement('a');
    downloadLink.download = `versecraft-advanced-anthology-${Date.now()}.png`;
    downloadLink.href = dataUrl;
    downloadLink.click();
    setShareMode(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-navy flex items-center justify-center relative z-10">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-t-2 border-gold border-r-2 animate-spin" />
          <span className="font-playfair text-lg text-gold font-medium italic">Attuning chamber frequencies...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative z-10 w-full min-h-screen flex flex-col pt-20 transition-all duration-1000 bg-gradient-to-br ${currentTheme.bgClass}`}>
      <AnimatePresence mode="wait">
        {wizardActive ? (
          /* PART A: The Selection Wizard */
          <motion.div
            key="wizard"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.6 }}
            className="flex-grow max-w-5xl w-full mx-auto px-4 py-8 flex flex-col justify-center"
          >
            <div className="text-center mb-10">
              <span className="text-[10px] tracking-[0.25em] uppercase font-bold text-gold/80 block mb-2 font-inter">THE SECRET ARCHIVES</span>
              <h1 className="font-playfair text-4xl sm:text-5xl font-bold text-cream">Advanced Literary Chamber</h1>
              <p className="font-inter text-sm text-cream/60 mt-3 max-w-xl mx-auto font-light leading-relaxed">
                Step inside the theme-locked room. Attune your creative companion with strict historical filters, specific writing styles, and regional cadences to create a completely custom-themed sandbox.
              </p>
            </div>

            <div className="glass-card border-white/5 rounded-2xl p-6 sm:p-8 space-y-8 shadow-2xl relative overflow-hidden">
              {/* Genre Selector */}
              <div>
                <label className="block text-xs uppercase tracking-widest text-gold font-bold mb-3 font-inter">1. Select Literary Genre</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {genres.map((g) => (
                    <button
                      key={g.id}
                      onClick={() => setSelectedGenre(g.id)}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        selectedGenre === g.id
                          ? 'bg-gold/15 border-gold shadow-[0_0_12px_rgba(201,168,76,0.15)]'
                          : 'bg-white/5 border-white/5 hover:border-gold/30 hover:bg-white/10'
                      }`}
                    >
                      <span className="font-playfair font-bold text-cream block text-sm">{g.name}</span>
                      <span className="text-[10px] text-cream/40 block mt-1 leading-snug font-light">{g.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Era Selector */}
              <div>
                <label className="block text-xs uppercase tracking-widest text-gold font-bold mb-3 font-inter">2. Choose Historical Era</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {eras.map((e) => (
                    <button
                      key={e.id}
                      onClick={() => setSelectedEra(e.id)}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        selectedEra === e.id
                          ? 'bg-gold/15 border-gold shadow-[0_0_12px_rgba(201,168,76,0.15)]'
                          : 'bg-white/5 border-white/5 hover:border-gold/30 hover:bg-white/10'
                      }`}
                    >
                      <span className="font-playfair font-bold text-cream block text-sm">{e.name}</span>
                      <span className="text-[10px] text-cream/40 block mt-1 leading-snug font-light">{e.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Advanced Controls Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/5">
                {/* Author Persona Mimicry */}
                <div>
                  <label className="block text-xs uppercase tracking-widest text-gold font-bold mb-2 font-inter">3. Author Style Mimicry (Optional)</label>
                  <p className="text-[10px] text-cream/40 mb-3 font-light">Input a writer&apos;s name (e.g. John Milton, Virginia Woolf) to enforce their syntax and vocabulary structure.</p>
                  <input
                    type="text"
                    placeholder="e.g. Oscar Wilde, Edgar Allan Poe, Rumi..."
                    value={authorStyle}
                    onChange={(e) => setAuthorStyle(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl outline-none glass-input text-sm text-cream placeholder-cream/25"
                  />
                </div>

                {/* Output Language */}
                <div>
                  <label className="block text-xs uppercase tracking-widest text-gold font-bold mb-2 font-inter">4. Output Language</label>
                  <p className="text-[10px] text-cream/40 mb-3 font-light">Force the literary model to think and respond inside a specific dialect or language framework.</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {languages.map((l) => (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => setSelectedLanguage(l.id)}
                        className={`py-2 px-3 border rounded-xl text-xs font-semibold font-inter transition-all ${
                          selectedLanguage === l.id
                            ? 'bg-gold border-transparent text-navy'
                            : 'bg-white/5 border-white/5 hover:border-gold/30 hover:bg-white/10'
                        }`}
                      >
                        {l.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Submit Trigger */}
              <div className="pt-6 text-center">
                <button
                  onClick={handleLaunchChamber}
                  disabled={!selectedGenre || !selectedEra}
                  className="px-10 py-4 bg-gold disabled:bg-gray-800 disabled:text-cream/30 hover:bg-gold-light text-navy font-bold uppercase tracking-wider rounded-xl text-xs font-inter transition-all shadow-lg shadow-gold/15"
                >
                  Enter the Chamber
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
            <div className={`py-3 px-6 border-b transition-colors duration-1000 fixed top-20 left-0 right-0 z-30 flex justify-between items-center max-w-7xl mx-auto rounded-b-xl ${currentTheme.cardClass} ${currentTheme.borderClass} ${currentTheme.glowClass}`}>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setWizardActive(true)}
                  className="text-xs text-cream/60 hover:text-gold transition-colors flex items-center gap-1 font-inter font-medium"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                  </svg>
                  Recalibrate Frequencies
                </button>
                <span className="text-white/20">|</span>
                <span className="text-xs font-bold text-cream font-inter tracking-wide uppercase flex items-center gap-1.5">
                  <span className="text-sm">{currentTheme.icon}</span>
                  {selectedGenre} • {selectedEra}
                </span>
                {authorStyle && (
                  <>
                    <span className="text-white/10 hidden sm:inline">•</span>
                    <span className="text-[10px] text-gold font-bold uppercase font-inter hidden sm:inline">
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
                className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-md text-[10px] uppercase font-bold tracking-wider font-inter text-cream transition-colors"
              >
                Reset Scroll
              </button>
            </div>

            {/* Message Stream */}
            <div className="flex-grow overflow-y-auto pb-32 pt-16 px-4 max-w-4xl w-full mx-auto flex flex-col justify-start">
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
                          ? 'bg-gold/10 border-gold/30 text-cream rounded-br-none shadow shadow-gold/5'
                          : `${currentTheme.cardClass} ${currentTheme.borderClass} ${currentTheme.glowClass} text-cream rounded-bl-none`
                      }`}
                    >
                      {msg.role === 'model' && (
                        <div className="flex justify-between items-center mb-3 border-b border-white/5 pb-2">
                          <span className="text-[9px] uppercase tracking-wider text-gold font-bold font-inter flex items-center gap-1">
                            <span>{currentTheme.icon}</span> {currentMode} Companion
                          </span>
                        </div>
                      )}

                      <p className={`font-inter text-sm leading-relaxed whitespace-pre-wrap font-light ${msg.role === 'model' ? `italic text-cream-light ${currentTheme.headingFont} text-base` : ''}`}>
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
                            onClick={() => triggerExportCard(msg.content)}
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
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-start"
                  >
                    <div className={`${currentTheme.cardClass} ${currentTheme.borderClass} ${currentTheme.glowClass} p-5 rounded-2xl rounded-bl-none flex items-center gap-2`}>
                      <div className="w-1.5 h-1.5 bg-gold rounded-full animate-bounce" />
                      <div className="w-1.5 h-1.5 bg-gold rounded-full animate-bounce [animation-delay:0.2s]" />
                      <div className="w-1.5 h-1.5 bg-gold rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </motion.div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input Bar */}
            <div className={`fixed bottom-0 left-0 right-0 border-t py-4 px-4 z-20 transition-all duration-1000 ${currentTheme.cardClass} ${currentTheme.borderClass}`}>
              <div className="max-w-4xl mx-auto flex flex-col gap-3">
                {/* Mode Selector Chips */}
                <div className="flex gap-2 overflow-x-auto pb-1.5 no-scrollbar scroll-smooth">
                  {companionModes.map((mode) => (
                    <button
                      key={mode.id}
                      onClick={() => setCurrentMode(mode.id)}
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
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder={`Scribe your response inside the locked room... Mode: ${companionModes.find((m) => m.id === currentMode)?.name}`}
                    rows={1}
                    className="flex-grow px-4 py-3.5 text-sm rounded-xl outline-none glass-input resize-none"
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* Share card Overlay Modal */}
      {shareMode && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="glass-card max-w-xl w-full p-6 sm:p-8 rounded-2xl border border-white/10 shadow-2xl relative">
            <button
              onClick={() => setShareMode(false)}
              className="absolute top-4 right-4 text-cream/40 hover:text-cream transition-colors text-lg"
            >
              ✕
            </button>
            <h3 className="font-playfair text-xl font-bold text-gold text-center mb-6">Aesthetic Card Export</h3>
            
            {/* Live Card Preview */}
            <div className={`rounded-xl border p-6 relative mb-6 min-h-[220px] flex flex-col justify-between ${
              selectedGenre === 'gothic' && selectedEra === 'victorian' ? 'bg-gradient-to-br from-[#050000] to-[#100305] border-red-500/40' :
              selectedGenre === 'sufi' && selectedEra === 'ancient' ? 'bg-gradient-to-br from-[#0e071e] to-[#05020c] border-amber-500/40' :
              selectedGenre === 'fantasy' && selectedEra === 'renaissance' ? 'bg-gradient-to-br from-[#021008] to-[#010201] border-emerald-500/40' :
              selectedGenre === 'romance' && selectedEra === 'modernist' ? 'bg-gradient-to-br from-[#140b12] to-[#050206] border-rose-500/40' :
              'bg-gradient-to-br from-[#0c0c24] to-[#04040a] border-gold/30'
            }`}>
              <div className="text-center">
                <span className="font-playfair text-xs font-bold text-gold tracking-widest block mb-4">VERSECRAFT</span>
                <p className="font-playfair italic text-cream/90 text-sm leading-relaxed text-center px-4">
                  “ {shareText} ”
                </p>
              </div>
              <span className="text-[10px] text-gold font-bold uppercase tracking-wider block text-center mt-6">
                {selectedGenre.toUpperCase()} • {selectedEra.toUpperCase()} CHAMBER
              </span>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setShareMode(false)}
                className="flex-1 py-3 bg-white/5 border border-white/10 rounded-lg text-xs font-bold uppercase tracking-wider font-inter text-cream transition-all hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                onClick={handleExportPNG}
                className="flex-1 py-3 bg-gold hover:bg-gold-light rounded-lg text-xs font-bold uppercase tracking-wider font-inter text-navy transition-all shadow-md shadow-gold/15"
              >
                Download Graphic Card
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdvancedChatPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-navy flex items-center justify-center relative z-10">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-t-2 border-gold border-r-2 animate-spin" />
          <span className="font-playfair text-lg text-gold font-medium italic">Attuning chamber frequencies...</span>
        </div>
      </div>
    }>
      <AdvancedChatPageContent />
    </Suspense>
  );
}

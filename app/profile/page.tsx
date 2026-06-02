'use client';

import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import html2canvas from 'html2canvas';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, increment, collection, getDocs, query, where } from 'firebase/firestore';

interface AnthologyItem {
  id: string;
  mode: string;
  genre?: string;
  era?: string;
  prompt: string;
  response: string;
  savedAt: Date | string | { seconds: number; nanoseconds: number } | null;
}

interface WishlistItem {
  bookId: string;
  title: string;
  authors: string[];
  thumbnail?: string;
  infoLink?: string;
  addedAt: Date | string | { seconds: number; nanoseconds: number } | null;
}

interface Comment {
  uid: string;
  displayName: string;
  content: string;
  createdAt: string;
}

interface Post {
  id: string;
  uid: string;
  displayName: string;
  title: string;
  content: string;
  type: string;
  createdAt: string;
  likes: string[];
  comments: Comment[];
}

interface ProfileData {
  displayName?: string | null;
  email?: string | null;
  createdAt?: unknown;
  timeSpent?: number;
  anthology?: AnthologyItem[];
  wishlist?: WishlistItem[];
  interestedGenres?: string[];
  interestedEras?: string[];
  followers?: string[];
  following?: string[];
  preferences?: {
    favoriteGenre?: string;
    favoriteEra?: string;
    customNote?: string;
  };
}

const genresList = [
  'Fiction',
  'Literary Fiction',
  'Poetry',
  'Gothic',
  'Romance',
  'Mystery',
  'Fantasy',
  'Horror',
  'Magical Realism',
  'Historical Fiction',
  'Realism',
  'Sufi',
  'Classical',
  'Science Fiction',
  'Dystopian',
  'Psychological Thriller',
  'Adventure',
  'Satire',
  'Tragedy',
  'Comedy',
  'Epic',
  'Noir',
  'Existential',
  'Supernatural',
  'War Literature',
  'Political Fiction',
  'Philosophical Fiction',
  'Classics'
];

const erasList = [
  'Ancient',
  'Medieval',
  'Renaissance',
  'Baroque',
  'Enlightenment',
  'Romantic Period',
  'Victorian',
  'Edwardian',
  'Modernist',
  'Mid-Century',
  'Postmodern',
  'Contemporary',
  'Present Day'
];

function ProfilePageContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab') || 'my-profile';

  const [activeTab, setActiveTab] = useState(tabParam);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [timeSpent, setTimeSpent] = useState(0);
  const [chatCount, setChatCount] = useState(0);

  // Preference Form states
  const [interestedGenres, setInterestedGenres] = useState<string[]>([]);
  const [interestedEras, setInterestedEras] = useState<string[]>([]);
  const [favoriteGenre, setFavoriteGenre] = useState('');
  const [favoriteEra, setFavoriteEra] = useState('');
  const [customNote, setCustomNote] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [expandedCards, setExpandedCards] = useState<{ [key: string]: boolean }>({});

  // My Profile stats & posts
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [loadingUserPosts, setLoadingUserPosts] = useState(false);
  const [userPostsCount, setUserPostsCount] = useState(0);

  // Edit/delete states for My Profile tab
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Modal States
  const [activeModal, setActiveModal] = useState<'followers' | 'following' | null>(null);
  const [modalUsers, setModalUsers] = useState<{ uid: string; displayName: string }[]>([]);
  const [loadingModal, setLoadingModal] = useState(false);

  // Helper to format member since date
  const formatMemberSince = (createdAt: unknown) => {
    if (!createdAt) return 'May 2026';
    let dateObj = new Date();
    const c = createdAt as { toDate?: () => Date };
    if (c.toDate && typeof c.toDate === 'function') {
      dateObj = c.toDate();
    } else if (createdAt instanceof Date) {
      dateObj = createdAt;
    } else {
      dateObj = new Date(createdAt as string);
    }
    return dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Helper to fetch user names in parallel for modal
  const fetchUserNames = async (uids: string[]) => {
    if (!uids || uids.length === 0) return [];
    try {
      const promises = uids.map(async (id) => {
        const userRef = doc(db, 'users', id);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          return { uid: id, displayName: snap.data().displayName || 'Anonymous Author' };
        }
        return { uid: id, displayName: 'Anonymous Author' };
      });
      return await Promise.all(promises);
    } catch (err) {
      console.error('Error fetching resolved users:', err);
      return uids.map(id => ({ uid: id, displayName: 'Anonymous Author' }));
    }
  };

  // Protected route check
  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth?mode=login');
    }
  }, [user, loading, router]);

  // Sync state with URL parameter changes
  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  // Fetch resolved names when modal opens
  useEffect(() => {
    if (!activeModal || !profileData) {
      setModalUsers([]);
      return;
    }

    const loadModalUsers = async () => {
      setLoadingModal(true);
      const targetUids = activeModal === 'followers' 
        ? (profileData.followers || []) 
        : (profileData.following || []);
      const resolved = await fetchUserNames(targetUids);
      setModalUsers(resolved);
      setLoadingModal(false);
    };

    loadModalUsers();
  }, [activeModal, profileData]);

  // Fetch complete profile from Firestore
  useEffect(() => {
    if (!user) return;

    const fetchProfile = async () => {
      setLoadingData(true);
      try {
        const userRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(userRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setProfileData({
            ...data,
            followers: data.followers || [],
            following: data.following || [],
          });
          setInterestedGenres(data.interestedGenres || []);
          setInterestedEras(data.interestedEras || []);
          setFavoriteGenre(data.preferences?.favoriteGenre || '');
          setFavoriteEra(data.preferences?.favoriteEra || '');
          setCustomNote(data.preferences?.customNote || '');
          setTimeSpent(data.timeSpent || 0);

          if (data.timeSpent > 100) {
            await updateDoc(doc(db, 'users', user.uid), { timeSpent: 0 });
            setTimeSpent(0);
          }
        }
        
        // Fetch total count of chats
        const chatsSnapshot = await getDocs(collection(db, 'users', user.uid, 'chats'));
        setChatCount(chatsSnapshot.size);
      } catch (err) {
        console.error('Error loading profile:', err);
      } finally {
        setLoadingData(false);
      }
    };

    fetchProfile();
  }, [user]);

  // Fetch user's community posts
  const fetchUserPosts = useCallback(async () => {
    if (!user) return;
    setLoadingUserPosts(true);
    try {
      const q = query(
        collection(db, 'communityPosts'),
        where('uid', '==', user.uid),
        where('hidden', '==', false)
      );
      const querySnap = await getDocs(q);
      const fetchedPosts: Post[] = [];
      querySnap.forEach((docSnap) => {
        const postData = docSnap.data();
        if (!postData.flagged) {
          fetchedPosts.push({
            id: docSnap.id,
            uid: postData.uid || '',
            displayName: postData.displayName || '',
            title: postData.title || '',
            content: postData.content || '',
            type: postData.type || 'original',
            likes: postData.likes || [],
            comments: postData.comments || [],
            createdAt: postData.createdAt?.toDate 
              ? postData.createdAt.toDate().toISOString() 
              : (postData.createdAt ? new Date(postData.createdAt).toISOString() : new Date().toISOString())
          });
        }
      });
      fetchedPosts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setUserPosts(fetchedPosts);
      setUserPostsCount(fetchedPosts.length);
    } catch (err) {
      console.error('Error fetching user posts:', err);
    } finally {
      setLoadingUserPosts(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchUserPosts();
    }
  }, [user, fetchUserPosts]);

  // Sync timers
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(async () => {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setTimeSpent(data.timeSpent || 0);
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [user, user?.uid]);

  useEffect(() => {
    if (!user) return;
    const interval = setInterval(async () => {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        timeSpent: increment(1)
      });
    }, 60000);
    return () => clearInterval(interval);
  }, [user, user?.uid]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    router.push(`/profile?tab=${tabId}`);
  };

  const handleRemoveFromWishlist = async (bookId: string) => {
    if (!user || !profileData) return;
    
    try {
      const updatedWishlist = (profileData.wishlist || []).filter(
        (w: WishlistItem) => w.bookId !== bookId
      );
      
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        wishlist: updatedWishlist,
      });

      setProfileData((prev: ProfileData | null) => prev ? {
        ...prev,
        wishlist: updatedWishlist,
      } : null);
    } catch (err) {
      console.error('Error removing from wishlist:', err);
    }
  };

  const handleRemoveFromAnthology = async (itemId: string) => {
    if (!user || !profileData) return;

    try {
      const updatedAnthology = (profileData.anthology || []).filter(
        (a: AnthologyItem) => a.id !== itemId
      );

      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        anthology: updatedAnthology,
      });

      setProfileData((prev: ProfileData | null) => prev ? {
        ...prev,
        anthology: updatedAnthology,
      } : null);
    } catch (err) {
      console.error('Error removing from anthology:', err);
    }
  };

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        interestedGenres,
        interestedEras,
        preferences: {
          favoriteGenre,
          favoriteEra,
          customNote,
        },
      });

      setProfileData((prev: ProfileData | null) => prev ? {
        ...prev,
        interestedGenres,
        interestedEras,
        preferences: {
          favoriteGenre,
          favoriteEra,
          customNote,
        },
      } : null);

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving preferences:', err);
    }
  };

  const handleToggleGenre = (genre: string) => {
    setInterestedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  };

  const handleToggleEra = (era: string) => {
    setInterestedEras((prev) =>
      prev.includes(era) ? prev.filter((e) => e !== era) : [...prev, era]
    );
  };

  const parseSavedAt = (savedAt: AnthologyItem['savedAt'] | undefined): Date => {
    if (!savedAt) return new Date();
    if (savedAt instanceof Date) return savedAt;
    if (typeof savedAt === 'string') return new Date(savedAt);
    if (savedAt && typeof savedAt === 'object' && 'seconds' in savedAt && typeof (savedAt as { seconds: number }).seconds === 'number') {
      return new Date((savedAt as { seconds: number }).seconds * 1000);
    }
    if (savedAt && typeof savedAt === 'object' && 'toDate' in savedAt && typeof (savedAt as { toDate: () => Date }).toDate === 'function') {
      return (savedAt as { toDate: () => Date }).toDate();
    }
    return new Date();
  };

  const formatDateHeader = (d: Date) => {
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTimeSpent = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMins = minutes % 60;
    return `${hours} hour${hours !== 1 ? 's' : ''} and ${remainingMins} minute${remainingMins !== 1 ? 's' : ''}`;
  };

  const toggleCardExpanded = (id: string) => {
    setExpandedCards((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Delete community post handler
  const handleDeletePost = async (postId: string) => {
    if (!user) return;
    if (!confirm('Are you sure you want to permanently delete this work?')) return;
    try {
      const res = await fetch('/api/community', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId,
          uid: user.uid
        }),
      });

      if (!res.ok) throw new Error('Failed to delete post.');

      // Update state list immediately
      setUserPosts((prev) => prev.filter((p) => p.id !== postId));
      setUserPostsCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
      alert('Failed to delete post.');
    }
  };

  // Inline edit saving
  const handleStartEdit = (post: Post) => {
    setEditingPost(post);
    setEditTitle(post.title);
    setEditContent(post.content);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !editingPost || !editTitle.trim() || !editContent.trim()) return;

    setSavingEdit(true);
    try {
      const res = await fetch('/api/community', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'editPost',
          postId: editingPost.id,
          newTitle: editTitle.trim(),
          newContent: editContent.trim(),
        }),
      });

      if (!res.ok) throw new Error('Failed to save edits.');

      // Update locally
      setUserPosts((prev) =>
        prev.map((p) =>
          p.id === editingPost.id
            ? { ...p, title: editTitle.trim(), content: editContent.trim() }
            : p
        )
      );

      setEditingPost(null);
    } catch (err) {
      console.error(err);
      alert('Failed to save edits.');
    } finally {
      setSavingEdit(false);
    }
  };

  // Anthology share card downloader
  const handleAnthologyShareCard = (text: string) => {
    const card = document.createElement('div');
    card.style.position = 'fixed';
    card.style.left = '-9999px';
    card.style.top = '-9999px';
    card.style.width = '600px';
    card.style.padding = '50px';
    card.style.background = '#F8F4E9';
    card.style.color = '#1a1a1a';
    card.style.fontFamily = 'Georgia, serif';
    card.style.border = '1px solid rgba(26, 26, 26, 0.15)';
    card.style.boxShadow = '0 15px 35px rgba(0,0,0,0.05)';

    card.innerHTML = `
      <div style="font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: rgba(26,26,26,0.4); margin-bottom: 35px;">✦ Versecraft Anthology</div>
      <div style="font-size: 20px; line-height: 1.8; font-style: italic; color: #1a1a1a; margin-bottom: 40px; white-space: pre-wrap;">“ ${text} ”</div>
      <div style="border-top: 1px solid rgba(26, 26, 26, 0.08); padding-top: 20px; font-size: 10px; color: rgba(26,26,26,0.4); letter-spacing: 2px;">versecraft.app</div>
    `;

    document.body.appendChild(card);
    html2canvas(card, { backgroundColor: '#F8F4E9' }).then((canvas) => {
      const link = document.createElement('a');
      link.download = `versecraft-verse-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      document.body.removeChild(card);
    });
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-[#F8F4E9] flex items-center justify-center relative z-10">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-t-2 border-[#1a1a1a] border-r-2 animate-spin" />
          <span className="font-playfair text-lg text-[#1a1a1a] font-medium italic">Consulting the archives...</span>
        </div>
      </div>
    );
  }

  const anthologyItems = profileData?.anthology || [];
  const wishlistItems = profileData?.wishlist || [];

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

      {/* Connected-word background overlay */}
      <div className="fixed inset-0 pointer-events-none select-none z-0 overflow-hidden opacity-[0.03] text-[#1a1a1a]">
        <svg
          className="w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 1200 800"
          preserveAspectRatio="xMidYMid slice"
        >
          {/* Paths connecting words */}
          <path d="M 150 150 L 350 250 L 200 450 L 400 600 Z" fill="none" stroke="currentColor" strokeWidth="0.8" />
          <path d="M 1050 120 L 950 320 L 1100 480 L 850 650" fill="none" stroke="currentColor" strokeWidth="0.8" />
          <path d="M 500 50 L 700 150 L 600 350" fill="none" stroke="currentColor" strokeWidth="0.8" />

          {/* Drifting literary words text nodes */}
          <text x="150" y="140" className="font-playfair italic text-xs tracking-widest font-bold fill-current">solitude</text>
          <text x="350" y="240" className="font-playfair italic text-xs tracking-widest font-bold fill-current">memory</text>
          <text x="200" y="440" className="font-playfair italic text-xs tracking-widest font-bold fill-current">wonder</text>
          <text x="400" y="590" className="font-playfair italic text-xs tracking-widest font-bold fill-current">silence</text>

          <text x="1050" y="110" className="font-playfair italic text-xs tracking-widest font-bold fill-current">myth</text>
          <text x="950" y="310" className="font-playfair italic text-xs tracking-widest font-bold fill-current">longing</text>
          <text x="1100" y="470" className="font-playfair italic text-xs tracking-widest font-bold fill-current">devotion</text>
          <text x="850" y="640" className="font-playfair italic text-xs tracking-widest font-bold fill-current">grief</text>

          <text x="500" y="40" className="font-playfair italic text-xs tracking-widest font-bold fill-current">echo</text>
          <text x="700" y="140" className="font-playfair italic text-xs tracking-widest font-bold fill-current">midnight</text>
        </svg>
      </div>

      <div className="relative z-10 w-full min-h-screen pt-28 pb-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-[#1a1a1a]">
        {/* Dashboard Back Link */}
        <div className="mb-4 text-left">
          <Link
            href="/dashboard"
            className="text-xs text-[#1a1a1a]/60 hover:text-[#1a1a1a] hover:underline transition-all inline-flex items-center gap-1 font-inter font-medium"
          >
            ← Dashboard
          </Link>
        </div>

        {/* Header Profile Info card */}
        <div className="border-b border-[#1a1a1a]/10 pb-8 mb-8 flex flex-col sm:flex-row items-center justify-between gap-6 bg-transparent">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="w-16 h-16 rounded-full border border-[#1a1a1a]/10 bg-transparent flex items-center justify-center text-[#1a1a1a] font-playfair font-bold text-2xl tracking-widest">
              {profileData?.displayName?.charAt(0).toUpperCase() || 'R'}
            </div>
            <div>
              <h1 className="font-playfair text-2xl sm:text-3xl font-bold text-[#1a1a1a] tracking-tight">
                {profileData?.displayName || 'Reader Sanctuary'}
              </h1>
              <p className="font-inter text-xs text-[#1a1a1a]/60 mt-0.5">{profileData?.email}</p>
              <p className="font-playfair italic text-xs text-[#1a1a1a]/60 mt-2 tracking-wide font-light">
                “{profileData?.preferences?.customNote ? (profileData.preferences.customNote.length > 60 ? `${profileData.preferences.customNote.slice(0, 60)}...` : profileData.preferences.customNote) : 'Drawn toward silence, memory, and stories.'}”
              </p>
            </div>
          </div>

          {/* Live Explorer summary details */}
          <div className="flex gap-4 sm:gap-8 justify-around w-full sm:w-auto border-t sm:border-t-0 border-[#1a1a1a]/5 pt-4 sm:pt-0 text-center">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#1a1a1a]/50 font-inter block">Preserved Verses</span>
              <span className="font-playfair text-xl sm:text-2xl text-[#1a1a1a] block mt-0.5">{anthologyItems.length}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#1a1a1a]/50 font-inter block">Cataloged Volumes</span>
              <span className="font-playfair text-xl sm:text-2xl text-[#1a1a1a] block mt-0.5">{wishlistItems.length}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#1a1a1a]/50 font-inter block">Hours in Silence</span>
              <span className="font-playfair text-sm text-[#1a1a1a] block mt-1.5 uppercase font-bold tracking-wider">
                {timeSpent < 60 ? `${timeSpent}m` : `${Math.floor(timeSpent / 60)}h ${timeSpent % 60}m`}
              </span>
            </div>
          </div>
        </div>

        {/* Currently Reading Strip */}
        <div className="border-y border-[#1a1a1a]/10 py-4 mb-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-inter bg-transparent">
          <div className="flex items-center gap-3">
            <span className="text-[9px] uppercase font-bold tracking-[0.2em] text-[#1a1a1a]/50 border border-[#1a1a1a]/10 px-2.5 py-0.5 rounded-md">CURRENTLY READING</span>
            <span className="font-playfair font-bold text-sm text-[#1a1a1a]">Frankenstein</span>
            <span className="text-[#1a1a1a]/40 select-none">✦</span>
            <span className="text-[#1a1a1a]/70 italic">Mary Shelley</span>
            <span className="text-[#1a1a1a]/30">•</span>
            <span className="text-[#1a1a1a]/60 font-medium">28% explored</span>
          </div>
          <div className="flex items-center gap-4 w-full sm:w-48">
            <div className="flex-grow h-1 bg-[#1a1a1a]/10 rounded-full overflow-hidden">
              <div className="w-[28%] h-full bg-[#1a1a1a]" />
            </div>
            <Link
              href="https://books.google.com/books?id=39tBDwAAQBAJ"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] font-bold uppercase tracking-wider text-[#1a1a1a] hover:underline flex-shrink-0"
            >
              Continue Reading →
            </Link>
          </div>
        </div>

        {/* Tabs Toolbar */}
        <div className="flex border-b border-[#1a1a1a]/10 gap-6 mb-8 overflow-x-auto no-scrollbar pb-1">
          {[
            { id: 'my-profile', name: '👤 My Profile' },
            { id: 'anthology', name: '📜 Personal Anthology' },
            { id: 'timeline', name: '📅 Timeline' },
            { id: 'wishlist', name: '❤️ Wishlist' },
            { id: 'preferences', name: '⚙️ Preferences' },
            { id: 'timeSpent', name: '⏳ Exploration Timer' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`pb-3 text-xs uppercase font-bold tracking-wider font-inter border-b-2 transition-all flex-shrink-0 ${
                activeTab === tab.id
                  ? 'border-[#1a1a1a] text-[#1a1a1a] font-bold'
                  : 'border-transparent text-[#1a1a1a]/50 hover:text-[#1a1a1a]'
              }`}
            >
              {tab.name}
            </button>
          ))}
        </div>

        {/* Dynamic Tab content boxes */}
        <AnimatePresence mode="wait">
          {/* 0. MY PROFILE TAB */}
          {activeTab === 'my-profile' && (
            <motion.div
              key="my-profile"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-12"
            >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column: Literary Identity */}
              <div className="lg:col-span-2 py-4 space-y-8 relative bg-transparent">
                <div>
                  <span className="text-[9px] uppercase font-bold tracking-[0.25em] text-[#1a1a1a]/40 block mb-2 font-inter">THE PORTRAIT</span>
                  <h2 className="font-playfair text-3xl font-bold text-[#1a1a1a] tracking-tight">Literary Identity</h2>
                  <p className="font-playfair italic text-xs text-[#1a1a1a]/50 mt-1">“A portrait shaped by books.”</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 text-xs font-inter">
                  <div className="space-y-1">
                    <span className="text-[10px] text-[#1a1a1a]/40 font-bold uppercase tracking-wider block">Member Since</span>
                    <span className="font-playfair text-sm font-semibold text-[#1a1a1a]">{formatMemberSince(profileData?.createdAt)}</span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] text-[#1a1a1a]/40 font-bold uppercase tracking-wider block">Preferred Language</span>
                    <span className="font-playfair text-sm font-semibold text-[#1a1a1a]">English (Global)</span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] text-[#1a1a1a]/40 font-bold uppercase tracking-wider block">Favorite Genres</span>
                    <span className="font-playfair text-sm font-semibold text-[#1a1a1a]">
                      {profileData?.interestedGenres && profileData.interestedGenres.length > 0 
                        ? profileData.interestedGenres.map(g => g.charAt(0).toUpperCase() + g.slice(1)).join(', ') 
                        : 'Classics, Poetry'}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] text-[#1a1a1a]/40 font-bold uppercase tracking-wider block">Explored Movement</span>
                    <span className="font-playfair text-sm font-semibold text-[#1a1a1a] capitalize">
                      {profileData?.preferences?.favoriteEra || 'Modernist'}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] text-[#1a1a1a]/40 font-bold uppercase tracking-wider block">Hours Counted</span>
                    <span className="font-playfair text-sm font-semibold text-[#1a1a1a]">{timeSpent} mins</span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] text-[#1a1a1a]/40 font-bold uppercase tracking-wider block">Preserved Verses</span>
                    <span className="font-playfair text-sm font-semibold text-[#1a1a1a]">{anthologyItems.length} fragments</span>
                  </div>
                </div>

                <div className="pt-6 border-t border-[#1a1a1a]/8">
                  <span className="text-[9px] uppercase font-bold tracking-wider text-[#1a1a1a]/40 block mb-2 font-inter">LITERARY FOCUS & PROFILE</span>
                  <p className="font-playfair italic text-sm text-[#1a1a1a]/80 leading-relaxed">
                    {profileData?.preferences?.customNote 
                       ? `“${profileData.preferences.customNote}”` 
                       : '“Drawn toward gothic introspection, realism, lyrical melancholy, and philosophical fiction.”'}
                  </p>
                </div>
              </div>

              {/* Right Column: Stats & Reading Fingerprint */}
              <div className="space-y-6 flex flex-col justify-between">
                {/* Stats clickable panel */}
                <div className="py-4 space-y-4 bg-transparent">
                  <span className="text-[9px] uppercase font-bold tracking-[0.25em] text-[#1a1a1a]/40 block font-inter">THE NETWORK</span>
                  
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <button
                      onClick={() => document.getElementById('my-posts-section')?.scrollIntoView({ behavior: 'smooth' })}
                      className="p-3 border border-[#1a1a1a]/10 hover:border-[#1a1a1a]/30 bg-transparent rounded-xl transition-all"
                    >
                      <span className="text-[9px] uppercase font-bold tracking-wider text-[#1a1a1a]/50 block font-inter">Essays / Verses</span>
                      <span className="font-playfair text-lg font-bold text-[#1a1a1a] block mt-1">{userPostsCount}</span>
                    </button>

                    <button
                      onClick={() => setActiveModal('followers')}
                      className="p-3 border border-[#1a1a1a]/10 hover:border-[#1a1a1a]/30 bg-transparent rounded-xl transition-all"
                    >
                      <span className="text-[9px] uppercase font-bold tracking-wider text-[#1a1a1a]/50 block font-inter">Circle</span>
                      <span className="font-playfair text-lg font-bold text-[#1a1a1a] block mt-1">{profileData?.followers?.length || 0}</span>
                    </button>

                    <button
                      onClick={() => setActiveModal('following')}
                      className="p-3 border border-[#1a1a1a]/10 hover:border-[#1a1a1a]/30 bg-transparent rounded-xl transition-all"
                    >
                      <span className="text-[9px] uppercase font-bold tracking-wider text-[#1a1a1a]/50 block font-inter">Companions</span>
                      <span className="font-playfair text-lg font-bold text-[#1a1a1a] block mt-1">{profileData?.following?.length || 0}</span>
                    </button>
                  </div>
                </div>

                {/* Reading Fingerprint Section */}
                <div className="py-4 space-y-4 flex-grow bg-transparent">
                  <div>
                    <span className="text-[9px] uppercase font-bold tracking-[0.25em] text-[#1a1a1a]/40 block font-inter">THE TENDENCIES</span>
                    <h3 className="font-playfair text-lg font-bold text-[#1a1a1a]">Reading Fingerprint</h3>
                    <p className="font-playfair italic text-[10px] text-[#1a1a1a]/50">“The tendencies of your literary self.”</p>
                  </div>

                  <div className="space-y-3 pt-2 text-xs font-inter">
                    <div className="space-y-1">
                      <div className="flex justify-between font-medium text-[#1a1a1a]/80">
                        <span>Gothic Introspection</span>
                        <span>33%</span>
                      </div>
                      <div className="h-1 bg-[#1a1a1a]/5 rounded-full overflow-hidden">
                        <div className="w-[33%] h-full bg-[#1a1a1a]" />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between font-medium text-[#1a1a1a]/80">
                        <span>Realism & Prose</span>
                        <span>28%</span>
                      </div>
                      <div className="h-1 bg-[#1a1a1a]/5 rounded-full overflow-hidden">
                        <div className="w-[28%] h-full bg-[#1a1a1a]" />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between font-medium text-[#1a1a1a]/80">
                        <span>Lyrical Poetry</span>
                        <span>21%</span>
                      </div>
                      <div className="h-1 bg-[#1a1a1a]/5 rounded-full overflow-hidden">
                        <div className="w-[21%] h-full bg-[#1a1a1a]" />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between font-medium text-[#1a1a1a]/80">
                        <span>Philosophy & Theory</span>
                        <span>18%</span>
                      </div>
                      <div className="h-1 bg-[#1a1a1a]/5 rounded-full overflow-hidden">
                        <div className="w-[18%] h-full bg-[#1a1a1a]" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Personal Works / Posts section */}
            <div id="my-posts-section" className="space-y-6">
              <div className="pb-2 border-b border-[#1a1a1a]/10">
                <h3 className="font-playfair text-2xl font-bold text-[#1a1a1a]">
                  🖋️ Your Literary Posts
                </h3>
                <p className="font-playfair italic text-xs text-[#1a1a1a]/60 mt-1 font-light">“Thoughts left in the margins of books.”</p>
              </div>

              {loadingUserPosts ? (
                <div className="py-12 flex justify-center">
                  <div className="w-8 h-8 border-2 border-[#1a1a1a] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : userPosts.length === 0 ? (
                <div className="py-16 text-center">
                  <p className="font-playfair text-lg text-[#1a1a1a]/40 italic">
                    No works shared yet.
                  </p>
                </div>
              ) : (
                <div className="columns-1 md:columns-2 gap-6 space-y-6 [column-fill:_balance] w-full">
                  {userPosts.map((post) => (
                    <div
                      key={post.id}
                      className="border-b border-[#1a1a1a]/10 pb-6 mb-6 space-y-4 hover:border-[#1a1a1a]/30 transition-all inline-block w-full break-inside-avoid bg-transparent"
                    >
                      <div className="flex justify-between items-center w-full">
                        <span className="text-[9px] text-[#1a1a1a]/40 font-inter font-bold uppercase">
                          Posted {new Date(post.createdAt).toLocaleDateString()}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider font-inter bg-[#1a1a1a]/5 text-[#1a1a1a]">
                          {post.type}
                        </span>
                      </div>

                      <h3 className="font-playfair text-lg font-bold text-[#1a1a1a] leading-snug">
                        {post.title}
                      </h3>

                      <p className="font-inter text-xs sm:text-sm text-[#1a1a1a]/85 leading-relaxed text-justify whitespace-pre-wrap">
                        {post.content}
                      </p>

                      <div className="flex justify-between items-center pt-3 border-t border-[#1a1a1a]/5 w-full text-xs text-[#1a1a1a]/60">
                        <span>❤️ {post.likes?.length || 0} Likes • 💬 {post.comments?.length || 0} Comments</span>
                        
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleStartEdit(post)}
                            className="px-3 py-1 bg-[#1a1a1a] hover:bg-[#2d2d2d] text-white font-bold rounded-lg text-[10px] uppercase font-inter transition-all"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeletePost(post.id)}
                            className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg text-[10px] uppercase font-inter transition-all"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* 1. PERSONAL ANTHOLOGY */}
        {activeTab === 'anthology' && (
          <motion.div
            key="anthology"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            <div className="pb-2 border-b border-[#1a1a1a]/10 mb-6">
              <h3 className="font-playfair text-2xl font-bold text-[#1a1a1a]">
                📜 Personal Anthology
              </h3>
              <p className="font-playfair italic text-xs text-[#1a1a1a]/60 mt-1 font-light">“Fragments worth preserving.”</p>
            </div>

            {anthologyItems.length === 0 ? (
              <div className="py-12 text-center max-w-lg mx-auto bg-transparent">
                <span className="text-3xl block mb-2">📜</span>
                <p className="font-playfair text-lg text-[#1a1a1a]/70 italic">Your anthology stands completely blank.</p>
                <p className="text-xs text-[#1a1a1a]/40 mt-1 font-inter">
                  Consult the companion simple or advanced chats, and trigger the &quot;Save to Anthology&quot; prompt to write your path.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {anthologyItems.map((item: AnthologyItem) => (
                  <div
                    key={item.id}
                    className="border-b border-[#1a1a1a]/10 pb-6 mb-6 relative flex flex-col justify-between group transition-all bg-transparent"
                  >
                    <div>
                      {/* Meta header */}
                      <div className="flex justify-between items-center mb-3 pb-2 border-b border-[#1a1a1a]/10 text-[9px] font-bold uppercase tracking-wider text-[#1a1a1a]/60">
                        <span>Mode: {item.mode} {item.genre && `• ${item.genre}/${item.era}`}</span>
                        <button
                          onClick={() => handleRemoveFromAnthology(item.id)}
                          className="text-red-600 hover:text-red-500 font-bold uppercase transition-colors"
                        >
                          Delete
                        </button>
                      </div>

                      {/* Prompt */}
                      <div className="text-[10px] text-[#1a1a1a]/50 font-inter mb-2">
                        <strong className="text-[#1a1a1a]/70 uppercase tracking-widest block text-[8px] font-bold">Invocation:</strong>
                        {item.prompt}
                      </div>

                      {/* Response */}
                      <div className="pl-4 border-l-2 border-[#1a1a1a]/20 mt-3 py-1 font-serif">
                        <p className="font-playfair italic text-xs leading-relaxed text-[#1a1a1a] font-light">
                          “ {item.response} ”
                        </p>
                      </div>
                    </div>

                    {/* Exporter triggers */}
                    <div className="mt-6 pt-3 border-t border-[#1a1a1a]/5 flex justify-end">
                      <button
                        onClick={() => handleAnthologyShareCard(item.response)}
                        className="text-[10px] uppercase font-bold tracking-wider font-inter text-[#1a1a1a]/60 hover:text-[#1a1a1a] transition-colors flex items-center gap-1"
                      >
                        🎨 Download Share Card
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* 2. WISHLIST */}
        {activeTab === 'wishlist' && (
          <motion.div
            key="wishlist"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            <div className="pb-2 border-b border-[#1a1a1a]/10 mb-6">
              <h3 className="font-playfair text-2xl font-bold text-[#1a1a1a]">
                ❤️ Wishlist
              </h3>
              <p className="font-playfair italic text-xs text-[#1a1a1a]/60 mt-1 font-light">“Volumes waiting on the horizon.”</p>
            </div>

            {wishlistItems.length === 0 ? (
              <div className="bg-[#FAF7F0] border border-[#1a1a1a]/10 rounded-xl p-12 text-center max-w-lg mx-auto">
                <span className="text-3xl block mb-2">❤️</span>
                <p className="font-playfair text-lg text-[#1a1a1a]/70 italic">Your wishlist catalog is empty.</p>
                <p className="text-xs text-[#1a1a1a]/40 mt-1 font-inter">
                  Explore volumes inside the Grand Library or the Recommendations Alcove to catalog desired editions.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {wishlistItems.map((book: WishlistItem) => (
                  <div
                    key={book.bookId}
                    className="bg-[#FAF7F0] border border-[#1a1a1a]/10 hover:border-[#1a1a1a]/20 rounded-xl overflow-hidden shadow-xs flex flex-col group relative transition-all"
                  >
                    {/* Cover */}
                    <div className="relative aspect-[3/4] bg-[#1a1a1a]/5">
                      <img
                        src={book.thumbnail || 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&w=400&q=80'}
                        alt={book.title}
                        className="w-full h-full object-cover"
                      />
                      {/* Delete cross absolute */}
                      <button
                        onClick={() => handleRemoveFromWishlist(book.bookId)}
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-white/95 border border-[#1a1a1a]/10 text-red-600 hover:text-red-500 transition-colors shadow-xs"
                        title="Remove Volume"
                      >
                        ✕
                      </button>
                    </div>

                    {/* Meta details */}
                    <div className="p-4 flex-grow flex flex-col justify-between">
                      <div>
                        <h4 className="font-playfair font-bold text-[#1a1a1a] text-xs line-clamp-2 leading-snug">
                          {book.title}
                        </h4>
                        <p className="font-inter text-[10px] text-[#1a1a1a]/50 mt-1 line-clamp-1">
                          by {book.authors.join(', ')}
                        </p>
                      </div>

                      {/* Buy link */}
                      <div className="mt-4 pt-2 border-t border-[#1a1a1a]/5">
                        <a
                          href={book.infoLink || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="py-1.5 bg-[#1a1a1a] hover:bg-[#2d2d2d] text-white text-[10px] font-bold uppercase tracking-wider rounded-lg block text-center font-inter transition-all"
                        >
                          Acquire
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* 3. PREFERENCES */}
        {activeTab === 'preferences' && (
          <motion.div
            key="preferences"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="max-w-3xl mx-auto"
          >
            <form onSubmit={handleSavePreferences} className="py-4 space-y-6 bg-transparent">
              <div className="pb-2 border-b border-[#1a1a1a]/10 mb-4">
                <h3 className="font-playfair text-2xl font-bold text-[#1a1a1a]">
                  ⚙️ Preferences
                </h3>
                <p className="font-playfair italic text-xs text-[#1a1a1a]/60 mt-1 font-light">“The shape of your literary world.”</p>
              </div>

              {/* Genre selections */}
              <div>
                <label className="block text-xs uppercase tracking-wider text-[#1a1a1a]/60 font-bold mb-2.5 font-inter">Interested Genres</label>
                <div className="flex flex-wrap gap-2">
                  {genresList.map((genre) => {
                    const active = interestedGenres.includes(genre.toLowerCase());
                    return (
                      <button
                        key={genre}
                        type="button"
                        onClick={() => handleToggleGenre(genre.toLowerCase())}
                        className={`px-3 py-1.5 border rounded-full text-xs font-semibold font-inter transition-all ${
                          active
                            ? 'bg-[#1a1a1a] border-transparent text-white shadow-sm'
                            : 'bg-transparent border-[rgba(26,26,26,0.1)] text-[#1a1a1a]/70 hover:border-[#1a1a1a]'
                        }`}
                      >
                        {genre}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Era selections */}
              <div>
                <label className="block text-xs uppercase tracking-wider text-[#1a1a1a]/60 font-bold mb-2.5 font-inter">Interested Eras</label>
                <div className="flex flex-wrap gap-2">
                  {erasList.map((era) => {
                    const active = interestedEras.includes(era.toLowerCase());
                    return (
                      <button
                        key={era}
                        type="button"
                        onClick={() => handleToggleEra(era.toLowerCase())}
                        className={`px-3 py-1.5 border rounded-full text-xs font-semibold font-inter transition-all ${
                          active
                            ? 'bg-[#1a1a1a] border-transparent text-white shadow-sm'
                            : 'bg-transparent border-[rgba(26,26,26,0.1)] text-[#1a1a1a]/70 hover:border-[#1a1a1a]'
                        }`}
                      >
                        {era}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom teaser values */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#1a1a1a]/60 font-bold mb-2 font-inter">Primary Focus Genre</label>
                  <select
                    value={favoriteGenre}
                    onChange={(e) => setFavoriteGenre(e.target.value)}
                    className="w-full px-2 py-2 rounded-none outline-none border-b border-[#1a1a1a]/20 bg-transparent text-xs font-semibold text-[#1a1a1a] focus:border-[#1a1a1a] transition-all cursor-pointer"
                  >
                    <option value="" className="bg-[#FAF7F0] text-[#1a1a1a]">Select Primary Genre</option>
                    {genresList.map((g) => (
                      <option key={g} value={g.toLowerCase()} className="bg-[#FAF7F0] text-[#1a1a1a]">{g}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#1a1a1a]/60 font-bold mb-2 font-inter">Primary Focus Era</label>
                  <select
                    value={favoriteEra}
                    onChange={(e) => setFavoriteEra(e.target.value)}
                    className="w-full px-2 py-2 rounded-none outline-none border-b border-[#1a1a1a]/20 bg-transparent text-xs font-semibold text-[#1a1a1a] focus:border-[#1a1a1a] transition-all cursor-pointer"
                  >
                    <option value="" className="bg-[#FAF7F0] text-[#1a1a1a]">Select Primary Era</option>
                    {erasList.map((e) => (
                      <option key={e} value={e.toLowerCase()} className="bg-[#FAF7F0] text-[#1a1a1a]">{e}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Custom writer vibe */}
              <div>
                <label className="block text-xs uppercase tracking-wider text-[#1a1a1a]/60 font-bold mb-2 font-inter">Vibe Notes / Writers of Interest</label>
                <textarea
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  placeholder="e.g. I am seeking dense gothic metaphors combined with Urdu romantic poetry cadences. I love the style of Sylvia Plath and John Keats."
                  rows={3}
                  className="w-full px-2 py-3 rounded-none outline-none border-b border-[#1a1a1a]/20 bg-transparent text-xs text-[#1a1a1a] placeholder-[#1a1a1a]/30 resize-none leading-relaxed focus:border-[#1a1a1a] transition-all font-serif"
                />
              </div>

              {/* Action save */}
              <div className="flex items-center gap-4 pt-4 border-t border-[#1a1a1a]/10">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#1a1a1a] hover:bg-[#2d2d2d] text-white font-bold uppercase tracking-wider rounded-xl text-xs font-inter transition-all shadow-xs"
                >
                  Save Attunements
                </button>
                {saveSuccess && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-xs text-[#1a1a1a] font-bold tracking-wide animate-pulse"
                  >
                    ✨ Frequencies aligned!
                  </motion.span>
                )}
              </div>
            </form>
          </motion.div>
        )}

        {/* 4. EXPLORATION TIMER REGISTRY */}
        {activeTab === 'timeSpent' && (
          <motion.div
            key="timeSpent"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="max-w-2xl mx-auto space-y-6"
          >
            <div className="pb-2 border-b border-[#1a1a1a]/10 mb-6">
              <h3 className="font-playfair text-2xl font-bold text-[#1a1a1a]">
                ⏳ Exploration Timer
              </h3>
              <p className="font-playfair italic text-xs text-[#1a1a1a]/60 mt-1 font-light">“Hours counted in silent worlds.”</p>
            </div>

            <div className="py-4 text-center relative space-y-6 bg-transparent">
              <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-[#1a1a1a]/60 block font-inter">THE CELESTIAL CLOCK</span>
              
              <div className="relative w-44 h-44 rounded-full border border-[#1a1a1a]/10 mx-auto flex items-center justify-center bg-transparent">
                {/* Clock hands animations mock */}
                <div className="absolute inset-2.5 rounded-full border border-dashed border-[#1a1a1a]/10" />
                <div className="absolute w-0.5 h-14 bg-[#1a1a1a] origin-bottom -mt-14 animate-spin [animation-duration:120s]" />
                <div className="absolute w-0.5 h-10 bg-[#1a1a1a]/50 origin-bottom -mt-10 animate-spin [animation-duration:720s]" />
                
                {/* Text center */}
                <div className="relative z-10 text-center">
                  <span className="font-playfair text-3xl font-bold text-[#1a1a1a] block">
                    {timeSpent}
                  </span>
                  <span className="text-[9px] uppercase tracking-wider text-[#1a1a1a]/40 block font-bold mt-0.5">minutes</span>
                </div>
              </div>

              <div>
                <h3 className="font-playfair text-xl font-bold text-[#1a1a1a]">Living Library Registry</h3>
                <p className="font-inter text-xs text-[#1a1a1a]/60 mt-2 max-w-md mx-auto leading-relaxed font-light">
                  Every second spent reading, dueling, and exploring inside the sanctuary is logged in our real-time visibility-aware database. You have dedicated:
                </p>
                <p className="font-playfair text-[#1a1a1a] text-lg italic mt-3 font-semibold">
                  {formatTimeSpent(timeSpent * 60)}
                </p>
              </div>

              {/* Synthesized stats */}
              <div className="grid grid-cols-3 gap-4 border-t border-[#1a1a1a]/10 pt-6 text-center font-inter text-xs">
                <div>
                  <span className="text-[#1a1a1a] font-bold block">{wishlistItems.length}</span>
                  <span className="text-[9px] text-[#1a1a1a]/40 font-bold block uppercase tracking-wider mt-0.5">Books Cataloged</span>
                </div>
                <div>
                  <span className="text-[#1a1a1a] font-bold block">{anthologyItems.length}</span>
                  <span className="text-[9px] text-[#1a1a1a]/40 font-bold block uppercase tracking-wider mt-0.5">verses forged</span>
                </div>
                <div>
                  <span className="text-[#1a1a1a] font-bold block">{chatCount}</span>
                  <span className="text-[9px] text-[#1a1a1a]/40 font-bold block uppercase tracking-wider mt-0.5">Alchemical Fusions</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* 5. TIMELINE */}
        {activeTab === 'timeline' && (
          <motion.div
            key="timeline"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="max-w-3xl mx-auto space-y-6"
          >
            <div className="pb-2 border-b border-[#1a1a1a]/10 mb-6">
              <h3 className="font-playfair text-2xl font-bold text-[#1a1a1a]">
                📅 Timeline
              </h3>
              <p className="font-playfair italic text-xs text-[#1a1a1a]/60 mt-1 font-light">“A memory of reading and reflection.”</p>
            </div>

            {anthologyItems.length === 0 ? (
              <div className="py-12 text-center max-w-lg mx-auto bg-transparent">
                <span className="text-3xl block mb-2">⏳</span>
                <p className="font-playfair text-lg text-[#1a1a1a]/70 italic">Your timeline awaits its first verse.</p>
                <div className="mt-6">
                  <Link
                    href="/chat/simple"
                    className="px-6 py-2.5 bg-[#1a1a1a] hover:bg-[#2d2d2d] text-white font-bold uppercase tracking-wider rounded-xl text-xs font-inter transition-all inline-block"
                  >
                    Forge a Verse
                  </Link>
                </div>
              </div>
            ) : (
              <div className="relative pl-8 ml-3 space-y-8">
                {/* Animated vertical axis line */}
                <motion.div
                  className="absolute left-[6px] top-2 bottom-2 w-[2px] bg-[#1a1a1a]/15 origin-top"
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                />
                {(() => {
                  const sortedItems = [...anthologyItems].sort((a, b) => {
                    const dateA = parseSavedAt(a.savedAt).getTime();
                    const dateB = parseSavedAt(b.savedAt).getTime();
                    return dateB - dateA;
                  });

                  const groups: { [key: string]: AnthologyItem[] } = {};
                  sortedItems.forEach((item) => {
                    const date = parseSavedAt(item.savedAt);
                    const dateStr = formatDateHeader(date);
                    if (!groups[dateStr]) {
                      groups[dateStr] = [];
                    }
                    groups[dateStr].push(item);
                  });

                  let globalIdx = 0;

                  return Object.entries(groups).map(([dateStr, items]) => (
                    <div key={dateStr} className="space-y-6">
                       {/* Date Header */}
                      <div className="text-xs font-bold uppercase tracking-[0.2em] text-[#1a1a1a]/60 font-inter mb-4">
                        {dateStr}
                      </div>

                      {/* Grouped items */}
                      <div className="space-y-6">
                        {items.map((item) => {
                          const date = parseSavedAt(item.savedAt);
                          const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                          const isExpanded = !!expandedCards[item.id];
                          const isLong = item.response.length > 120;
                          const previewText = isLong ? item.response.slice(0, 120) : item.response;
                          const currentIdx = globalIdx++;

                          return (
                            <div key={item.id} className="relative">
                              {/* Animated timeline dot */}
                              <motion.div
                                className="absolute rounded-full bg-[#1a1a1a]"
                                style={{
                                  width: '8px',
                                  height: '8px',
                                  left: '-37px',
                                  top: '29px',
                                }}
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: currentIdx * 0.08 + 0.15, type: 'spring', stiffness: 300 }}
                              />
                              <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                whileHover={{ x: 6 }}
                                transition={{ 
                                  opacity: { duration: 0.4, delay: currentIdx * 0.08 },
                                  x: { duration: 0.4, delay: currentIdx * 0.08 }
                                }}
                                className="relative flex flex-col justify-between group transition-all pb-6 mb-6 border-b border-[#1a1a1a]/10 bg-transparent"
                              >
                                <div>
                                  {/* Card Header */}
                                  <div className="flex justify-between items-center mb-3 pb-2 border-b border-[#1a1a1a]/5">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#1a1a1a] bg-[#1a1a1a]/5 px-2 py-0.5 rounded-full">
                                      {item.mode}
                                    </span>
                                    <span className="text-[10px] text-[#1a1a1a]/40 font-inter">
                                      {timeStr}
                                    </span>
                                  </div>

                                  {/* Invocation */}
                                  <div className="text-[12px] italic text-[#1a1a1a]/70 mb-3">
                                    <strong className="text-[#1a1a1a]/50 uppercase tracking-widest text-[8px] font-bold block mb-1">
                                      Invocation:
                                    </strong>
                                    “{item.prompt.length > 60 ? `${item.prompt.slice(0, 60)}...` : item.prompt}”
                                  </div>

                                  {/* Response Content Preview / Expanded */}
                                  <div className="pl-4 border-l-2 border-[#1a1a1a]/20 mt-3 py-1 font-serif">
                                    <p className="font-playfair italic text-[13px] leading-relaxed text-[#1a1a1a] font-light">
                                      “ {isExpanded ? item.response : previewText}{!isExpanded && isLong && '...'} ”
                                    </p>
                                    {isLong && (
                                      <button
                                        onClick={() => toggleCardExpanded(item.id)}
                                        className="text-[10px] text-[#1a1a1a] uppercase tracking-wider font-bold mt-2 hover:underline transition-colors block"
                                      >
                                        {isExpanded ? 'Show Less' : 'Read More'}
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* Footer actions */}
                                <div className="mt-6 pt-3 border-t border-[#1a1a1a]/5 flex justify-between items-center">
                                  <button
                                    onClick={() => handleAnthologyShareCard(item.response)}
                                    className="text-[10px] uppercase font-bold tracking-wider font-inter text-[#1a1a1a]/60 hover:text-[#1a1a1a] transition-colors flex items-center gap-1"
                                  >
                                    🎨 Download Card
                                  </button>
                                  <button
                                    onClick={() => handleRemoveFromAnthology(item.id)}
                                    className="text-[10px] uppercase font-bold tracking-wider font-inter text-red-600 hover:text-red-500 transition-colors"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </motion.div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Followers / Following resolved names Modal */}
      <AnimatePresence>
        {activeModal && (
          <div className="fixed inset-0 bg-[#1a1a1a]/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-[rgba(26,26,26,0.1)] rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative"
            >
              <button
                onClick={() => setActiveModal(null)}
                className="absolute top-4 right-4 text-[#1a1a1a]/40 hover:text-[#1a1a1a] text-lg font-bold transition-colors"
              >
                ✕
              </button>

              <h3 className="font-playfair text-xl font-bold text-[#1a1a1a] mb-6 capitalize border-b border-[rgba(26,26,26,0.06)] pb-3">
                {activeModal}
              </h3>

              {loadingModal ? (
                <div className="py-12 flex justify-center">
                  <div className="w-8 h-8 border-2 border-[#1a1a1a] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : modalUsers.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="font-playfair text-sm text-[#1a1a1a]/40 italic">
                    No authors to display.
                  </p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 no-scrollbar">
                  {modalUsers.map((item) => (
                    <div
                      key={item.uid}
                      className="flex items-center gap-3 p-2 bg-[#F8F4E9]/50 hover:bg-[#F8F4E9] rounded-xl border border-[rgba(26,26,26,0.04)] transition-all"
                    >
                      <div className="w-8 h-8 rounded-full bg-[#1a1a1a]/5 flex items-center justify-center text-[#1a1a1a] font-bold text-xs uppercase font-playfair border border-[rgba(26,26,26,0.1)]">
                        {item.displayName.charAt(0)}
                      </div>
                      <Link
                        href={`/profile/${item.uid}`}
                        onClick={() => setActiveModal(null)}
                        className="font-playfair font-bold text-[#1a1a1a] hover:underline text-sm transition-all"
                      >
                        {item.displayName}
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Inline Post Editing Modal */}
      <AnimatePresence>
        {editingPost && (
          <div className="fixed inset-0 bg-[#1a1a1a]/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-[rgba(26,26,26,0.1)] rounded-2xl p-6 sm:p-8 max-w-xl w-full shadow-2xl relative"
            >
              <button
                onClick={() => setEditingPost(null)}
                className="absolute top-4 right-4 text-[#1a1a1a]/40 hover:text-[#1a1a1a] text-lg font-bold transition-colors"
              >
                ✕
              </button>

              <h3 className="font-playfair text-xl font-bold text-[#1a1a1a] mb-6 border-b border-[rgba(26,26,26,0.06)] pb-3">
                🖋️ Edit Your Literary Work
              </h3>

              <form onSubmit={handleSaveEdit} className="space-y-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#1a1a1a]/60 font-bold mb-1 font-inter">Title</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-[rgba(26,26,26,0.1)] bg-[#F8F4E9] text-xs font-semibold text-[#1a1a1a] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#1a1a1a]/60 font-bold mb-1 font-inter">Content</label>
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    required
                    rows={8}
                    className="w-full px-4 py-3 rounded-xl border border-[rgba(26,26,26,0.1)] bg-[#F8F4E9] text-xs text-[#1a1a1a] outline-none resize-none leading-relaxed"
                  />
                </div>

                <div className="flex gap-3 pt-3 border-t border-[rgba(26,26,26,0.06)]">
                  <button
                    type="button"
                    onClick={() => setEditingPost(null)}
                    className="flex-1 py-2.5 border border-[rgba(26,26,26,0.1)] rounded-xl text-xs uppercase font-bold tracking-wider font-inter text-[#1a1a1a] hover:bg-[#F8F4E9] transition-all text-center"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingEdit}
                    className="flex-1 py-2.5 bg-[#1a1a1a] hover:bg-[#2d2d2d] text-white text-xs font-bold uppercase tracking-wider rounded-xl font-inter transition-all text-center shadow-sm disabled:opacity-50"
                  >
                    {savingEdit ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
    </>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F8F4E9] flex items-center justify-center relative z-10">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-t-2 border-[#1a1a1a] border-r-2 animate-spin" />
          <span className="font-playfair text-lg text-[#1a1a1a] font-medium italic">Consulting the archives...</span>
        </div>
      </div>
    }>
      <ProfilePageContent />
    </Suspense>
  );
}

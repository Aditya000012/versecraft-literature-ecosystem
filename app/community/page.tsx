'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import NextLink from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import html2canvas from 'html2canvas';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

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
  reports: string[];
  comments: Comment[];
  flagged: boolean;
  hidden: boolean;
}

export default function CommunityPage() {
  const { user, loading: authLoading } = useAuth();
  
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [postTitle, setPostTitle] = useState('');
  const [postType, setPostType] = useState('original');
  const [postContent, setPostContent] = useState('');
  const [submittingPost, setSubmittingPost] = useState(false);
  
  // Expand states
  const [expandedPosts, setExpandedPosts] = useState<Record<string, boolean>>({});
  const [showComments, setShowComments] = useState<Record<string, boolean>>({});
  const [newCommentTexts, setNewCommentTexts] = useState<Record<string, string>>({});
  
  // Report Confirmation Modal states
  const [reportingPostId, setReportingPostId] = useState<string | null>(null);

  // Search author states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ uid: string; displayName: string }[]>([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [searching, setSearching] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-resize textarea in creation modal
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 300)}px`;
    }
  }, [postContent]);

  // Fetch posts on mount
  const fetchPosts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/community');
      if (!res.ok) throw new Error('Failed to load posts from community.');
      const data = await res.json();
      setPosts(data);
    } catch (err) {
      console.error(err);
      setErrorMsg((err as Error).message || 'The literary archives failed to compile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !postTitle.trim() || !postContent.trim() || submittingPost) return;
    
    setSubmittingPost(true);
    try {
      const response = await fetch('/api/community', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: user.uid,
          displayName: user.displayName || user.email?.split('@')[0] || 'Reader',
          title: postTitle.trim(),
          content: postContent.trim(),
          type: postType,
        }),
      });

      if (!response.ok) throw new Error('Failed to publish post.');
      
      setPostTitle('');
      setPostType('original');
      setPostContent('');
      setShowCreateModal(false);
      
      await fetchPosts();
    } catch (err) {
      console.error(err);
      alert((err as Error).message || 'An error occurred during submission.');
    } finally {
      setSubmittingPost(false);
    }
  };

  // Optimistic Like Handler
  const handleLikeToggle = async (postId: string) => {
    if (!user) return;

    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    const isLiked = post.likes.includes(user.uid);
    
    setPosts(
      posts.map((p) => {
        if (p.id === postId) {
          return {
            ...p,
            likes: isLiked
              ? p.likes.filter((uid) => uid !== user.uid)
              : [...p.likes, user.uid],
          };
        }
        return p;
      })
    );

    try {
      const response = await fetch('/api/community', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: isLiked ? 'unlike' : 'like',
          postId,
          uid: user.uid,
        }),
      });

      if (!response.ok) throw new Error('Interaction failed');
    } catch (err) {
      console.error('Error handling like/unlike:', err);
      fetchPosts();
    }
  };

  // Optimistic Comment Submission
  const handleAddComment = async (postId: string) => {
    if (!user) return;
    const commentText = newCommentTexts[postId] || '';
    if (!commentText.trim()) return;

    setNewCommentTexts({
      ...newCommentTexts,
      [postId]: '',
    });

    const displayName = user.displayName || user.email?.split('@')[0] || 'Reader';

    const tempComment: Comment = {
      uid: user.uid,
      displayName,
      content: commentText.trim(),
      createdAt: new Date().toISOString(),
    };

    setPosts(
      posts.map((p) => {
        if (p.id === postId) {
          return {
            ...p,
            comments: [...(p.comments || []), tempComment],
          };
        }
        return p;
      })
    );

    try {
      const response = await fetch('/api/community', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'comment',
          postId,
          uid: user.uid,
          comment: commentText.trim(),
          displayName,
        }),
      });

      if (!response.ok) throw new Error('Comment failed to post');
    } catch (err) {
      console.error('Error posting comment:', err);
      fetchPosts();
    }
  };

  // Report Submission
  const handleReportPost = async () => {
    if (!user || !reportingPostId) return;

    const postId = reportingPostId;
    setReportingPostId(null);

    setPosts(
      posts.map((p) => {
        if (p.id === postId) {
          return {
            ...p,
            reports: [...(p.reports || []), user.uid],
          };
        }
        return p;
      })
    );

    try {
      const response = await fetch('/api/community', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'report',
          postId,
          uid: user.uid,
        }),
      });

      if (!response.ok) throw new Error('Failed to file report');
    } catch (err) {
      console.error('Error reporting post:', err);
      fetchPosts();
    }
  };

  // User search submit handler
  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      const matching: { uid: string; displayName: string }[] = [];
      usersSnap.forEach((docSnap) => {
        const data = docSnap.data();
        const dName = data.displayName || '';
        if (dName.toLowerCase().includes(searchQuery.toLowerCase().trim())) {
          matching.push({
            uid: docSnap.id,
            displayName: dName,
          });
        }
      });
      setSearchResults(matching);
      setShowSearchDropdown(true);
    } catch (err) {
      console.error('Error searching authors:', err);
    } finally {
      setSearching(false);
    }
  };

  // Share Card Generation
  const handleShareCard = (post: Post) => {
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
      <div style="font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: rgba(26,26,26,0.4); margin-bottom: 25px;">✦ Versecraft Anthology</div>
      <div style="font-size: 24px; font-weight: bold; color: #1a1a1a; margin-bottom: 8px;">${post.title}</div>
      <div style="font-size: 11px; font-style: italic; color: rgba(26,26,26,0.5); margin-bottom: 25px;">by ${post.displayName}</div>
      <div style="font-size: 14px; line-height: 1.8; color: #1a1a1a; margin-bottom: 40px; white-space: pre-wrap;">${post.content}</div>
      <div style="border-top: 1px solid rgba(26, 26, 26, 0.08); padding-top: 20px; font-size: 10px; color: rgba(26,26,26,0.4); letter-spacing: 2px;">versecraft.app</div>
    `;

    document.body.appendChild(card);
    html2canvas(card, { backgroundColor: '#F8F4E9' }).then((canvas) => {
      const link = document.createElement('a');
      link.download = `versecraft-card-${post.id}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      document.body.removeChild(card);
    });
  };

  const formatTimeAgo = (dateStr: string) => {
    try {
      const past = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - past.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    } catch {
      return 'Recently';
    }
  };

  const typeLabels: Record<string, string> = {
    original: 'Original Poem',
    poem: 'AI Poem',
    story: 'Story',
    analysis: 'Literary Analysis',
    translation: 'Translation',
    collaboration: 'Collaboration',
    other: 'Other',
  };

  return (
    <div className="relative z-10 w-full min-h-screen pt-28 pb-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 bg-[#F8F4E9] text-[#1a1a1a]">
      {/* Dashboard Back Link */}
      <div className="mb-4 text-left">
        <NextLink
          href="/dashboard"
          className="text-xs text-[#1a1a1a]/60 hover:text-[#1a1a1a] hover:underline transition-all inline-flex items-center gap-1 font-inter font-medium"
        >
          ← Dashboard
        </NextLink>
      </div>

      {/* Header and top sharing CTA */}
      <div className="flex flex-col md:flex-row justify-between items-center md:items-end gap-6 mb-8 border-b border-[rgba(26,26,26,0.1)] pb-8">
        <div className="text-center md:text-left space-y-2">
          <h1 className="font-playfair text-4xl sm:text-5xl font-bold text-[#1a1a1a] tracking-wide">
            The Community Anthology
          </h1>
          <p className="font-playfair italic text-[#1a1a1a]/60 text-sm sm:text-base">
            A living collection of verses, stories, and reflections from our literary community.
          </p>
        </div>

        {/* Share Button */}
        {!authLoading && user && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-2.5 bg-[#1a1a1a] hover:bg-[#2d2d2d] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-sm font-inter flex items-center gap-1.5"
          >
            🖋️ Share Your Work
          </button>
        )}
      </div>

      {/* Author Search Bar Section */}
      <div className="relative max-w-md mb-12" ref={dropdownRef}>
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <input
            type="text"
            placeholder="Search for an author by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-grow px-4 py-2 rounded-xl border border-[rgba(26,26,26,0.1)] bg-white text-xs text-[#1a1a1a] outline-none shadow-sm focus:border-[#1a1a1a]/30"
          />
          <button
            type="submit"
            disabled={searching}
            className="px-4 py-2 bg-[#1a1a1a] hover:bg-[#2d2d2d] text-white rounded-xl text-xs font-bold uppercase tracking-wider font-inter transition-all shadow-sm"
          >
            {searching ? '...' : 'Search'}
          </button>
        </form>

        {/* Dropdown list */}
        <AnimatePresence>
          {showSearchDropdown && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="absolute left-0 right-0 mt-2 bg-white border border-[rgba(26,26,26,0.1)] rounded-xl shadow-xl z-40 max-h-[250px] overflow-y-auto pr-1 no-scrollbar p-2"
            >
              {searchResults.length === 0 ? (
                <div className="py-4 text-center text-xs italic text-[#1a1a1a]/40 font-playfair">
                  No authors found.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {searchResults.map((item) => (
                    <NextLink
                      key={item.uid}
                      href={`/profile/${item.uid}`}
                      onClick={() => setShowSearchDropdown(false)}
                      className="flex items-center gap-3 p-2 hover:bg-[#F8F4E9] rounded-lg transition-all"
                    >
                      <div className="w-6 h-6 rounded-full bg-[#1a1a1a]/5 flex items-center justify-center text-[#1a1a1a] font-bold text-[10px] uppercase font-playfair border border-[rgba(26,26,26,0.1)]">
                        {item.displayName.charAt(0)}
                      </div>
                      <span className="font-playfair font-bold text-xs text-[#1a1a1a] hover:underline">
                        {item.displayName}
                      </span>
                    </NextLink>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main layout contents */}
      {loading ? (
        <div className="min-h-screen bg-[#F8F4E9] flex items-center justify-center relative z-10">
          <div className="animate-pulse flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full border-t-2 border-[#1a1a1a] border-r-2 animate-spin" />
            <span className="font-playfair text-lg text-[#1a1a1a] font-medium italic">Consulting the archives...</span>
          </div>
        </div>
      ) : errorMsg ? (
        <div className="bg-white border border-[rgba(26,26,26,0.1)] p-12 text-center rounded-2xl max-w-md mx-auto space-y-6 shadow-sm">
          <span className="text-3xl block">⚠️</span>
          <p className="font-playfair text-lg text-[#1a1a1a] italic">An archival error occurred</p>
          <p className="text-xs text-[#1a1a1a]/60 leading-relaxed font-inter">{errorMsg}</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="py-24 text-center max-w-md mx-auto">
          <span className="text-4xl block mb-6 animate-bounce">🕯️</span>
          <p className="font-playfair text-2xl text-[#1a1a1a] italic leading-relaxed">
            The anthology awaits its first verse.<br />Be the first to share.
          </p>
          {!user && (
            <div className="mt-8 max-w-sm mx-auto p-6 bg-white border border-[rgba(26,26,26,0.1)] rounded-2xl space-y-4 shadow-sm">
              <p className="text-xs text-[#1a1a1a]/60 font-inter leading-relaxed">
                Join Versecraft to share your work and engage with the community.
              </p>
              <NextLink
                href="/auth?mode=login"
                className="px-6 py-2 bg-[#1a1a1a] hover:bg-[#2d2d2d] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all font-inter inline-block shadow-sm"
              >
                Login to Versecraft
              </NextLink>
            </div>
          )}
        </div>
      ) : (
        /* POSTS GRID */
        <div className="space-y-12">
          {/* Unlogged CTA banner */}
          {!user && (
            <div className="p-5 bg-white border border-[rgba(26,26,26,0.1)] rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-4 text-center sm:text-left shadow-sm">
              <div>
                <h4 className="font-playfair font-bold text-[#1a1a1a] text-sm sm:text-base">Join the Conversation</h4>
                <p className="font-inter text-xs text-[#1a1a1a]/60 mt-1 leading-relaxed">
                  Join Versecraft to share your work and engage with the community.
                </p>
              </div>
              <NextLink
                href="/auth?mode=login"
                className="px-6 py-2 bg-[#1a1a1a] hover:bg-[#2d2d2d] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all font-inter inline-block self-center shadow-sm"
              >
                Login
              </NextLink>
            </div>
          )}

          {/* Masonry Columns container */}
          <div className="columns-1 md:columns-2 gap-6 space-y-6 [column-fill:_balance] w-full">
            {posts.map((post) => {
              const isLiked = user ? post.likes?.includes(user.uid) : false;
              const isReported = user ? post.reports?.includes(user.uid) : false;
              const hasComments = post.comments && post.comments.length > 0;
              const commentCount = post.comments ? post.comments.length : 0;
              const likeCount = post.likes ? post.likes.length : 0;
              const isExpanded = expandedPosts[post.id];
              const isLong = post.content.length > 200;

              return (
                <motion.div
                  key={post.id}
                  layout="position"
                  className="bg-white border border-[rgba(26,26,26,0.1)] p-6 sm:p-8 rounded-2xl space-y-4 hover:border-[rgba(26,26,26,0.2)] transition-all inline-block w-full break-inside-avoid mb-6 shadow-sm"
                >
                  {/* Card top row */}
                  <div className="flex justify-between items-center w-full">
                    <div className="flex flex-col items-start gap-1">
                      {/* Clickable author name */}
                      <NextLink
                        href={`/profile/${post.uid}`}
                        className="font-inter text-xs text-[#1a1a1a] hover:underline font-bold cursor-pointer"
                      >
                        🖋️ {post.displayName}
                      </NextLink>
                      <span className="text-[10px] text-[#1a1a1a]/40 font-inter">
                        {formatTimeAgo(post.createdAt)}
                      </span>
                    </div>

                    <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider font-inter bg-[#1a1a1a]/5 text-[#1a1a1a]">
                      {typeLabels[post.type] || post.type}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="font-playfair text-lg sm:text-xl font-bold text-[#1a1a1a] leading-snug">
                    {post.title}
                  </h3>

                  {/* Content body */}
                  <div className="font-inter text-xs sm:text-sm text-[#1a1a1a]/85 leading-relaxed text-justify whitespace-pre-wrap">
                    {isExpanded || !isLong ? post.content : `${post.content.slice(0, 200)}...`}
                    {isLong && (
                      <button
                        onClick={() =>
                          setExpandedPosts({
                            ...expandedPosts,
                            [post.id]: !isExpanded,
                          })
                        }
                        className="text-[#1a1a1a] font-semibold text-xs ml-1 hover:underline transition-all block mt-2 font-inter"
                      >
                        {isExpanded ? 'Show Less' : 'Read More ✦'}
                      </button>
                    )}
                  </div>

                  {/* Options row */}
                  <div className="flex flex-wrap gap-2 items-center justify-between pt-4 border-t border-[rgba(26,26,26,0.06)] w-full">
                    {/* Likes & Comments triggers */}
                    <div className="flex items-center gap-2">
                      {/* Like Trigger */}
                      <button
                        onClick={() => handleLikeToggle(post.id)}
                        disabled={!user}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-semibold font-inter transition-all flex items-center gap-1.5 ${
                          isLiked
                            ? 'bg-[#1a1a1a] border-transparent text-white shadow-sm'
                            : 'border-[rgba(26,26,26,0.1)] bg-[#F8F4E9]/50 text-[#1a1a1a]/60 hover:text-[#1a1a1a] hover:border-[#1a1a1a]'
                        } ${!user ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {isLiked ? '❤️' : '🤍'} {likeCount}
                      </button>

                      {/* Comments Toggle */}
                      <button
                        onClick={() =>
                          setShowComments({
                            ...showComments,
                            [post.id]: !showComments[post.id],
                          })
                        }
                        className={`px-3 py-1.5 rounded-lg border text-xs font-semibold font-inter transition-all flex items-center gap-1.5 ${
                          showComments[post.id]
                            ? 'bg-[#1a1a1a]/5 border-[#1a1a1a]/20 text-[#1a1a1a]'
                            : 'border-[rgba(26,26,26,0.1)] bg-[#F8F4E9]/50 text-[#1a1a1a]/60 hover:text-[#1a1a1a]'
                        }`}
                      >
                        💬 {commentCount}
                      </button>
                    </div>

                    {/* Secondary Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleShareCard(post)}
                        className="text-[#1a1a1a]/60 hover:text-[#1a1a1a] text-xs font-bold font-inter"
                        title="Download Share Card"
                      >
                        🎨 Share
                      </button>

                      {user && !isReported && post.uid !== user.uid && (
                        <button
                          onClick={() => setReportingPostId(post.id)}
                          className="text-red-600/60 hover:text-red-600 text-xs font-medium font-inter"
                        >
                          Report
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Comments Collapsible Panel */}
                  <AnimatePresence>
                    {showComments[post.id] && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden pt-4 space-y-4 border-t border-[rgba(26,26,26,0.06)]"
                      >
                        {/* Comments List */}
                        {hasComments ? (
                          <div className="space-y-3 max-h-60 overflow-y-auto pr-1 no-scrollbar">
                            {post.comments.map((c, idx) => (
                              <div
                                key={`${c.uid}-${idx}`}
                                className="bg-[#F8F4E9] p-3 rounded-xl border border-[rgba(26,26,26,0.04)]"
                              >
                                <div className="flex justify-between items-center mb-1">
                                  {/* Comment clickable author */}
                                  <NextLink
                                    href={`/profile/${c.uid}`}
                                    className="text-[10px] font-bold text-[#1a1a1a] hover:underline"
                                  >
                                    {c.displayName}
                                  </NextLink>
                                  <span className="text-[8px] text-[#1a1a1a]/40 font-inter">
                                    {formatTimeAgo(c.createdAt)}
                                  </span>
                                </div>
                                <p className="text-xs text-[#1a1a1a]/85 leading-relaxed">
                                  {c.content}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[10px] italic text-[#1a1a1a]/40 text-center font-playfair">
                            Silence fills the commentary. Be the first to reflect.
                          </p>
                        )}

                        {/* Comment Input */}
                        {user ? (
                          <div className="flex gap-2 pt-2">
                            <input
                              type="text"
                              placeholder="Write a reflection..."
                              value={newCommentTexts[post.id] || ''}
                              onChange={(e) =>
                                setNewCommentTexts({
                                  ...newCommentTexts,
                                  [post.id]: e.target.value,
                                })
                              }
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') handleAddComment(post.id);
                              }}
                              className="flex-grow px-3 py-1.5 rounded-lg border border-[rgba(26,26,26,0.1)] bg-[#F8F4E9]/50 text-xs text-[#1a1a1a] outline-none"
                            />
                            <button
                              onClick={() => handleAddComment(post.id)}
                              className="px-3 py-1.5 bg-[#1a1a1a] hover:bg-[#2d2d2d] text-white rounded-lg text-xs font-bold font-inter"
                            >
                              Post
                            </button>
                          </div>
                        ) : (
                          <p className="text-[9px] text-center text-[#1a1a1a]/45 font-inter">
                            Please{' '}
                            <NextLink href="/auth" className="underline hover:text-[#1a1a1a]">
                              login
                            </NextLink>{' '}
                            to post a reflection.
                          </p>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 bg-[#1a1a1a]/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-[rgba(26,26,26,0.1)] rounded-2xl p-6 sm:p-8 max-w-xl w-full shadow-2xl relative"
            >
              <button
                onClick={() => setShowCreateModal(false)}
                className="absolute top-4 right-4 text-[#1a1a1a]/40 hover:text-[#1a1a1a] text-lg font-bold"
              >
                ✕
              </button>

              <h3 className="font-playfair text-xl font-bold text-[#1a1a1a] mb-6 border-b border-[rgba(26,26,26,0.06)] pb-3">
                🖋️ Scribe a New Work
              </h3>

              <form onSubmit={handleCreatePost} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs uppercase tracking-wider text-[#1a1a1a]/60 font-bold mb-1 font-inter">Title</label>
                    <input
                      type="text"
                      placeholder="Title of your piece..."
                      value={postTitle}
                      onChange={(e) => setPostTitle(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 rounded-xl border border-[rgba(26,26,26,0.1)] bg-[#F8F4E9] text-xs font-semibold text-[#1a1a1a] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-wider text-[#1a1a1a]/60 font-bold mb-1 font-inter">Type</label>
                    <select
                      value={postType}
                      onChange={(e) => setPostType(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-[rgba(26,26,26,0.1)] bg-[#F8F4E9] text-xs font-semibold text-[#1a1a1a] outline-none"
                    >
                      {Object.entries(typeLabels).map(([val, label]) => (
                        <option key={val} value={val} className="bg-white text-[#1a1a1a]">
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#1a1a1a]/60 font-bold mb-1 font-inter">Your Writing</label>
                  <textarea
                    ref={textareaRef}
                    placeholder="Scribe your verses, story, or literary critique here..."
                    value={postContent}
                    onChange={(e) => setPostContent(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-[rgba(26,26,26,0.1)] bg-[#F8F4E9] text-xs text-[#1a1a1a] outline-none resize-none leading-relaxed"
                  />
                </div>

                <div className="flex gap-3 pt-3 border-t border-[rgba(26,26,26,0.06)]">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-grow py-2.5 border border-[rgba(26,26,26,0.1)] rounded-xl text-xs uppercase font-bold tracking-wider font-inter text-[#1a1a1a] hover:bg-[#F8F4E9] transition-all text-center"
                  >
                    Discard
                  </button>
                  <button
                    type="submit"
                    disabled={submittingPost}
                    className="flex-grow py-2.5 bg-[#1a1a1a] hover:bg-[#2d2d2d] text-white text-xs font-bold uppercase tracking-wider rounded-xl font-inter transition-all text-center shadow-sm disabled:opacity-50"
                  >
                    {submittingPost ? 'Publishing...' : 'Publish to Anthology'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Report Post Confirmation Modal */}
      <AnimatePresence>
        {reportingPostId && (
          <div className="fixed inset-0 bg-[#1a1a1a]/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-[rgba(26,26,26,0.1)] rounded-2xl p-6 sm:p-8 max-w-sm w-full text-center space-y-6 shadow-2xl relative"
            >
              <span className="text-3xl block">🚩</span>
              <div className="space-y-2">
                <h4 className="font-playfair text-lg font-bold text-[#1a1a1a]">Report Post</h4>
                <p className="text-xs text-[#1a1a1a]/60 leading-relaxed font-inter">
                  Are you sure you want to report this post as inappropriate?
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setReportingPostId(null)}
                  className="flex-grow py-2 border border-[rgba(26,26,26,0.1)] hover:bg-[#F8F4E9] rounded-lg text-[10px] uppercase font-bold tracking-wider font-inter text-[#1a1a1a] transition-all text-center"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleReportPost}
                  className="flex-grow py-2 bg-red-600 hover:bg-red-500 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg font-inter transition-all text-center shadow-sm"
                >
                  Confirm Report
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

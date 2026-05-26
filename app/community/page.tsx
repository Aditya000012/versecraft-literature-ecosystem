'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import html2canvas from 'html2canvas';

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

  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
      
      // Clean up modal states
      setPostTitle('');
      setPostType('original');
      setPostContent('');
      setShowCreateModal(false);
      
      // Reload posts
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
    
    // 1. Update UI Optimistically
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

    // 2. Call PATCH API
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
      // Revert optimism on error
      fetchPosts();
    }
  };

  // Optimistic Comment Submission
  const handleAddComment = async (postId: string) => {
    if (!user) return;
    const commentText = newCommentTexts[postId] || '';
    if (!commentText.trim()) return;

    // Clear comment input locally
    setNewCommentTexts({
      ...newCommentTexts,
      [postId]: '',
    });

    const displayName = user.displayName || user.email?.split('@')[0] || 'Reader';

    // 1. Optimistic append
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

    // 2. Call PATCH API
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
      // Revert on error
      fetchPosts();
    }
  };

  // Report Submission
  const handleReportPost = async () => {
    if (!user || !reportingPostId) return;

    const postId = reportingPostId;
    setReportingPostId(null);

    // Optimistically mark as reported
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
      
      // Reload in case it triggered the flag & hide limits
      await fetchPosts();
    } catch (err) {
      console.error('Error reporting post:', err);
      fetchPosts();
    }
  };

  // Download Card as beautiful Multi-page PNG
  const handleDownloadPostCard = async (post: Post) => {
    const words = post.content.split(' ');
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

    const typeLabels: Record<string, string> = {
      original: 'Original Poem',
      poem: 'AI Poem',
      story: 'Story',
      analysis: 'Literary Analysis',
      translation: 'Translation',
      collaboration: 'Collaboration',
      other: 'Other',
    };

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
        <div style="color: #c9a84c; font-size: 11px; letter-spacing: 3px; margin-bottom: 24px; text-transform: uppercase; font-family: sans-serif; font-weight: bold;">✦ Versecraft Anthology ${chunks.length > 1 ? `(${i + 1}/${chunks.length})` : ''}</div>
        <div style="font-size: 26px; font-weight: bold; color: #c9a84c; margin-bottom: 8px; font-family: 'Playfair Display', Georgia, serif; line-height: 1.2;">${post.title}</div>
        <div style="color: rgba(245, 240, 232, 0.4); font-size: 11px; font-family: sans-serif; margin-bottom: 32px; letter-spacing: 1px; font-weight: bold;">by ${post.displayName} • ${typeLabels[post.type] || post.type}</div>
        <div style="font-size: 14px; line-height: 1.85; font-style: italic; color: #f5f0e8; margin-bottom: 40px; white-space: pre-wrap; text-align: justify;">${chunks[i]}</div>
        <div style="color: #c9a84c; font-size: 10px; letter-spacing: 2px; border-top: 1px solid rgba(201, 168, 76, 0.15); padding-top: 16px; font-family: sans-serif;">versecraft.app</div>
      `;
      
      document.body.appendChild(card);
      try {
        const canvas = await html2canvas(card, { backgroundColor: null, scale: 2 });
        const link = document.createElement('a');
        link.download = chunks.length > 1 
          ? `versecraft-community-${post.title.toLowerCase().replace(/\s+/g, '-')}-${i + 1}.png` 
          : `versecraft-community-${post.title.toLowerCase().replace(/\s+/g, '-')}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        await new Promise((resolve) => setTimeout(resolve, 500));
      } finally {
        document.body.removeChild(card);
      }
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    try {
      const now = new Date();
      const date = new Date(dateStr);
      const diffMs = now.getTime() - date.getTime();
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHour = Math.floor(diffMin / 60);
      const diffDay = Math.floor(diffHour / 24);

      if (isNaN(date.getTime())) return 'Recently';
      if (diffSec < 60) return 'Just now';
      if (diffMin < 60) return `${diffMin}m ago`;
      if (diffHour < 24) return `${diffHour}h ago`;
      if (diffDay === 1) return 'Yesterday';
      return `${diffDay}d ago`;
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

  const typeBadgeStyles: Record<string, string> = {
    original: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
    poem: 'bg-purple-950/20 text-purple-300 border border-purple-500/20',
    story: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    analysis: 'bg-sky-500/10 text-sky-400 border border-sky-500/20',
    translation: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    collaboration: 'bg-pink-500/10 text-pink-400 border border-pink-500/20',
    other: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
  };

  return (
    <div className="relative z-10 w-full min-h-screen pt-28 pb-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Dashboard Back Link */}
      <div className="mb-4 text-left">
        <Link
          href="/dashboard"
          className="text-xs text-gold hover:text-gold-light transition-colors inline-flex items-center gap-1 font-inter font-medium"
        >
          ← Dashboard
        </Link>
      </div>

      {/* Header and top sharing CTA */}
      <div className="flex flex-col md:flex-row justify-between items-center md:items-end gap-6 mb-12 border-b border-white/5 pb-8">
        <div className="text-center md:text-left space-y-2">
          <h1 className="font-playfair text-4xl sm:text-5xl font-bold text-gold tracking-wide">
            The Community Anthology
          </h1>
          <p className="font-playfair italic text-cream/70 text-sm sm:text-base">
            A living collection of verses, stories, and reflections from our literary community.
          </p>
        </div>

        {/* Share Button (Only visible if logged in, else redirect state shown below) */}
        {!authLoading && user && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-2.5 bg-gold hover:bg-gold-light text-navy text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-md shadow-gold/15 font-inter flex items-center gap-1.5"
          >
            🖋️ Share Your Work
          </button>
        )}
      </div>

      {/* Main layout contents */}
      {loading ? (
        /* SKELETON PLACEHOLDERS */
        <div className="columns-1 md:columns-2 gap-6 space-y-6">
          {[1, 2, 3].map((idx) => (
            <div
              key={idx}
              className="glass-card border-white/5 p-6 sm:p-8 rounded-2xl space-y-6 animate-pulse inline-block w-full"
            >
              <div className="flex justify-between items-center">
                <div className="h-4 bg-white/10 rounded w-24" />
                <div className="h-4 bg-white/10 rounded w-16" />
              </div>
              <div className="h-6 bg-white/10 rounded w-3/4" />
              <div className="space-y-2">
                <div className="h-4 bg-white/10 rounded w-full" />
                <div className="h-4 bg-white/10 rounded w-5/6" />
              </div>
              <div className="h-8 bg-white/10 rounded w-full" />
            </div>
          ))}
        </div>
      ) : errorMsg ? (
        <div className="glass-card border-white/5 p-12 text-center rounded-2xl max-w-md mx-auto space-y-6">
          <span className="text-3xl block">⚠️</span>
          <p className="font-playfair text-lg text-gold italic">An archival error occurred</p>
          <p className="text-xs text-cream/40 leading-relaxed font-inter">{errorMsg}</p>
        </div>
      ) : posts.length === 0 ? (
        /* EMPTY STATE */
        <div className="py-24 text-center">
          <p className="font-playfair text-2xl text-gold italic leading-relaxed">
            The anthology awaits its first verse.<br />Be the first to share.
          </p>
          {!user && (
            <div className="mt-8 max-w-sm mx-auto p-6 glass-card border-white/5 rounded-2xl space-y-4">
              <p className="text-xs text-cream/60 font-inter leading-relaxed">
                Join Versecraft to share your work and engage with the community.
              </p>
              <Link
                href="/auth?mode=login"
                className="px-6 py-2 bg-gold hover:bg-gold-light text-navy text-xs font-bold uppercase tracking-wider rounded-xl transition-all font-inter inline-block"
              >
                Login to Versecraft
              </Link>
            </div>
          )}
        </div>
      ) : (
        /* POSTS GRID */
        <div className="space-y-12">
          {/* Unlogged CTA banner */}
          {!user && (
            <div className="p-5 glass-card border-[#c9a84c]/20 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-4 text-center sm:text-left">
              <div>
                <h4 className="font-playfair font-bold text-gold text-sm sm:text-base">Join the Conversation</h4>
                <p className="font-inter text-xs text-cream/60 mt-1 leading-relaxed">
                  Join Versecraft to share your work and engage with the community.
                </p>
              </div>
              <Link
                href="/auth?mode=login"
                className="px-6 py-2 bg-gold hover:bg-gold-light text-navy text-xs font-bold uppercase tracking-wider rounded-xl transition-all font-inter inline-block self-center shadow shadow-gold/5"
              >
                Login
              </Link>
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
                  className="glass-card border-white/5 p-6 sm:p-8 rounded-2xl space-y-4 hover:border-white/10 transition-all inline-block w-full break-inside-avoid mb-6"
                >
                  {/* Card top row */}
                  <div className="flex justify-between items-center w-full">
                    <div className="flex flex-col items-start gap-1">
                      <span className="font-inter text-xs text-gold font-bold">
                        🖋️ {post.displayName}
                      </span>
                      <span className="text-[10px] text-cream/40 font-inter">
                        {formatTimeAgo(post.createdAt)}
                      </span>
                    </div>

                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider font-inter ${typeBadgeStyles[post.type] || typeBadgeStyles.other}`}>
                      {typeLabels[post.type] || post.type}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="font-playfair text-lg sm:text-xl font-bold text-cream leading-snug">
                    {post.title}
                  </h3>

                  {/* Content body */}
                  <div className="font-inter text-xs sm:text-sm text-cream/80 leading-relaxed text-justify whitespace-pre-wrap">
                    {isExpanded || !isLong ? post.content : `${post.content.slice(0, 200)}...`}
                    {isLong && (
                      <button
                        onClick={() =>
                          setExpandedPosts({
                            ...expandedPosts,
                            [post.id]: !isExpanded,
                          })
                        }
                        className="text-gold font-semibold text-xs ml-1 hover:underline transition-all block mt-2 font-inter"
                      >
                        {isExpanded ? 'Show Less' : 'Read More ✦'}
                      </button>
                    )}
                  </div>

                  {/* Options row */}
                  <div className="flex flex-wrap gap-2 items-center justify-between pt-4 border-t border-white/5 w-full">
                    {/* Likes & Comments triggers */}
                    <div className="flex items-center gap-2">
                      {/* Like Trigger */}
                      <button
                        onClick={() => handleLikeToggle(post.id)}
                        disabled={!user}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-semibold font-inter transition-all flex items-center gap-1.5 ${
                          isLiked
                            ? 'bg-rose-500/10 border-rose-500/40 text-rose-400'
                            : 'border-white/5 bg-white/5 text-cream/60 hover:text-rose-400 hover:border-rose-500/20'
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
                            ? 'bg-gold/10 border-gold/40 text-gold'
                            : 'border-white/5 bg-white/5 text-cream/60 hover:text-gold hover:border-gold/20'
                        }`}
                      >
                        💬 {commentCount}
                      </button>
                    </div>

                    {/* Download & Report */}
                    <div className="flex items-center gap-2">
                      {/* Download */}
                      <button
                        onClick={() => handleDownloadPostCard(post)}
                        className="p-1.5 border border-white/5 bg-white/5 hover:border-gold/30 rounded-lg text-cream/50 hover:text-gold transition-all"
                        title="Download Share Card"
                      >
                        🎨
                      </button>

                      {/* Report */}
                      <button
                        onClick={() => setReportingPostId(post.id)}
                        disabled={!user || isReported}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold font-inter border transition-all flex items-center gap-1 ${
                          isReported
                            ? 'bg-purple-950/20 border-purple-500/20 text-purple-400 opacity-60 cursor-not-allowed'
                            : 'border-white/5 bg-white/5 text-cream/30 hover:text-red-400 hover:border-red-500/20'
                        } ${!user ? 'opacity-40 cursor-not-allowed' : ''}`}
                        title={isReported ? 'Already Reported' : 'Report Post'}
                      >
                        🚩 {isReported ? 'Reported' : ''}
                      </button>
                    </div>
                  </div>

                  {/* Comments expanded sub-panel */}
                  {showComments[post.id] && (
                    <div className="pt-4 border-t border-white/5 space-y-4 w-full">
                      {/* Subtitle */}
                      <h4 className="font-playfair font-bold text-xs text-gold uppercase tracking-wider">
                        Comments
                      </h4>

                      {/* Comments feed */}
                      {hasComments ? (
                        <div className="space-y-3.5 max-h-56 overflow-y-auto pr-1">
                          {post.comments.map((comment, index) => (
                            <div
                              key={index}
                              className="p-3 bg-white/5 border border-white/5 rounded-xl text-left"
                            >
                              <div className="flex justify-between items-center text-[10px] text-cream/40 mb-1 font-inter">
                                <span className="font-semibold text-gold">
                                  {comment.displayName}
                                </span>
                                <span>{formatTimeAgo(comment.createdAt)}</span>
                              </div>
                              <p className="text-xs text-cream/80 whitespace-pre-wrap font-inter">
                                {comment.content}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[10px] italic text-cream/40 font-inter">
                          No commentaries written yet. Be the first to scribe.
                        </p>
                      )}

                      {/* Add comment box */}
                      {user ? (
                        <div className="flex items-center gap-2 pt-2">
                          <input
                            type="text"
                            placeholder="Add commentary..."
                            value={newCommentTexts[post.id] || ''}
                            onChange={(e) =>
                              setNewCommentTexts({
                                ...newCommentTexts,
                                [post.id]: e.target.value,
                              })
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleAddComment(post.id);
                            }}
                            className="flex-grow px-3 py-1.5 rounded-lg outline-none glass-input text-xs text-cream placeholder-cream/25 focus:border-gold/30"
                          />
                          <button
                            onClick={() => handleAddComment(post.id)}
                            disabled={!(newCommentTexts[post.id] || '').trim()}
                            className="px-4 py-1.5 bg-gold hover:bg-gold-light disabled:opacity-50 disabled:cursor-not-allowed text-navy text-[10px] font-bold uppercase tracking-wider rounded-lg font-inter transition-all"
                          >
                            Submit
                          </button>
                        </div>
                      ) : (
                        <p className="text-[10px] text-cream/40 font-inter border-t border-white/5 pt-2">
                          <Link href="/auth?mode=login" className="text-gold hover:underline">
                            Login
                          </Link>{' '}
                          to write commentaries.
                        </p>
                      )}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* OVERLAY MODAL: CREATE POST */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
            {/* Backdrop click */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateModal(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="glass-card border-white/5 rounded-2xl w-full max-w-xl p-6 sm:p-8 shadow-2xl relative overflow-hidden z-10 space-y-6"
            >
              {/* Gold side highlight bar */}
              <div className="absolute top-0 left-0 bottom-0 w-[4px] bg-gold" />

              <div className="space-y-1">
                <h3 className="font-playfair text-2xl font-bold text-cream">Share Your Work</h3>
                <p className="font-inter text-[10px] text-gold uppercase tracking-wider">
                  Publish to the Community Anthology
                </p>
              </div>

              <form onSubmit={handleCreatePost} className="space-y-5">
                {/* Title */}
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-widest text-gold mb-2 font-inter">
                    Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Provide a name for your masterpiece..."
                    value={postTitle}
                    onChange={(e) => setPostTitle(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl outline-none glass-input text-sm text-cream placeholder-cream/25 focus:border-gold/45 transition-all shadow"
                  />
                </div>

                {/* Type dropdown */}
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-widest text-gold mb-2 font-inter">
                    Type of Work
                  </label>
                  <select
                    value={postType}
                    onChange={(e) => setPostType(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl outline-none glass-input text-xs font-semibold text-cream"
                  >
                    <option value="original" className="bg-navy text-cream">
                      Original Poem
                    </option>
                    <option value="poem" className="bg-navy text-cream">
                      AI Poem
                    </option>
                    <option value="story" className="bg-navy text-cream">
                      Story
                    </option>
                    <option value="analysis" className="bg-navy text-cream">
                      Literary Analysis
                    </option>
                    <option value="translation" className="bg-navy text-cream">
                      Translation
                    </option>
                    <option value="collaboration" className="bg-navy text-cream">
                      Collaboration
                    </option>
                    <option value="other" className="bg-navy text-cream">
                      Other
                    </option>
                  </select>
                </div>

                {/* Content body */}
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-widest text-gold mb-2 font-inter">
                    Content
                  </label>
                  <textarea
                    ref={textareaRef}
                    required
                    placeholder="Type or paste your verses, story seed, translation, or critical analysis here..."
                    value={postContent}
                    onChange={(e) => setPostContent(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl outline-none glass-input text-sm text-cream placeholder-cream/25 resize-none leading-relaxed transition-all focus:border-gold/45 min-h-[120px]"
                  />
                </div>

                {/* Actions row */}
                <div className="flex gap-4 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 py-3 border border-white/10 hover:bg-white/5 rounded-xl text-xs font-bold uppercase tracking-wider font-inter text-cream transition-all text-center"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingPost}
                    className="flex-1 py-3 bg-gold hover:bg-gold-light text-navy text-xs font-bold uppercase tracking-wider rounded-xl font-inter transition-all text-center shadow shadow-gold/15"
                  >
                    {submittingPost ? 'Publishing...' : 'Post to Community'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CONFIRMATION OVERLAY: REPORT POST */}
      <AnimatePresence>
        {reportingPostId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setReportingPostId(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card border-white/5 rounded-2xl w-full max-w-sm p-6 shadow-2xl relative overflow-hidden z-10 space-y-6 text-center"
            >
              {/* Gold highlight bar */}
              <div className="absolute top-0 left-0 bottom-0 w-[4px] bg-gold" />

              <span className="text-3xl block">🚩</span>
              <div className="space-y-2">
                <h4 className="font-playfair text-lg font-bold text-cream">Report Post</h4>
                <p className="text-xs text-cream/60 leading-relaxed font-inter">
                  Are you sure you want to report this post as inappropriate?
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setReportingPostId(null)}
                  className="flex-1 py-2 border border-white/10 hover:bg-white/5 rounded-lg text-[10px] uppercase font-bold tracking-wider font-inter text-cream transition-all text-center"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleReportPost}
                  className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-cream text-[10px] font-bold uppercase tracking-wider rounded-lg font-inter transition-all text-center shadow shadow-red-500/10"
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

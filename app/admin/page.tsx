'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface Post {
  id: string;
  uid: string;
  displayName: string;
  title: string;
  content: string;
  type: string;
  createdAt: string;
  reports: string[];
  flagged: boolean;
  hidden: boolean;
}

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [flaggedPosts, setFlaggedPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const adminUid = 'AGUsKuZPq7YFBydMnnOnUcFhvdx1';

  // Strict UID Check Guard
  useEffect(() => {
    if (!authLoading) {
      if (!user || user.uid !== adminUid) {
        router.replace('/dashboard');
      }
    }
  }, [user, authLoading, router]);

  // Fetch flagged posts
  const fetchFlaggedPosts = useCallback(async () => {
    if (!user || user.uid !== adminUid) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, 'communityPosts'),
        where('flagged', '==', true)
      );
      const querySnap = await getDocs(q);
      const posts: Post[] = [];

      querySnap.forEach((docSnap) => {
        const data = docSnap.data();
        posts.push({
          id: docSnap.id,
          uid: data.uid,
          displayName: data.displayName || 'Reader',
          title: data.title || 'Untitled',
          content: data.content || '',
          type: data.type || 'original',
          createdAt: data.createdAt?.toDate 
            ? data.createdAt.toDate().toISOString() 
            : (data.createdAt ? new Date(data.createdAt).toISOString() : new Date().toISOString()),
          reports: data.reports || [],
          flagged: data.flagged || false,
          hidden: data.hidden || false,
        });
      });

      // Sort in-memory to avoid compound index overhead
      posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setFlaggedPosts(posts);
    } catch (err) {
      console.error('Error fetching flagged posts:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchFlaggedPosts();
  }, [user, authLoading, fetchFlaggedPosts]);

  // Restore post (flagged: false, hidden: false, reports: [])
  const handleRestorePost = async (postId: string) => {
    try {
      const postRef = doc(db, 'communityPosts', postId);
      await updateDoc(postRef, {
        flagged: false,
        hidden: false,
        reports: [], // Clear violations list to prevent instant re-flagging
      });

      // Remove from state list
      setFlaggedPosts(flaggedPosts.filter((p) => p.id !== postId));
    } catch (err) {
      console.error('Error restoring post:', err);
      alert('Failed to restore post.');
    }
  };

  // Delete post permanently
  const handleDeletePost = async (postId: string) => {
    const confirmDelete = window.confirm('Are you sure you want to permanently delete this post? This action cannot be undone.');
    if (!confirmDelete) return;

    try {
      const res = await fetch('/api/community', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId,
          adminUid,
        }),
      });

      if (!res.ok) throw new Error('Failed to delete post.');

      // Remove from state list
      setFlaggedPosts(flaggedPosts.filter((p) => p.id !== postId));
    } catch (err) {
      console.error('Error deleting post:', err);
      alert((err as Error).message || 'Failed to permanently delete post.');
    }
  };

  if (authLoading || !user || user.uid !== adminUid) {
    return (
      <div className="min-h-screen bg-navy flex items-center justify-center relative z-10">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-t-2 border-gold border-r-2 animate-spin" />
          <span className="font-playfair text-lg text-gold font-medium italic">
            Authenticating moderator access...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-10 w-full min-h-screen pt-28 pb-16 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Top Navigation */}
      <div className="mb-4 text-left">
        <Link
          href="/dashboard"
          className="text-xs text-gold hover:text-gold-light transition-colors inline-flex items-center gap-1 font-inter font-medium"
        >
          ← Back to Dashboard
        </Link>
      </div>

      {/* Heading Group */}
      <div className="text-center md:text-left mb-12 border-b border-white/5 pb-8 space-y-2">
        <h1 className="font-playfair text-4xl sm:text-5xl font-bold text-gold tracking-wide">
          Admin Panel
        </h1>
        <p className="font-playfair italic text-cream/70 text-sm sm:text-base">
          Flagged Community Posts
        </p>
      </div>

      {/* Flagged Posts Feed */}
      {loading ? (
        <div className="py-12 flex justify-center">
          <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
        </div>
      ) : flaggedPosts.length === 0 ? (
        /* Empty State */
        <div className="py-20 text-center space-y-4">
          <span className="text-4xl">🏛️</span>
          <p className="font-playfair text-xl text-gold italic">
            No flagged posts. The community is behaving.
          </p>
        </div>
      ) : (
        /* Flagged Cards List */
        <div className="space-y-6">
          {flaggedPosts.map((post) => {
            const reportCount = post.reports ? post.reports.length : 0;
            const createdDate = new Date(post.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card border-red-500/20 bg-red-950/5 p-6 sm:p-8 rounded-2xl relative overflow-hidden flex flex-col justify-between gap-6 shadow-xl"
              >
                {/* Visual red/gold warning border on left */}
                <div className="absolute top-0 left-0 bottom-0 w-[4px] bg-red-500" />

                {/* Top Metas Row */}
                <div className="flex justify-between items-start w-full">
                  <div className="space-y-1">
                    <span className="font-inter text-xs text-gold font-bold">
                      Author: {post.displayName} (UID: {post.uid})
                    </span>
                    <p className="text-[10px] text-cream/40 font-inter">
                      Scribed on {createdDate} • Type: <span className="uppercase text-cream/60">{post.type}</span>
                    </p>
                  </div>
                  
                  {/* Danger Violations count badge */}
                  <span className="px-3 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg text-[10px] font-bold uppercase tracking-wider font-inter">
                    🚩 {reportCount} Reports
                  </span>
                </div>

                {/* Content details block */}
                <div className="space-y-3">
                  <h3 className="font-playfair text-lg sm:text-xl font-bold text-cream">
                    {post.title}
                  </h3>
                  <div className="p-4 bg-white/5 border border-white/5 rounded-xl font-inter text-xs sm:text-sm text-cream/80 leading-relaxed whitespace-pre-wrap text-justify">
                    {post.content}
                  </div>
                </div>

                {/* Action Buttons Toolbar */}
                <div className="flex gap-4 border-t border-white/5 pt-4">
                  <button
                    onClick={() => handleRestorePost(post.id)}
                    className="flex-1 py-2.5 bg-gold hover:bg-gold-light text-navy text-xs font-bold uppercase tracking-wider rounded-xl transition-all font-inter text-center shadow shadow-gold/10"
                  >
                    🛡️ Restore Post
                  </button>
                  <button
                    onClick={() => handleDeletePost(post.id)}
                    className="flex-grow py-2.5 bg-red-950/40 hover:bg-red-600 border border-red-500/30 hover:border-transparent text-red-400 hover:text-cream text-xs font-bold uppercase tracking-wider rounded-xl transition-all font-inter text-center shadow"
                  >
                    🗑️ Delete Permanently
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

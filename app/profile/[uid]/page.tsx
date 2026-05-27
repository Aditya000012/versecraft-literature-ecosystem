'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';

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
  followers?: string[];
  following?: string[];
}

export default function PublicProfilePage() {
  const { uid } = useParams();
  const profileUid = uid as string;
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Follow/unfollow in progress state
  const [followSubmitting, setFollowSubmitting] = useState(false);

  // Modal States
  const [activeModal, setActiveModal] = useState<'followers' | 'following' | null>(null);
  const [modalUsers, setModalUsers] = useState<{ uid: string; displayName: string }[]>([]);
  const [loadingModal, setLoadingModal] = useState(false);

  // Format Date Helper
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

  // Fetch Public Profile details and literary works
  useEffect(() => {
    if (!profileUid) return;

    const fetchPublicProfile = async () => {
      setLoadingData(true);
      setErrorMsg('');
      try {
        const userRef = doc(db, 'users', profileUid);
        const docSnap = await getDoc(userRef);
        
        if (!docSnap.exists()) {
          setErrorMsg('This author could not be found.');
          setLoadingData(false);
          return;
        }

        const data = docSnap.data() as ProfileData;
        setProfileData({
          ...data,
          followers: data.followers || [],
          following: data.following || [],
        });

        // Fetch works
        const q = query(
          collection(db, 'communityPosts'),
          where('uid', '==', profileUid),
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

        // Sort by createdAt descending
        fetchedPosts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setPosts(fetchedPosts);
      } catch (err) {
        console.error('Error fetching public profile:', err);
        setErrorMsg('Failed to consult archives.');
      } finally {
        setLoadingData(false);
      }
    };

    fetchPublicProfile();
  }, [profileUid]);

  // Protect page: require user to be logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth?mode=login');
    }
  }, [user, authLoading, router]);

  if (authLoading || loadingData) {
    return (
      <div className="min-h-screen bg-[#F8F4E9] flex items-center justify-center relative z-10">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-t-2 border-[#1a1a1a] border-r-2 animate-spin" />
          <span className="font-playfair text-lg text-[#1a1a1a] font-medium italic">Consulting the archives...</span>
        </div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-[#F8F4E9] flex flex-col items-center justify-center relative z-10 pt-20 px-4">
        <div className="bg-white border border-[rgba(26,26,26,0.1)] p-8 rounded-xl max-w-md text-center shadow-lg">
          <span className="text-3xl block mb-3">🕯️</span>
          <h2 className="font-playfair text-lg text-[#1a1a1a] font-bold mb-2">Author Not Found</h2>
          <p className="font-inter text-xs text-[#1a1a1a]/60 mb-6">{errorMsg}</p>
          <Link
            href="/community"
            className="px-6 py-2.5 bg-[#1a1a1a] hover:bg-[#2d2d2d] text-white font-bold rounded-xl text-xs font-inter transition-all inline-block"
          >
            ← Return to Sanctuary
          </Link>
        </div>
      </div>
    );
  }

  const isSelf = user?.uid === profileUid;
  const isFollowing = user ? (profileData?.followers || []).includes(user.uid) : false;

  const handleFollowToggle = async () => {
    if (!user || isSelf || followSubmitting) return;

    setFollowSubmitting(true);
    const action = isFollowing ? 'unfollow' : 'follow';
    try {
      const res = await fetch('/api/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          followerUid: user.uid,
          targetUid: profileUid,
        }),
      });

      if (!res.ok) throw new Error('Follow action failed.');

      // Update local state immediately
      setProfileData((prev) => {
        if (!prev) return null;
        const followers = prev.followers || [];
        return {
          ...prev,
          followers: isFollowing
            ? followers.filter((id) => id !== user.uid)
            : [...followers, user.uid],
        };
      });
    } catch (err) {
      console.error(err);
      alert('Failed to process follow request.');
    } finally {
      setFollowSubmitting(false);
    }
  };

  return (
    <div className="relative z-10 w-full min-h-screen bg-[#F8F4E9] pt-28 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-12">
        {/* Back Link */}
        <div className="text-left mb-2">
          <Link
            href="/community"
            className="text-xs text-[#1a1a1a]/60 hover:text-[#1a1a1a] hover:underline transition-all inline-flex items-center gap-1 font-inter font-medium"
          >
            ← Back to Community
          </Link>
        </div>

        {/* Public Profile Header Card */}
        <div className="bg-white border border-[rgba(26,26,26,0.1)] p-8 sm:p-10 rounded-2xl flex flex-col items-center text-center space-y-6 shadow-sm">
          {/* Avatar Circle */}
          <div className="w-24 h-24 rounded-full bg-[#F8F4E9] border border-[rgba(26,26,26,0.1)] flex items-center justify-center text-[#1a1a1a] shadow-inner">
            <span className="font-playfair text-4xl font-bold uppercase">
              {(profileData?.displayName || 'A').charAt(0)}
            </span>
          </div>

          {/* Info */}
          <div className="space-y-2">
            <h1 className="font-playfair text-3xl font-bold text-[#1a1a1a]">
              {profileData?.displayName || 'Anonymous Author'}
            </h1>
            <p className="text-xs text-[#1a1a1a]/50 font-inter font-medium tracking-wide">
              MEMBER SINCE {formatMemberSince(profileData?.createdAt).toUpperCase()}
            </p>
          </div>

          {/* Follow / Edit Button */}
          <div>
            {isSelf ? (
              <Link
                href="/profile"
                className="px-6 py-2.5 bg-[#1a1a1a] hover:bg-[#2d2d2d] text-white font-bold rounded-xl text-xs font-inter transition-all shadow-sm block"
              >
                🖋️ Edit Profile
              </Link>
            ) : (
              <button
                onClick={handleFollowToggle}
                disabled={followSubmitting}
                className="px-8 py-2.5 bg-[#1a1a1a] hover:bg-[#2d2d2d] text-white font-bold rounded-xl text-xs font-inter transition-all shadow-sm disabled:opacity-50"
              >
                {isFollowing ? '🤝 Unfollow' : '✨ Follow'}
              </button>
            )}
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-8 pt-6 border-t border-[rgba(26,26,26,0.06)] w-full max-w-md">
            <div className="text-center">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#1a1a1a]/50 font-inter block">Works</span>
              <span className="font-playfair text-xl font-bold text-[#1a1a1a] block mt-1">
                {posts.length}
              </span>
            </div>

            <button
              onClick={() => setActiveModal('followers')}
              className="text-center group focus:outline-none"
            >
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#1a1a1a]/50 group-hover:text-[#1a1a1a] font-inter block transition-colors">Followers</span>
              <span className="font-playfair text-xl font-bold text-[#1a1a1a] group-hover:underline block mt-1">
                {profileData?.followers?.length || 0}
              </span>
            </button>

            <button
              onClick={() => setActiveModal('following')}
              className="text-center group focus:outline-none"
            >
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#1a1a1a]/50 group-hover:text-[#1a1a1a] font-inter block transition-colors">Following</span>
              <span className="font-playfair text-xl font-bold text-[#1a1a1a] group-hover:underline block mt-1">
                {profileData?.following?.length || 0}
              </span>
            </button>
          </div>
        </div>

        {/* Literary Works Grid */}
        <div className="space-y-6">
          <div className="pb-3 border-b border-[rgba(26,26,26,0.1)]">
            <h2 className="font-playfair text-2xl font-bold text-[#1a1a1a]">
              📜 Literary Works
            </h2>
          </div>

          {posts.length === 0 ? (
            <div className="py-16 text-center">
              <p className="font-playfair text-lg text-[#1a1a1a]/40 italic">
                No works shared yet.
              </p>
            </div>
          ) : (
            <div className="columns-1 md:columns-2 gap-6 space-y-6 [column-fill:_balance] w-full">
              {posts.map((post) => (
                <div
                  key={post.id}
                  className="bg-white border border-[rgba(26,26,26,0.1)] p-6 sm:p-8 rounded-2xl space-y-4 hover:border-[rgba(26,26,26,0.2)] transition-all inline-block w-full break-inside-avoid shadow-sm"
                >
                  <div className="flex justify-between items-center w-full">
                    <span className="font-inter text-xs text-[#1a1a1a]/60 font-bold">
                      🖋️ {post.displayName}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider font-inter bg-[#1a1a1a]/5 text-[#1a1a1a]">
                      {post.type}
                    </span>
                  </div>

                  <h3 className="font-playfair text-lg font-bold text-[#1a1a1a] leading-snug">
                    {post.title}
                  </h3>

                  <p className="font-inter text-xs sm:text-sm text-[#1a1a1a]/85 leading-relaxed text-justify whitespace-pre-wrap">
                    {post.content}
                  </p>

                  <div className="flex justify-between items-center pt-3 border-t border-[rgba(26,26,26,0.06)] w-full text-xs text-[#1a1a1a]/60">
                    <span>❤️ {post.likes?.length || 0} Likes</span>
                    <span>💬 {post.comments?.length || 0} Comments</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Followers / Following Clickable Modal */}
      <AnimatePresence>
        {activeModal && (
          <div className="fixed inset-0 bg-[#1a1a1a]/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-[rgba(26,26,26,0.1)] rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative"
            >
              {/* Close button */}
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
    </div>
  );
}

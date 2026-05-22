'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

function AuthPageContent() {
  const { signIn, signUp, signInWithGoogle, user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Detect if url specifies login or signup specifically
  const initialMode = searchParams.get('mode') === 'signup' ? false : true;
  const [isLogin, setIsLogin] = useState(initialMode);
  
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Sync mode state with query parameters
  useEffect(() => {
    const mode = searchParams.get('mode');
    if (mode === 'signup') {
      setIsLogin(false);
    } else if (mode === 'login') {
      setIsLogin(true);
    }
  }, [searchParams]);

  // If user is already logged in, redirect them to dashboard
  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  const handleCreateUserProfile = async (uid: string, userEmail: string, userDisplayName: string) => {
    try {
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);
      
      // If the document doesn't exist, create it with all the required initial fields
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          displayName: userDisplayName || userEmail.split('@')[0] || 'Reader',
          email: userEmail,
          createdAt: serverTimestamp(),
          timeSpent: 0,
          preferences: {},
          interestedGenres: [],
          interestedEras: [],
          wishlist: [],
          anthology: []
        });
      }
    } catch (err) {
      console.error('Error creating user profile in Firestore:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all required fields.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (!isLogin && !displayName.trim()) {
      setError('Please tell us your name.');
      return;
    }

    setAuthLoading(true);

    try {
      if (isLogin) {
        // Log in existing user
        await signIn(email.trim(), password);
        router.push('/dashboard');
      } else {
        // Sign up new user
        await signUp(email.trim(), password);
        // Wait briefly for firebase auth state propagation to get the user credentials
        // The contexts/AuthContext.tsx does createUserWithEmailAndPassword
        // In the next tick, useAuth user is updated.
        // We will create the profile document right inside this try block
        // by utilizing a temporary wait or relying on firebase auth current state.
        // Since Firebase's Auth provider handles authentication, the currentUser is accessible.
        // Better yet: contexts/AuthContext.tsx does not return the credentials.
        // But we can listen in a useEffect or we can create it as soon as the auth state updates!
        // Let's check: if 'user' state updates, and we are in Sign Up mode, we create the profile!
        // To coordinate this cleanly: we can store a signup flag in localStorage or sessionStorage
        // when they click 'Create Account'. When the auth state listener in AuthContext sets the user,
        // if the session flag is present, we create the Firestore profile and clear the flag.
        // This is incredibly robust, foolproof, and covers both credentials and Google sign ups!
        sessionStorage.setItem('versecraft_signup_flow', isLogin ? 'false' : 'true');
        sessionStorage.setItem('versecraft_signup_name', displayName.trim());
      }
    } catch (err: unknown) {
      const errorObj = err as Error & { code?: string };
      console.error('Credentials Authentication Error:', errorObj);
      // Clean up readable messages
      if (errorObj.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists.');
      } else if (errorObj.code === 'auth/invalid-credential' || errorObj.code === 'auth/wrong-password' || errorObj.code === 'auth/user-not-found') {
        setError('Invalid email or password. Please try again.');
      } else {
        setError(errorObj.message || 'Authentication failed. Please check your inputs.');
      }
      setAuthLoading(false);
    }
  };

  const handleGoogleSignInClick = async () => {
    setError('');
    setAuthLoading(true);
    try {
      sessionStorage.setItem('versecraft_signup_flow', 'google');
      await signInWithGoogle();
      router.push('/dashboard');
    } catch (err: unknown) {
      const errorObj = err as Error;
      console.error('Google Auth Error:', errorObj);
      setError(errorObj.message || 'Google Sign In failed.');
      setAuthLoading(false);
    }
  };

  // Watch for auth success to perform upsert profile document
  useEffect(() => {
    if (user) {
      const isSignupFlow = sessionStorage.getItem('versecraft_signup_flow');
      const signupName = sessionStorage.getItem('versecraft_signup_name') || user.displayName || '';
      
      if (isSignupFlow === 'true' || isSignupFlow === 'google') {
        handleCreateUserProfile(user.uid, user.email || '', signupName);
      } else {
        // Standard check: even on login, verify if a profile doc exists, if not, upsert it
        handleCreateUserProfile(user.uid, user.email || '', user.displayName || '');
      }
      
      // Clean up session storage
      sessionStorage.removeItem('versecraft_signup_flow');
      sessionStorage.removeItem('versecraft_signup_name');
      
      router.push('/dashboard');
    }
  }, [user, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-navy flex items-center justify-center relative z-10">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-t-2 border-gold border-r-2 animate-spin" />
          <span className="font-playfair text-lg text-gold font-medium italic">Stepping into the library...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative z-10 py-24">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md"
      >
        <div className="glass-card p-8 sm:p-10 rounded-2xl border border-white/5 shadow-2xl relative overflow-hidden">
          {/* Subtle glow border */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-gold/40 to-transparent" />

          <Link href="/" className="block text-center mb-8 group">
            <h1 className="font-playfair text-4xl font-bold text-gold tracking-wide transition-colors group-hover:text-gold-light">
              Versecraft
            </h1>
            <p className="font-inter text-[10px] text-cream/40 uppercase tracking-widest mt-1">
              Your Literary Companion
            </p>
          </Link>

          {/* Toggle Tab */}
          <div className="flex bg-navy-dark/60 p-1 rounded-lg border border-white/5 mb-6 relative">
            <button
              onClick={() => {
                setIsLogin(true);
                setError('');
                router.replace('/auth?mode=login');
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-md font-inter transition-all duration-300 ${
                isLogin ? 'bg-gold text-navy shadow-md shadow-gold/10' : 'text-cream/50 hover:text-cream'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setIsLogin(false);
                setError('');
                router.replace('/auth?mode=signup');
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-md font-inter transition-all duration-300 ${
                !isLogin ? 'bg-gold text-navy shadow-md shadow-gold/10' : 'text-cream/50 hover:text-cream'
              }`}
            >
              Create Account
            </button>
          </div>

          <h2 className="font-playfair text-2xl font-bold text-center text-cream mb-6">
            {isLogin ? 'Welcome Back, Muse' : 'Enlist as a Reader'}
          </h2>

          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-red-950/20 border border-red-900/30 text-red-400 px-4 py-2.5 rounded-lg text-xs mb-4 text-center"
            >
              {error}
            </motion.div>
          )}

          {/* Google Sign In */}
          <button
            onClick={handleGoogleSignInClick}
            disabled={authLoading}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-100 text-slate-900 py-3 rounded-lg hover:shadow-lg transition-all font-semibold text-xs tracking-wider uppercase font-inter disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/5"></div>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-widest">
              <span className="px-3 bg-[#080815] text-cream/40 rounded-full font-bold">Or</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="popLayout">
              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <label className="block text-xs font-semibold text-cream/70 mb-1.5 font-inter">
                    Your Name
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required={!isLogin}
                    className="w-full px-4 py-3 text-sm rounded-lg outline-none glass-input"
                    placeholder="e.g. Victor Hugo"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label className="block text-xs font-semibold text-cream/70 mb-1.5 font-inter">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 text-sm rounded-lg outline-none glass-input"
                placeholder="you@sanctuary.com"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-cream/70 mb-1.5 font-inter">
                Secret Phrase (Password)
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 text-sm rounded-lg outline-none glass-input"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full bg-gold hover:bg-gold-light text-navy py-3 rounded-lg transition-all font-bold text-xs tracking-wider uppercase font-inter shadow-md shadow-gold/10 hover:shadow-gold/20 hover:-translate-y-0.5 disabled:opacity-50"
            >
              {authLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-3.5 h-3.5 border-2 border-navy border-t-transparent rounded-full animate-spin" />
                  Processing...
                </div>
              ) : isLogin ? (
                'Cross Threshold'
              ) : (
                'Enlist / Register'
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-navy flex items-center justify-center relative z-10">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-t-2 border-gold border-r-2 animate-spin" />
          <span className="font-playfair text-lg text-gold font-medium italic">Crossing threshold...</span>
        </div>
      </div>
    }>
      <AuthPageContent />
    </Suspense>
  );
}

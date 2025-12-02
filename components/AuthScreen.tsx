
import React, { useState, useEffect } from 'react';
import { auth, googleProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification, AuthError, db } from '../firebaseConfig';
import { Button } from './Button';
import { doc, getDoc, Timestamp, writeBatch } from 'firebase/firestore';

interface Props {
  onSuccess: (shouldVerify: boolean) => void;
}

const AuthScreen: React.FC<Props> = ({ onSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [domainError, setDomainError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    setDomainError(null);
  }, [isLogin]);

  const handleAuthError = (err: any) => {
    console.error("Auth Error:", err);
    setLoading(false);
    
    if (err.code === 'auth/unauthorized-domain') {
        setDomainError(window.location.hostname);
        setError(null); 
        return;
    }

    let msg = "Authentication failed.";
    if (err.code === 'auth/popup-closed-by-user') msg = "Sign-in popup was closed.";
    if (err.code === 'auth/cancelled-popup-request') msg = "Popup request cancelled.";
    if (err.code === 'auth/popup-blocked') msg = "Popup was blocked. Please allow popups.";
    if (err.code === 'auth/invalid-email') msg = "Invalid email address.";
    if (err.code === 'auth/wrong-password') msg = "Incorrect password.";
    if (err.code === 'auth/email-already-in-use') msg = "Email already in use.";
    if (err.code === 'auth/weak-password') msg = "Password should be at least 6 characters.";
    if (err.code === 'auth/network-request-failed') msg = "Network error. Check your connection.";
    
    setError(msg);
  };

  const initUserDB = async (user: any) => {
      console.log("Initializing DB for:", user.uid);
      try {
          const batch = writeBatch(db);
          let changesMade = false;

          // 1. Check User Profile
          const userRef = doc(db, 'users', user.uid);
          // Use try-catch for individual reads to avoid permission errors blocking the whole flow
          let userExists = false;
          try {
             const userSnap = await getDoc(userRef);
             userExists = userSnap.exists();
          } catch (e) { console.log("User doc check failed (likely new user)", e); }

          if (!userExists) {
              console.log("Creating new user profile doc...");
              batch.set(userRef, {
                  user_id: user.uid,
                  name: user.displayName || user.email?.split('@')[0] || 'User',
                  email: user.email || '',
                  city: "Unknown", // Triggers Onboarding Flow
                  gender: "Not Set",
                  occupation: "Not Set",
                  height: "0",
                  weight: "0",
                  bodyShape: "Not Set",
                  skinTone: 1,
                  avatarImage: "",
                  updatedAt: Timestamp.now()
              });
              changesMade = true;
          }

          // 2. Check Subscription
          const subRef = doc(db, 'subscriptions', user.uid);
          let subExists = false;
          try {
              const subSnap = await getDoc(subRef);
              subExists = subSnap.exists();
          } catch (e) { console.log("Sub doc check failed (likely new user)", e); }

          if (!subExists) {
              console.log("Creating new subscription doc...");
              batch.set(subRef, {
                  user_id: user.uid,
                  planType: 'Free',
                  priceTier: 0,
                  tokens: 50,
                  tryOnLimit: 2,
                  tryOnUsed: 0,
                  hasPremiumFeatures: false,
                  updatedAt: Timestamp.now()
              });
              changesMade = true;
          }
          
          if (changesMade) {
              await batch.commit();
              console.log("DB Initialization Complete.");
          } else {
              console.log("User Data already exists.");
          }
      } catch (dbErr) {
          console.error("Failed to initialize DB schema:", dbErr);
          // Don't block login on DB error, allow App.tsx to handle fallback or retry
      }
  };

  const handleGoogleSignIn = async () => {
    console.log("Initiating Google Sign In...");
    setLoading(true);
    setError(null);
    setDomainError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      console.log("Google Sign In Successful:", result.user.uid);
      
      await initUserDB(result.user);

      // Google Sign-In is trusted. Never show email verification.
      onSuccess(false); 
    } catch (err: any) {
      handleAuthError(err);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
        setError("Please fill in all fields.");
        return;
    }

    setLoading(true);
    setError(null);
    setDomainError(null);

    try {
      if (isLogin) {
        console.log("Attempting Login...");
        await signInWithEmailAndPassword(auth, email, password);
        console.log("Login Successful");
        // Check DB just in case (e.g. legacy users)
        if (auth.currentUser) await initUserDB(auth.currentUser);
        
        onSuccess(false);
      } else {
        console.log("Attempting Account Creation...");
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        console.log("User Created:", user.uid);

        await initUserDB(user);

        console.log("Waiting for user propogation...");
        // SHORT DELAY: Ensures Firebase backend is ready for the email trigger
        await new Promise(resolve => setTimeout(resolve, 1000));

        console.log("Attempting to send verification email to:", user.email);
        try {
            const actionCodeSettings = {
                url: window.location.origin, // Redirect back to app after verification
                handleCodeInApp: true,
            };
            await sendEmailVerification(user, actionCodeSettings);
            console.log("Verification Email Sent Successfully!");
        } catch (emailError: any) {
            console.error("Verification Email FAILED:", emailError);
            if (emailError.code === 'auth/unauthorized-domain') {
                 setDomainError(window.location.hostname);
                 alert("Account created, but verification email blocked by domain settings.");
            }
        }
        // Signup REQUIRES verification UI flow
        onSuccess(true);
      }
    } catch (err: any) {
      handleAuthError(err);
    }
  };

  const isLocalIp = domainError === '127.0.0.1';

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-neon/20 rounded-full blur-[100px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[100px]"></div>
      </div>

      <div className="w-full max-w-md bg-card/80 backdrop-blur-xl border border-gray-800 p-8 rounded-3xl shadow-2xl relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">TryKaro<span className="text-neon">.ai</span></h1>
            <p className="text-gray-400">Your Personal AI Wardrobe & Virtual Stylist</p>
        </div>

        {domainError && (
            <div className="bg-red-900/40 border border-red-500 p-4 rounded-xl mb-6 text-left shadow-lg shadow-red-900/20 animate-in shake">
                <div className="flex items-center gap-2 mb-2 text-red-400 font-bold">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    Configuration Error
                </div>
                
                {isLocalIp ? (
                    <div className="text-sm text-white space-y-2">
                        <p>You are accessing the app via <strong>127.0.0.1</strong>.</p>
                        <p className="text-gray-300">Firebase typically authorizes <strong>localhost</strong> by default, but not the IP address.</p>
                        <div className="bg-black/50 p-2 rounded text-neon font-mono text-xs border border-neon/30">
                            Try changing the URL in your browser to <strong>localhost</strong> instead of 127.0.0.1
                        </div>
                    </div>
                ) : (
                    <>
                        <p className="text-xs text-gray-300 mb-3">
                            Firebase blocked this request because the current domain is not authorized.
                        </p>
                        <div className="bg-black/60 p-2 rounded text-xs font-mono text-neon mb-3 border border-white/10 break-all select-all">
                            {domainError}
                        </div>
                        <p className="text-[10px] text-gray-400">
                            <strong>Fix:</strong> Go to Firebase Console &gt; Authentication &gt; Settings &gt; Authorized Domains and click "Add Domain". Paste the domain above.
                        </p>
                    </>
                )}
            </div>
        )}

        <button 
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full bg-white text-black font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-3 hover:bg-gray-100 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed mb-6"
        >
            <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
                <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"/>
                <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"/>
                <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.769 -21.864 51.959 -21.864 51.129 C -21.864 50.299 -21.734 49.489 -21.484 48.729 L -21.484 45.639 L -25.464 45.639 C -26.284 47.269 -26.754 49.129 -26.754 51.129 C -26.754 53.129 -26.284 54.989 -25.464 56.619 L -21.484 53.529 Z"/>
                <path fill="#EA4335" d="M -14.754 43.769 C -12.984 43.769 -11.404 44.379 -10.154 45.579 L -6.734 42.159 C -8.804 40.229 -11.514 39.009 -14.754 39.009 C -19.444 39.009 -23.494 41.709 -25.464 45.639 L -21.484 48.729 C -20.534 45.879 -17.884 43.769 -14.754 43.769 Z"/>
                </g>
            </svg>
            Continue with Google
        </button>

        <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-gray-800"></div>
            <span className="text-gray-500 text-xs uppercase">Or with email</span>
            <div className="flex-1 h-px bg-gray-800"></div>
        </div>

        <form onSubmit={handleEmailAuth} className="space-y-4">
            <div>
                <input 
                    type="email" 
                    placeholder="Email address" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-white focus:border-neon outline-none transition-colors"
                />
            </div>
            <div>
                <input 
                    type="password" 
                    placeholder="Password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-white focus:border-neon outline-none transition-colors"
                />
            </div>
            
            {error && (
                <div className="text-red-400 text-xs text-center p-2 bg-red-900/20 rounded-lg border border-red-900/50">
                    {error}
                </div>
            )}

            <Button fullWidth isLoading={loading} type="submit">
                {isLogin ? 'Sign In' : 'Create Account'}
            </Button>
        </form>

        <div className="mt-6 text-center">
            <p className="text-gray-400 text-sm">
                {isLogin ? "Don't have an account?" : "Already have an account?"}
                <button 
                    onClick={() => {
                        setIsLogin(!isLogin);
                        setError(null);
                        setDomainError(null);
                    }} 
                    className="text-neon font-bold ml-2 hover:underline"
                >
                    {isLogin ? 'Sign Up' : 'Log In'}
                </button>
            </p>
        </div>
      </div>
      
      <p className="text-gray-600 text-xs mt-8 relative z-10">By continuing, you agree to our Terms & Privacy Policy.</p>
    </div>
  );
};

export default AuthScreen;

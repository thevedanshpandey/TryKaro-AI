
import React, { useState, useEffect } from 'react';
import { User, sendEmailVerification, auth } from '../firebaseConfig';
import { Button } from './Button';

interface Props {
  user: User;
  onSignOut: () => void;
  onCheckVerified: (silent?: boolean) => void;
  onSkip?: () => void;
}

export const VerifyEmail: React.FC<Props> = ({ user, onSignOut, onCheckVerified, onSkip }) => {
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDomainHelp, setShowDomainHelp] = useState(false);

  // Auto-poll verification status every 3 seconds
  useEffect(() => {
    const intervalId = setInterval(async () => {
        try {
            await user.reload();
            if (user.emailVerified) {
                onCheckVerified(true); // Silent check
            }
        } catch (e) {
            console.log("Polling error:", e);
        }
    }, 3000);

    return () => clearInterval(intervalId);
  }, [user, onCheckVerified]);

  const handleSendEmail = async () => {
      setLoading(true);
      setError('');
      setShowDomainHelp(false);

      try {
          // Always refetch current user to ensure we have a valid instance with methods
          const currentUser = auth.currentUser;
          if (!currentUser) {
              throw new Error("User session expired. Please log in again.");
          }
          const actionCodeSettings = {
                url: window.location.origin,
                handleCodeInApp: true,
          };
          await sendEmailVerification(currentUser, actionCodeSettings);
          setEmailSent(true);
      } catch (e: any) {
          console.error("Email send error:", e);
          let msg = "Failed to send email.";
          
          if (e.code === 'auth/too-many-requests') msg = "Too many requests. Please wait a moment.";
          if (e.code === 'auth/network-request-failed') msg = "Network error. Check connection.";
          
          if (e.code === 'auth/unauthorized-domain') {
              msg = "Domain unauthorized.";
              setShowDomainHelp(true);
          }
          
          setError(e.message || msg);
      } finally {
          setLoading(false);
      }
  };

  const isLocalIp = window.location.hostname === '127.0.0.1';

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-neon/20 rounded-full blur-[100px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[100px]"></div>
      </div>

      <div className="w-full max-w-md bg-card/95 backdrop-blur-xl border border-gray-800 p-8 rounded-3xl shadow-2xl relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700 text-center">
        <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6 text-neon border border-gray-700 shadow-lg shadow-neon/20">
             <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
        </div>
        
        <h1 className="text-2xl font-bold text-white mb-2">Verify your Email</h1>
        <p className="text-gray-400 mb-6 text-sm">
           We've sent a verification link to your email.<br/>
           <span className="text-white font-bold block mt-2 bg-black/40 py-1 px-3 rounded-lg mx-auto w-fit border border-gray-700">{user.email}</span>
        </p>

        {emailSent && (
            <div className="bg-green-900/30 text-green-400 text-xs p-3 rounded-xl border border-green-900 mb-6 flex items-center gap-2 justify-center animate-in fade-in slide-in-from-top-2">
                <span>✓</span> Link sent! Check your inbox & spam folder.
            </div>
        )}

        {showDomainHelp && (
             <div className="bg-red-900/40 border border-red-500 p-3 rounded-xl mb-4 text-left shadow-lg text-xs">
                 <p className="font-bold text-red-300 mb-1">Configuration Error</p>
                 {isLocalIp ? (
                     <p className="text-gray-300">
                         You are using <strong>127.0.0.1</strong>. Please change your browser URL to <strong>localhost</strong> to fix this.
                     </p>
                 ) : (
                     <p className="text-gray-300">
                         Domain <strong>{window.location.hostname}</strong> is not authorized in Firebase Console.
                     </p>
                 )}
             </div>
        )}

        {error && !showDomainHelp && (
            <div className="bg-red-900/30 text-red-400 text-xs p-3 rounded-xl border border-red-900 mb-6">
                {error}
            </div>
        )}

        <div className="space-y-4">
             <Button fullWidth onClick={() => onCheckVerified(false)}>
                I've Clicked the Link
             </Button>
             
             <div className="flex flex-col gap-2 pt-2">
                 <button 
                    onClick={handleSendEmail} 
                    disabled={loading}
                    className="w-full py-2 text-sm text-gray-400 font-medium hover:text-white hover:underline disabled:opacity-50 transition-colors"
                 >
                    {loading ? 'Sending...' : 'Resend Link'}
                 </button>
                 
                 <button 
                    onClick={onSignOut} 
                    className="w-full py-2 text-xs text-red-400/70 hover:text-red-400 font-bold transition-colors cursor-pointer"
                 >
                     Sign Out
                 </button>
             </div>
        </div>
      </div>
    </div>
  );
};

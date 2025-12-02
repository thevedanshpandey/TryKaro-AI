import React, { useState, useEffect } from 'react';
import { View, UserProfile, GeneratedLook, PdfAnalysisResult, SavedWardrobeItem } from './types';
import { Icons, AD_UNITS } from './constants';
import { LoadingOverlay } from './components/LoadingOverlay';
import { BannerAd, RewardedAd } from './components/AdComponents';
import { saveUserProfileToStorage, loadUserProfileFromStorage, loadUserHistoryFromStorage, deleteWardrobeFromStorage } from './services/storageAdapter';
import { auth, onAuthStateChanged, User, signOut } from './firebaseConfig';
import { VerifyEmail } from './components/VerifyEmail';

// Views
import AuthScreen from './components/AuthScreen';
import Onboarding from './components/Onboarding';
import PasteLinkTryOn from './components/PasteLinkTryOn';
import WardrobeBuilder from './components/WardrobeBuilder';
import DailyOutfit from './components/DailyOutfit';
import Profile from './components/Profile';
import PdfWardrobe from './components/PdfWardrobe';
import SubscriptionScreen from './components/SubscriptionScreen';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [currentView, setCurrentView] = useState<View>(View.ONBOARDING);
  const [loading, setLoading] = useState(true);
  
  // Auth & Verification States
  const [isAuthSuccess, setIsAuthSuccess] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);

  // Ad Reward State
  const [showRewardedAd, setShowRewardedAd] = useState(false);
  const [pendingTokenReward, setPendingTokenReward] = useState(0);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        
        // Safety: If user is verified, suppress modal immediately.
        if (currentUser.emailVerified || currentUser.providerData[0]?.providerId === 'google.com') {
            setShowVerifyModal(false);
        }

        setLoading(true);
        console.log("Auth State Changed: User Logged In", currentUser.uid);
        
        try {
          // STEP 1: LOAD CORE PROFILE (Fast)
          const profile = await loadUserProfileFromStorage(currentUser.uid);
          
          if (profile) {
             console.log("Core Profile loaded:", profile);
             setUserProfile(profile);

             // Check Completeness
             const isProfileComplete = 
                profile.city && profile.city !== "Unknown" && 
                profile.height && profile.height !== "0" &&
                profile.name && profile.name.length > 0;
             
             if (isProfileComplete) {
                 console.log("✅ Profile Complete. -> HOME");
                 setCurrentView(View.HOME);

                 // STEP 2: LOAD HISTORY IN BACKGROUND (Silent)
                 console.log("Triggering background history sync...");
                 loadUserHistoryFromStorage(currentUser.uid).then(history => {
                     console.log("Background history loaded");
                     setUserProfile(prev => prev ? ({ ...prev, ...history }) : null);
                 });

             } else {
                 console.log("⚠️ Profile Incomplete. Checking Plan...");
                 setCurrentView(View.SUBSCRIPTION);
             }
          } else {
            console.log("❌ No profile doc found. -> SUBSCRIPTION (Fallback)");
            const fallbackProfile: UserProfile = {
                name: currentUser.displayName || '',
                city: 'Unknown',
                gender: 'Not Set',
                occupation: 'Not Set',
                height: '0',
                weight: '0',
                bodyShape: 'Not Set',
                skinTone: 1,
                avatarImage: null,
                planType: 'Free',
                priceTier: 0,
                tokens: 50,
                tryOnLimit: 2,
                tryOnUsed: 0,
                hasPremiumFeatures: false
            };
            setUserProfile(fallbackProfile);
            setCurrentView(View.SUBSCRIPTION);
          }
        } catch (error) {
          console.error("Failed to load profile:", error);
          setCurrentView(View.SUBSCRIPTION);
        } finally {
          setLoading(false);
        }
      } else {
        console.log("Auth State Changed: User Logged Out");
        setUserProfile(null);
        setCurrentView(View.ONBOARDING);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleAuthSuccess = (shouldVerify: boolean) => {
    setIsAuthSuccess(true);
    
    // Strict logic: Verification is ONLY for Email/Password SIGNUPS.
    // Google Sign-In and Login existing users always pass false.
    if (shouldVerify) {
        setShowVerifyModal(true);
    } else {
        setShowVerifyModal(false);
    }
  };

  const handlePlanSelection = async (plan: 'Free' | 'Monthly_99' | 'Monthly_299') => {
      if (!user) return;
      
      setLoading(true);
      
      try {
          const baseProfile = userProfile || {
              name: user.displayName || '',
              city: 'Unknown',
              gender: 'Not Set',
              occupation: 'Not Set',
              height: '0',
              weight: '0',
              bodyShape: 'Not Set',
              skinTone: 1,
              avatarImage: null,
              planType: 'Free',
              priceTier: 0,
              tokens: 50,
              tryOnLimit: 2,
              tryOnUsed: 0,
              hasPremiumFeatures: false
          };

          let updatedProfile = { ...baseProfile, planType: plan };
          
          if (plan === 'Free') {
              updatedProfile.priceTier = 0;
              updatedProfile.tokens = 50;
              updatedProfile.tryOnLimit = 2; 
              updatedProfile.hasPremiumFeatures = false;
          } else if (plan === 'Monthly_99') {
              updatedProfile.priceTier = 99;
              updatedProfile.tokens = 0; 
              updatedProfile.tryOnLimit = 20; 
              updatedProfile.hasPremiumFeatures = false; 
          } else if (plan === 'Monthly_299') {
              updatedProfile.priceTier = 299;
              updatedProfile.tokens = 999999; 
              updatedProfile.tryOnLimit = 999999; 
              updatedProfile.hasPremiumFeatures = true; 
          }

          if (plan !== 'Free') {
             await new Promise(resolve => setTimeout(resolve, 1500));
             alert("Payment Successful! Plan Activated.");
          }

          await saveUserProfileToStorage(updatedProfile, user.uid);
          setUserProfile(updatedProfile);

          console.log("Plan selected:", plan, "-> Moving to Onboarding");
          setCurrentView(View.ONBOARDING);
      } catch (e) {
          console.error("Plan selection failed:", e);
          alert("Failed to update plan. Please try again.");
      } finally {
          setLoading(false);
      }
  };

  const handleOnboardingComplete = async (data: UserProfile) => {
    if (!user) return;
    
    // Explicitly cast to UserProfile to ensure types match
    const finalProfile: UserProfile = {
        ...data,
        planType: (userProfile?.planType || 'Free') as 'Free' | 'Monthly_99' | 'Monthly_299',
        priceTier: (userProfile?.priceTier ?? 0) as 0 | 99 | 299,
        tokens: userProfile?.tokens ?? 50,
        tryOnLimit: userProfile?.tryOnLimit ?? 2,
        tryOnUsed: userProfile?.tryOnUsed ?? 0,
        hasPremiumFeatures: userProfile?.hasPremiumFeatures ?? false,
        savedItems: [],
        savedLooks: [],
        wardrobeAnalysis: null
    };

    setUserProfile(finalProfile);
    setCurrentView(View.HOME);
    
    setLoading(true);
    try {
        await saveUserProfileToStorage(finalProfile, user.uid);
        console.log("Profile saved successfully after onboarding.");
    } catch (e) {
        console.error("Failed to save profile:", e);
        alert("Failed to save profile. Please check your connection.");
    } finally {
        setLoading(false);
    }
  };

  const handleSaveLook = async (look: GeneratedLook) => {
    if (!userProfile || !user) return;
    const updatedProfile = { 
      ...userProfile, 
      savedLooks: [look, ...(userProfile.savedLooks || [])] 
    };
    setUserProfile(updatedProfile);
    await saveUserProfileToStorage(updatedProfile, user.uid);
  };

  const handleSaveWardrobeItem = async (item: SavedWardrobeItem) => {
    if (!userProfile || !user) return;
    const updatedProfile = { 
      ...userProfile, 
      savedItems: [item, ...(userProfile.savedItems || [])] 
    };
    setUserProfile(updatedProfile);
    await saveUserProfileToStorage(updatedProfile, user.uid);
  };

  const handleSaveWardrobeAnalysis = async (analysis: PdfAnalysisResult | null) => {
    if (!userProfile || !user) return;
    const updatedProfile = { ...userProfile, wardrobeAnalysis: analysis };
    setUserProfile(updatedProfile);
    await saveUserProfileToStorage(updatedProfile, user.uid);
  };

  const handleDeleteWardrobe = async () => {
      if (!userProfile || !user) return;
      
      setLoading(true);
      try {
          await deleteWardrobeFromStorage(user.uid);
          const updatedProfile = { ...userProfile, wardrobeAnalysis: null };
          setUserProfile(updatedProfile);
      } catch (e) {
          console.error(e);
          alert("Failed to delete wardrobe. Please try again.");
      } finally {
          setLoading(false);
      }
  };

  const handleDeleteItem = async (id: string) => {
      if (!userProfile || !user) return;
      const updatedProfile = {
          ...userProfile,
          savedItems: userProfile.savedItems?.filter(item => item.id !== id)
      };
      setUserProfile(updatedProfile);
      await saveUserProfileToStorage(updatedProfile, user.uid);
  };

  const handleUpdateAvatar = async (newAvatarBase64: string) => {
      if (!userProfile || !user) return;
      const updatedProfile = { ...userProfile, avatarImage: newAvatarBase64 };
      setUserProfile(updatedProfile);
      await saveUserProfileToStorage(updatedProfile, user.uid);
  };

  const handleDeductUsage = async (cost: number) => {
      if (!userProfile || !user) return;
      
      const updatedProfile = { 
          ...userProfile, 
          tokens: userProfile.planType === 'Free' ? userProfile.tokens - cost : userProfile.tokens,
          tryOnUsed: (userProfile.tryOnUsed || 0) + 1 
      };
      
      setUserProfile(updatedProfile);
      saveUserProfileToStorage(updatedProfile, user.uid);
  };

  const handleAdReward = async () => {
      if (!userProfile || !user) return;
      const updatedProfile = { ...userProfile, tokens: userProfile.tokens + pendingTokenReward };
      setUserProfile(updatedProfile);
      await saveUserProfileToStorage(updatedProfile, user.uid);
      alert(`You earned ${pendingTokenReward} tokens!`);
      setPendingTokenReward(0);
      setShowRewardedAd(false);
  };

  const requestFeatureAccess = (view: View) => {
      if (!userProfile) return;

      if (view === View.TRY_ON) {
          setCurrentView(view);
          return;
      }
      
      if (userProfile.hasPremiumFeatures) {
          setCurrentView(view);
      } else {
          alert("🔒 This feature is available in the Monthly Premium Plan (₹299). Upgrade to access unlimited features!");
      }
  };

  const renderContent = () => {
    if (!user) {
        return <AuthScreen onSuccess={handleAuthSuccess} />;
    }

    if (loading) {
        return <LoadingOverlay message="Syncing..." />;
    }

    // Only show verification modal if logic explicitly requested it AND user is NOT google verified
    if (showVerifyModal) {
        return (
            <VerifyEmail 
                user={user} 
                onSignOut={() => signOut(auth)} 
                onCheckVerified={() => {
                    user.reload().then(() => {
                        if (user.emailVerified) {
                            setShowVerifyModal(false);
                        } else {
                            alert("Email not verified yet. Check your inbox!");
                        }
                    });
                }}
            />
        );
    }

    switch (currentView) {
      case View.SUBSCRIPTION:
        return (
            <SubscriptionScreen 
                userProfile={userProfile!} 
                onSelectPlan={handlePlanSelection} 
                isLoading={loading} 
            />
        );
      case View.ONBOARDING:
        return <Onboarding onComplete={handleOnboardingComplete} />;
      case View.HOME:
        const hasValidAvatar = userProfile?.avatarImage && (userProfile.avatarImage.startsWith('data:') || userProfile.avatarImage.startsWith('http'));
        const firstName = userProfile?.name?.split(' ')[0] || "Styler";
        const isPremium = userProfile?.planType === 'Monthly_299';

        return (
          <div className="min-h-screen bg-black text-white font-sans overflow-x-hidden relative selection:bg-neon selection:text-white">
             <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute -top-20 -left-20 w-96 h-96 bg-neon/20 rounded-full blur-[128px] opacity-40 animate-pulse"></div>
                <div className="absolute top-40 right-[-100px] w-72 h-72 bg-blue-600/20 rounded-full blur-[100px] opacity-30"></div>
                <div className="absolute bottom-0 left-20 w-80 h-80 bg-purple-600/10 rounded-full blur-[100px] opacity-30"></div>
             </div>

             <div className="relative z-10 w-full max-w-5xl mx-auto p-5 pb-24 flex flex-col min-h-screen">
                 
                 <div className="flex justify-between items-center mb-6 pt-4 animate-in slide-in-from-top-4 duration-700">
                   <div>
                     <p className="text-gray-400 text-xs tracking-wider uppercase mb-1">Welcome back</p>
                     <h1 className="text-3xl font-bold text-white tracking-tight">
                       Hello, <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon to-purple-400">{firstName}</span>
                     </h1>
                   </div>
                   <div 
                      onClick={() => setCurrentView(View.PROFILE)}
                      className="w-12 h-12 rounded-full p-[2px] bg-gradient-to-tr from-neon to-blue-500 cursor-pointer hover:scale-105 transition-transform shadow-[0_0_20px_rgba(255,42,109,0.3)]"
                   >
                     <div className="w-full h-full rounded-full overflow-hidden bg-black border-2 border-black">
                        {hasValidAvatar ? (
                           <img src={userProfile!.avatarImage!} className="w-full h-full object-cover" alt="Profile" />
                        ) : (
                           <div className="w-full h-full flex items-center justify-center bg-gray-800 text-white font-bold text-lg">
                               {firstName[0]}
                           </div>
                        )}
                     </div>
                   </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div 
                        className={`relative overflow-hidden p-6 rounded-3xl border transition-all duration-300 group
                                    ${isPremium 
                                        ? 'bg-gradient-to-r from-gray-900 via-black to-gray-900 border-neon/50 shadow-[0_0_15px_rgba(255,42,109,0.1)]' 
                                        : 'bg-gradient-to-br from-[#1a1a1a]/90 to-black/90 border-white/10'
                                    }
                                    hover:border-neon/60 hover:shadow-[0_0_25px_rgba(255,42,109,0.2)] hover:scale-[1.01] cursor-default
                        `}
                    >
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none group-hover:bg-neon/10 transition-colors duration-500"></div>
                        
                        <div className="flex justify-between items-center relative z-10 h-full">
                            <div className="flex flex-col justify-center">
                                <p className="text-gray-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                                    Current Plan 
                                    {isPremium && <span className="text-neon bg-neon/10 px-2 py-0.5 rounded-full text-[8px] border border-neon/20">PRO</span>}
                                </p>
                                <h2 className="text-4xl font-black text-white flex items-baseline gap-2 tracking-tight">
                                    {userProfile?.planType === 'Free' ? userProfile.tokens : (userProfile?.planType === 'Monthly_299' ? '∞' : (userProfile?.tryOnLimit || 0) - (userProfile?.tryOnUsed || 0))}
                                    <span className="text-sm font-medium text-gray-400 self-end mb-1 ml-1">
                                        {userProfile?.planType === 'Free' ? 'Tokens' : 'Try-Ons Left'}
                                    </span>
                                </h2>
                            </div>
                            
                            {userProfile?.planType === 'Free' ? (
                                <button 
                                    onClick={() => { setShowRewardedAd(true); setPendingTokenReward(10); }}
                                    className="bg-white/10 text-white text-xs font-bold px-5 py-3 rounded-full hover:bg-neon hover:text-white transition-all border border-white/10 active:scale-95 flex items-center gap-2 backdrop-blur-sm group-hover:bg-white/20"
                                >
                                    <Icons.Video />
                                    <span>+ Free Tokens</span>
                                </button>
                            ) : (
                                <div className="text-right">
                                     <p className="text-xs text-gray-500 font-mono">RENEWAL</p>
                                     <p className="text-sm text-white font-bold">Auto-Active</p>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    {!isPremium && (
                        <div className="hidden md:block">
                            <BannerAd unitId={AD_UNITS.BANNER_HOME} />
                        </div>
                    )}
                 </div>

                 {!isPremium && (
                     <div className="md:hidden">
                        <BannerAd unitId={AD_UNITS.BANNER_HOME} />
                     </div>
                 )}

                 <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                    <span className="w-1 h-6 bg-neon rounded-full"></span>
                    Studio
                 </h3>
                 
                 <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    
                    <div 
                      onClick={() => requestFeatureAccess(View.TRY_ON)}
                      className="md:col-span-8 w-full min-h-[220px] bg-gradient-to-r from-gray-900 to-black rounded-3xl p-8 relative overflow-hidden cursor-pointer group border border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.5)] hover:border-neon/50 transition-all duration-300 flex flex-col justify-between"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-neon/20 via-transparent to-purple-600/10 opacity-60 group-hover:opacity-100 transition-opacity"></div>
                        <div className="absolute right-0 top-0 w-40 h-40 bg-neon/20 blur-[80px] rounded-full"></div>

                        <div className="relative z-10 h-full flex flex-col justify-between">
                            <div className="flex justify-between items-start">
                                <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl text-neon border border-neon/20 shadow-lg group-hover:scale-110 transition-transform duration-300">
                                    <Icons.Camera />
                                </div>
                                <span className="text-[10px] font-bold bg-neon text-black px-2 py-1 rounded-full uppercase tracking-wider">
                                    Featured
                                </span>
                            </div>
                            <div className="mt-8">
                                <h2 className="text-3xl font-bold text-white mb-2 leading-none group-hover:text-neon transition-colors">Virtual Try-On</h2>
                                <p className="text-gray-400 text-sm max-w-xs">Instantly visualize yourself in any outfit.</p>
                            </div>
                        </div>
                    </div>

                    <div className="md:col-span-4 grid grid-cols-2 md:grid-cols-1 gap-4">
                        <div 
                          onClick={() => requestFeatureAccess(View.WARDROBE)}
                          className={`bg-gray-900/60 backdrop-blur-md p-5 rounded-3xl border border-white/5 cursor-pointer hover:border-blue-500/50 transition-all group relative overflow-hidden min-h-[160px] flex flex-col justify-between ${!userProfile?.hasPremiumFeatures ? 'opacity-70 grayscale-[0.5]' : ''}`}
                        >
                            {!userProfile?.hasPremiumFeatures && <div className="absolute top-2 right-2 text-xl">🔒</div>}
                            <div className="absolute -right-4 -top-4 w-20 h-20 bg-blue-500/10 rounded-full blur-xl group-hover:bg-blue-500/20 transition-all"></div>
                            
                            <div className="w-10 h-10 bg-gray-800/80 rounded-xl flex items-center justify-center text-blue-400 border border-white/5 mb-2 group-hover:scale-110 transition-transform">
                                <Icons.Upload />
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-md leading-tight group-hover:text-blue-400 transition-colors">Create My<br/>Wardrobe</h3>
                                <p className="text-[10px] text-gray-400 mt-1">Digitize & Organize</p>
                            </div>
                        </div>

                        <div 
                          onClick={() => requestFeatureAccess(View.DAILY_OUTFIT)}
                          className={`bg-gray-900/60 backdrop-blur-md p-5 rounded-3xl border border-white/5 cursor-pointer hover:border-purple-500/50 transition-all group relative overflow-hidden min-h-[160px] flex flex-col justify-between ${!userProfile?.hasPremiumFeatures ? 'opacity-70 grayscale-[0.5]' : ''}`}
                        >
                            {!userProfile?.hasPremiumFeatures && <div className="absolute top-2 right-2 text-xl">🔒</div>}
                            <div className="absolute -right-4 -top-4 w-20 h-20 bg-purple-500/10 rounded-full blur-xl group-hover:bg-purple-500/20 transition-all"></div>
                            
                            <div className="w-10 h-10 bg-gray-800/80 rounded-xl flex items-center justify-center text-purple-400 border border-white/5 mb-2 group-hover:scale-110 transition-transform">
                                <Icons.Sparkles />
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-md leading-tight group-hover:text-purple-400 transition-colors">Daily<br/>Outfit</h3>
                                <p className="text-[10px] text-gray-400 mt-1">What to wear today?</p>
                            </div>
                        </div>
                    </div>

                    <div 
                        onClick={() => requestFeatureAccess(View.MIX_MATCH)}
                        className={`md:col-span-12 bg-gradient-to-r from-gray-900 to-[#0a1f0a] backdrop-blur-md p-6 rounded-3xl border border-white/5 cursor-pointer hover:border-green-500/50 transition-all group relative overflow-hidden flex items-center justify-between ${!userProfile?.hasPremiumFeatures ? 'opacity-70 grayscale-[0.5]' : ''}`}
                    >
                        {!userProfile?.hasPremiumFeatures && <div className="absolute top-4 right-4 text-xl">🔒</div>}
                        <div className="absolute left-0 top-0 w-full h-full bg-green-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="relative z-10 flex items-center gap-4">
                            <div className="w-14 h-14 bg-gray-800/80 rounded-xl flex items-center justify-center text-green-400 border border-white/5 group-hover:scale-110 transition-transform">
                                <Icons.Shirt />
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-xl group-hover:text-green-400 transition-colors">Smart Shopper</h3>
                                <p className="text-xs text-gray-400">Build your perfect wardrobe plan within your budget</p>
                            </div>
                        </div>
                        <div className="bg-white/5 p-3 rounded-full text-gray-400 group-hover:text-white group-hover:bg-white/10 transition-all">
                             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                        </div>
                    </div>
                 </div>

             </div>
          </div>
        );
      case View.TRY_ON:
        return (
            <PasteLinkTryOn 
                user={userProfile!} 
                onBack={() => setCurrentView(View.HOME)} 
                onSaveLook={handleSaveLook} 
                onDeductUsage={handleDeductUsage} 
            />
        );
      case View.WARDROBE:
        return (
            <PdfWardrobe 
                user={userProfile!} 
                onBack={() => setCurrentView(View.HOME)} 
                onSaveWardrobe={handleSaveWardrobeAnalysis} 
                onSaveLook={handleSaveLook}
                onDeleteWardrobe={handleDeleteWardrobe}
            />
        );
      case View.MIX_MATCH:
        return <WardrobeBuilder onBack={() => setCurrentView(View.HOME)} onSaveItem={handleSaveWardrobeItem} />;
      case View.DAILY_OUTFIT:
        return <DailyOutfit user={userProfile!} onBack={() => setCurrentView(View.HOME)} onCreateWardrobe={() => setCurrentView(View.WARDROBE)} onSaveLook={handleSaveLook} />;
      case View.PROFILE:
        return <Profile 
                  user={userProfile!} 
                  onBack={() => setCurrentView(View.HOME)} 
                  onOpenWardrobe={() => setCurrentView(View.WARDROBE)}
                  onDeleteItem={handleDeleteItem}
                  onSignOut={() => signOut(auth)}
                  onUpdateAvatar={handleUpdateAvatar}
               />;
      default:
        return <div>View Not Found</div>;
    }
  };

  return (
    <>
      {renderContent()}
      
      {showRewardedAd && (
          <RewardedAd 
             unitId={AD_UNITS.REWARDED_VIDEO} 
             onReward={handleAdReward} 
             onClose={() => setShowRewardedAd(false)} 
          />
      )}
    </>
  );
};

export default App;
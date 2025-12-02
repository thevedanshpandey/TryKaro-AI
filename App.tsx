
import React, { useState, useEffect } from 'react';
import { View, UserProfile, GeneratedLook, PdfAnalysisResult, SavedWardrobeItem, WeeklyPlanDay } from './types';
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
import { WeeklyPlanner } from './components/WeeklyPlanner';

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
    
    // Merge the new profile data (name, height, etc) with the existing Subscription data
    // stored in userProfile state from the previous step.
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

  const handleSaveWeeklyPlan = async (plan: WeeklyPlanDay[], time: string | undefined) => {
      if (!userProfile || !user) return;
      const updatedProfile = { ...userProfile, weeklyPlan: plan, notificationTime: time };
      setUserProfile(updatedProfile);
      await saveUserProfileToStorage(updatedProfile, user.uid);
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

    if (showVerifyModal) {
        return (
            <VerifyEmail 
                user={user} 
                onSignOut={() => signOut(auth)} 
                onCheckVerified={(silent) => {
                    user.reload().then(() => {
                        if (user.emailVerified) {
                            setShowVerifyModal(false);
                        } else if (!silent) {
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
          <div className="min-h-screen bg-black text-white font-sans overflow-x-hidden relative selection:bg-neon selection:text-white pb-20">
             {/* Dynamic Background */}
             <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-neon/10 rounded-full blur-[130px] opacity-40 animate-pulse"></div>
                <div className="absolute bottom-[0%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[130px] opacity-40"></div>
             </div>

             <div className="relative z-10 w-full max-w-5xl mx-auto p-5 flex flex-col min-h-screen">
                 
                 {/* Header & Avatar */}
                 <div className="flex justify-between items-center mb-8 pt-4 animate-in slide-in-from-top-4 duration-700">
                   <div>
                     <p className="text-gray-400 text-xs tracking-widest uppercase mb-1">Welcome back</p>
                     <h1 className="text-3xl font-bold text-white tracking-tight">
                       Hey, <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon to-purple-400">{firstName}</span>
                     </h1>
                   </div>
                   <div 
                      onClick={() => setCurrentView(View.PROFILE)}
                      className="w-14 h-14 rounded-full p-[2px] bg-gradient-to-tr from-neon via-purple-500 to-blue-500 cursor-pointer hover:scale-105 transition-transform shadow-[0_0_20px_rgba(255,42,109,0.3)]"
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

                 {/* Stats / Plan Card */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    <div 
                        className={`relative overflow-hidden p-6 rounded-3xl border transition-all duration-300 group
                                    ${isPremium 
                                        ? 'bg-gradient-to-r from-gray-900 via-black to-gray-900 border-neon/50 shadow-[0_0_20px_rgba(255,42,109,0.15)]' 
                                        : 'bg-gradient-to-br from-[#1a1a1a]/90 to-black/90 border-white/10'
                                    }
                                    hover:border-neon/60 hover:scale-[1.01] cursor-default
                        `}
                    >
                        {isPremium && <div className="absolute top-0 right-0 w-64 h-64 bg-neon/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>}
                        
                        <div className="flex justify-between items-center relative z-10 h-full">
                            <div className="flex flex-col justify-center">
                                <p className="text-gray-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                                    Status
                                    {isPremium && <span className="text-black bg-neon px-2 py-0.5 rounded-full text-[9px] font-extrabold shadow-lg shadow-neon/50">PREMIUM</span>}
                                </p>
                                <h2 className="text-4xl font-black text-white flex items-baseline gap-2 tracking-tight">
                                    {userProfile?.planType === 'Free' ? userProfile.tokens : (userProfile?.planType === 'Monthly_299' ? '∞' : (userProfile?.tryOnLimit || 0) - (userProfile?.tryOnUsed || 0))}
                                    <span className="text-sm font-medium text-gray-400 self-end mb-1 ml-1">
                                        {userProfile?.planType === 'Free' ? 'Tokens' : 'Credits'}
                                    </span>
                                </h2>
                            </div>
                            
                            {userProfile?.planType === 'Free' ? (
                                <button 
                                    onClick={() => { setShowRewardedAd(true); setPendingTokenReward(10); }}
                                    className="bg-white/10 text-white text-xs font-bold px-5 py-3 rounded-full hover:bg-neon hover:text-black hover:shadow-[0_0_15px_rgba(255,42,109,0.5)] transition-all border border-white/10 active:scale-95 flex items-center gap-2 backdrop-blur-sm"
                                >
                                    <Icons.Video />
                                    <span>Earn +10</span>
                                </button>
                            ) : (
                                <div className="text-right opacity-80">
                                     <p className="text-xs text-gray-500 font-mono">RENEWS AUTOMATICALLY</p>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    {/* Only show banner on large screens or if not premium */}
                    {!isPremium && (
                        <div className="hidden md:block">
                            <BannerAd unitId={AD_UNITS.BANNER_HOME} />
                        </div>
                    )}
                 </div>
                 
                 {/* Mobile Banner */}
                 {!isPremium && (
                     <div className="md:hidden mb-6">
                        <BannerAd unitId={AD_UNITS.BANNER_HOME} />
                     </div>
                 )}

                 <div className="flex items-center gap-3 mb-5">
                    <span className="w-1.5 h-6 bg-gradient-to-b from-neon to-purple-600 rounded-full"></span>
                    <h3 className="text-white font-bold text-xl tracking-tight">Your Studio</h3>
                 </div>
                 
                 {/* Dashboard Grid - Conditional Layout based on Plan */}
                 <div className="grid grid-cols-2 md:grid-cols-12 gap-4">
                    
                    {/* 1. Try-On Feature (Always prominent for free/mid, standard for Premium) */}
                    <div 
                      onClick={() => requestFeatureAccess(View.TRY_ON)}
                      className={`
                        ${isPremium ? 'col-span-2 md:col-span-4' : 'col-span-2 md:col-span-8'}
                        bg-gradient-to-br from-gray-900 to-black rounded-3xl p-6 relative overflow-hidden cursor-pointer group border border-white/10 shadow-lg hover:border-neon/50 transition-all duration-300 min-h-[200px] flex flex-col justify-between
                      `}
                    >
                        <div className="absolute right-0 top-0 w-32 h-32 bg-neon/10 blur-[60px] rounded-full group-hover:bg-neon/20 transition-all"></div>
                        <div className="relative z-10 flex justify-between items-start">
                            <div className="w-12 h-12 bg-gray-800/80 backdrop-blur-md rounded-2xl flex items-center justify-center text-neon border border-white/10 group-hover:scale-110 transition-transform shadow-lg shadow-black/50">
                                <Icons.Camera />
                            </div>
                        </div>
                        <div className="relative z-10">
                            <h2 className="text-xl font-bold text-white mb-1 group-hover:text-neon transition-colors">Virtual Try-On</h2>
                            <p className="text-xs text-gray-400">Visualize any outfit instantly.</p>
                        </div>
                    </div>

                    {/* 2. Wardrobe (Highlighted for Premium) */}
                    <div 
                      onClick={() => requestFeatureAccess(View.WARDROBE)}
                      className={`
                        ${isPremium ? 'col-span-1 md:col-span-4 bg-gradient-to-b from-blue-900/40 to-black border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.15)]' : 'col-span-1 md:col-span-2 bg-gray-900/60 border-white/5'}
                        backdrop-blur-md p-5 rounded-3xl border cursor-pointer hover:border-blue-400 transition-all group relative overflow-hidden min-h-[180px] flex flex-col justify-between
                        ${!userProfile?.hasPremiumFeatures ? 'opacity-70 grayscale-[0.5]' : ''}
                      `}
                    >
                        {!userProfile?.hasPremiumFeatures && <div className="absolute top-3 right-3 text-lg z-20">🔒</div>}
                        {isPremium && <div className="absolute top-3 right-3 text-[9px] bg-blue-500 text-white px-2 py-0.5 rounded-full font-bold z-20">PRO</div>}
                        
                        <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-blue-600/20 rounded-full blur-2xl group-hover:bg-blue-600/30 transition-all"></div>
                        
                        <div className="w-10 h-10 bg-gray-800/80 rounded-xl flex items-center justify-center text-blue-400 border border-white/5 group-hover:scale-110 transition-transform">
                            <Icons.Upload />
                        </div>
                        <div>
                            <h3 className={`font-bold text-white leading-tight group-hover:text-blue-400 transition-colors ${isPremium ? 'text-lg' : 'text-sm'}`}>
                                My<br/>Wardrobe
                            </h3>
                            <p className="text-[10px] text-gray-400 mt-1 line-clamp-2">Digitize & AI Analyze</p>
                        </div>
                    </div>

                    {/* 3. Daily Outfit (Highlighted for Premium) */}
                    <div 
                      onClick={() => requestFeatureAccess(View.DAILY_OUTFIT)}
                      className={`
                        ${isPremium ? 'col-span-1 md:col-span-4 bg-gradient-to-b from-purple-900/40 to-black border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.15)]' : 'col-span-1 md:col-span-2 bg-gray-900/60 border-white/5'}
                        backdrop-blur-md p-5 rounded-3xl border cursor-pointer hover:border-purple-400 transition-all group relative overflow-hidden min-h-[180px] flex flex-col justify-between
                        ${!userProfile?.hasPremiumFeatures ? 'opacity-70 grayscale-[0.5]' : ''}
                      `}
                    >
                        {!userProfile?.hasPremiumFeatures && <div className="absolute top-3 right-3 text-lg z-20">🔒</div>}
                        {isPremium && <div className="absolute top-3 right-3 text-[9px] bg-purple-500 text-white px-2 py-0.5 rounded-full font-bold z-20">PRO</div>}

                        <div className="absolute -right-10 -top-10 w-32 h-32 bg-purple-600/20 rounded-full blur-2xl group-hover:bg-purple-600/30 transition-all"></div>
                        
                        <div className="w-10 h-10 bg-gray-800/80 rounded-xl flex items-center justify-center text-purple-400 border border-white/5 group-hover:scale-110 transition-transform">
                            <Icons.Sparkles />
                        </div>
                        <div>
                            <h3 className={`font-bold text-white leading-tight group-hover:text-purple-400 transition-colors ${isPremium ? 'text-lg' : 'text-sm'}`}>
                                Daily<br/>Outfit
                            </h3>
                            <p className="text-[10px] text-gray-400 mt-1 line-clamp-2">AI Styling Advice</p>
                        </div>
                    </div>

                    {/* 4. NEW: Weekly Planner (Available to Premium) */}
                    <div 
                        onClick={() => requestFeatureAccess(View.WEEKLY_PLANNER)}
                        className={`
                            ${isPremium ? 'col-span-2 md:col-span-6' : 'col-span-2 md:col-span-12'}
                            bg-gray-900/40 backdrop-blur-md p-5 rounded-3xl border border-white/5 cursor-pointer hover:border-green-400/50 transition-all group relative overflow-hidden flex items-center justify-between
                            ${!userProfile?.hasPremiumFeatures ? 'opacity-70 grayscale-[0.5]' : ''}
                        `}
                    >
                         {!userProfile?.hasPremiumFeatures && <div className="absolute top-4 right-4 text-xl">🔒</div>}
                         <div className="absolute left-0 bottom-0 w-full h-1 bg-gradient-to-r from-transparent via-green-500 to-transparent opacity-50"></div>
                         
                         <div className="flex items-center gap-4">
                             <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center text-green-400 border border-white/5 group-hover:scale-110 transition-transform">
                                 <Icons.Calendar />
                             </div>
                             <div>
                                 <h3 className="font-bold text-white text-lg group-hover:text-green-400 transition-colors">Weekly Planner</h3>
                                 <p className="text-xs text-gray-400">Plan outfits Mon-Sun & Get Reminders</p>
                             </div>
                         </div>
                         <div className="bg-white/5 p-2 rounded-full hidden sm:block">
                             <span className="text-xl">📅</span>
                         </div>
                    </div>

                    {/* 5. Smart Shopper / Mix Match */}
                    <div 
                        onClick={() => requestFeatureAccess(View.MIX_MATCH)}
                        className={`
                             ${isPremium ? 'col-span-2 md:col-span-6' : 'col-span-2 md:col-span-12'}
                             bg-gray-900/40 backdrop-blur-md p-5 rounded-3xl border border-white/5 cursor-pointer hover:border-yellow-400/50 transition-all group relative overflow-hidden flex items-center justify-between
                             ${!userProfile?.hasPremiumFeatures ? 'opacity-70 grayscale-[0.5]' : ''}
                        `}
                    >
                        {!userProfile?.hasPremiumFeatures && <div className="absolute top-4 right-4 text-xl">🔒</div>}
                        
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center text-yellow-400 border border-white/5 group-hover:scale-110 transition-transform">
                                <Icons.Shirt />
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-lg group-hover:text-yellow-400 transition-colors">Smart Shopper</h3>
                                <p className="text-xs text-gray-400">Build a budget wardrobe plan</p>
                            </div>
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
      case View.WEEKLY_PLANNER:
        return <WeeklyPlanner user={userProfile!} onBack={() => setCurrentView(View.HOME)} onSavePlan={handleSaveWeeklyPlan} />;
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
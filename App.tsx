
import React, { useState, useEffect } from 'react';
import { View, UserProfile, GeneratedLook, PdfAnalysisResult, SavedWardrobeItem } from './types';
import { Button } from './components/Button';
import { Icons, AD_UNITS } from './constants';
import { LoadingOverlay } from './components/LoadingOverlay';
import { BannerAd, RewardedAd } from './components/AdComponents';

// Views
import Onboarding from './components/Onboarding';
import PasteLinkTryOn from './components/PasteLinkTryOn';
import WardrobeBuilder from './components/WardrobeBuilder';
import DailyOutfit from './components/DailyOutfit';
import Profile from './components/Profile';
import PdfWardrobe from './components/PdfWardrobe';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.ONBOARDING);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showRewardedAd, setShowRewardedAd] = useState(false);

  // Mock checking for existing user
  useEffect(() => {
    // In a real app, check firebase auth here
    const savedUser = localStorage.getItem('trykaro_user');
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      // Ensure tokens exist for old users
      if (parsed.tokens === undefined) parsed.tokens = 50;
      setUserProfile(parsed);
      setCurrentView(View.HOME);
    }
  }, []);

  const handleOnboardingComplete = (profile: UserProfile) => {
    setUserProfile(profile);
    localStorage.setItem('trykaro_user', JSON.stringify(profile));
    setCurrentView(View.HOME);
  };

  const handleSignOut = () => {
    localStorage.removeItem('trykaro_user');
    setUserProfile(null);
    setCurrentView(View.ONBOARDING);
  };

  const handleUpdateProfile = (updated: Partial<UserProfile>) => {
      if (!userProfile) return;
      const newProfile = { ...userProfile, ...updated };
      setUserProfile(newProfile);
      localStorage.setItem('trykaro_user', JSON.stringify(newProfile));
  };

  const handleSaveLook = (look: GeneratedLook) => {
    if (!userProfile) return;
    const updatedProfile = {
      ...userProfile,
      savedLooks: [look, ...(userProfile.savedLooks || [])]
    };
    handleUpdateProfile(updatedProfile);
  };

  const handleSaveWardrobe = (analysis: PdfAnalysisResult | null) => {
    if (!userProfile) return;
    const updatedProfile = {
      ...userProfile,
      wardrobeAnalysis: analysis
    };
    handleUpdateProfile(updatedProfile);
  };

  const handleSaveWardrobeItem = (item: SavedWardrobeItem) => {
    if (!userProfile) return;
    const existingItems = userProfile.savedItems || [];
    
    // Prevent duplicates based on link
    if (existingItems.some(i => i.link === item.link)) {
        alert("This item is already in your wishlist!");
        return;
    }

    const updatedProfile = {
        ...userProfile,
        savedItems: [item, ...existingItems]
    };
    handleUpdateProfile(updatedProfile);
    alert("Item added to your Wishlist!");
  };

  const handleDeleteWardrobeItem = (id: string) => {
      if (!userProfile || !userProfile.savedItems) return;
      
      const updatedProfile = {
          ...userProfile,
          savedItems: userProfile.savedItems.filter(item => item.id !== id)
      };
      handleUpdateProfile(updatedProfile);
  };

  const handleDeductTokens = (amount: number) => {
      if (!userProfile) return;
      handleUpdateProfile({ tokens: Math.max(0, userProfile.tokens - amount) });
  };

  const handleWatchAd = () => {
      setShowRewardedAd(true);
  };

  const handleAdReward = () => {
      if (!userProfile) return;
      handleUpdateProfile({ tokens: userProfile.tokens + 10 });
      alert("🎉 You earned 10 Tokens!");
  };

  const renderContent = () => {
    switch (currentView) {
      case View.ONBOARDING:
        return <Onboarding onComplete={handleOnboardingComplete} />;
      case View.TRY_ON:
        return userProfile ? (
            <PasteLinkTryOn 
                user={userProfile} 
                onBack={() => setCurrentView(View.HOME)} 
                onSaveLook={handleSaveLook}
                onDeductTokens={handleDeductTokens}
            />
        ) : null;
      case View.WARDROBE:
        return <WardrobeBuilder onBack={() => setCurrentView(View.HOME)} onSaveItem={handleSaveWardrobeItem} />;
      case View.DAILY_OUTFIT:
        return userProfile ? (
            <DailyOutfit 
                user={userProfile} 
                onBack={() => setCurrentView(View.HOME)} 
                onCreateWardrobe={() => setCurrentView(View.PDF_WARDROBE)}
                onSaveLook={handleSaveLook}
            />
        ) : null;
      case View.PROFILE:
        return userProfile ? (
            <Profile 
                user={userProfile} 
                onBack={() => setCurrentView(View.HOME)} 
                onOpenWardrobe={() => setCurrentView(View.PDF_WARDROBE)}
                onDeleteItem={handleDeleteWardrobeItem}
            />
        ) : null;
      case View.PDF_WARDROBE:
        return userProfile ? (
            <PdfWardrobe 
                user={userProfile} 
                onBack={() => setCurrentView(View.HOME)} 
                onSaveWardrobe={handleSaveWardrobe}
                onSaveLook={handleSaveLook}
            />
        ) : null;
      case View.HOME:
      default:
        return (
          <div className="p-4 space-y-6 max-w-md mx-auto pb-32">
            {/* Header */}
            <header className="flex justify-between items-center pt-2">
              <div>
                <h1 className="text-2xl font-bold text-white">Hi, {userProfile?.name}! 👋</h1>
                <p className="text-gray-400 text-xs">Styling you for {userProfile?.city}</p>
              </div>
              
              <div className="flex items-center gap-3">
                  {/* Token Counter */}
                  <div 
                    className="bg-gray-900 border border-gray-700 px-3 py-1.5 rounded-full flex items-center gap-2 cursor-pointer hover:bg-gray-800"
                    onClick={handleWatchAd}
                  >
                      <span className="text-yellow-400 text-sm font-bold">🪙 {userProfile?.tokens}</span>
                      <div className="w-4 h-4 bg-neon rounded-full flex items-center justify-center text-[8px] text-white font-bold">+</div>
                  </div>

                  {/* Avatar */}
                  <div 
                    className="w-10 h-10 rounded-full bg-gray-800 border border-neon overflow-hidden cursor-pointer"
                    onClick={() => setCurrentView(View.PROFILE)}
                  >
                     {userProfile?.avatarImage ? (
                         <img src={userProfile.avatarImage} className="w-full h-full object-cover" alt="avatar"/>
                     ) : (
                         <div className="w-full h-full flex items-center justify-center text-xs">You</div>
                     )}
                  </div>
              </div>
            </header>

            {/* HERO GRID - Highlight Create Wardrobe & Daily Outfit */}
            <div className="grid grid-rows-2 gap-4">
                
                {/* 1. Create My Wardrobe (Large) */}
                <div 
                    onClick={() => setCurrentView(View.PDF_WARDROBE)}
                    className="bg-gradient-to-br from-purple-900/80 to-black border border-purple-500/30 p-6 rounded-2xl relative overflow-hidden group cursor-pointer transition-all hover:scale-[1.02] min-h-[160px]"
                >
                    <div className="absolute right-0 bottom-0 opacity-20 transform translate-x-1/4 translate-y-1/4">
                        <svg width="150" height="150" viewBox="0 0 24 24" fill="currentColor" className="text-purple-400">
                            <path d="M20.38 3.4a2 2 0 0 0-1.2-1.1l-2.19-.55a.5.5 0 0 0-.38.27L15 4H9l-1.6-2a.5.5 0 0 0-.38-.27L4.82 2.3a2 2 0 0 0-1.2 1.1l-2 6a2 2 0 0 0 1.2 2.5l1.18.3v9.7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-9.7l1.18-.3a2 2 0 0 0 1.2-2.5l-2-6Z"/>
                        </svg>
                    </div>
                    <div className="relative z-10">
                        <div className="p-2 bg-purple-500 w-fit rounded-lg mb-3 text-white"><Icons.Upload /></div>
                        <h2 className="text-2xl font-bold text-white leading-tight mb-1">Create My<br/>Wardrobe</h2>
                        <p className="text-purple-200 text-xs mt-2">Upload PDF & get styled instantly</p>
                    </div>
                </div>

                {/* 2. Daily Outfit (Large) */}
                <div 
                    onClick={() => setCurrentView(View.DAILY_OUTFIT)}
                    className="bg-gradient-to-br from-neon/80 to-pink-900 border border-neon/30 p-6 rounded-2xl relative overflow-hidden group cursor-pointer transition-all hover:scale-[1.02] min-h-[160px]"
                >
                    <div className="absolute right-0 bottom-0 opacity-20 transform translate-x-1/4 translate-y-1/4">
                        <svg width="150" height="150" viewBox="0 0 24 24" fill="currentColor" className="text-pink-200">
                             <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                        </svg>
                    </div>
                    <div className="relative z-10">
                        <div className="p-2 bg-white text-neon w-fit rounded-lg mb-3"><Icons.Zap /></div>
                        <h2 className="text-2xl font-bold text-white leading-tight mb-1">Daily Outfit<br/>Suggestion</h2>
                        <p className="text-pink-100 text-xs mt-2">Weather-matched looks for today</p>
                    </div>
                </div>
            </div>

            <h3 className="text-gray-400 font-bold text-sm px-1 uppercase tracking-wider mt-2">Essentials</h3>

            {/* Redesigned Secondary Grid */}
            <div className="grid grid-cols-2 gap-4">
                {/* 3. Link Try-On */}
                <div 
                    onClick={() => setCurrentView(View.TRY_ON)}
                    className="bg-gradient-to-br from-gray-800 to-gray-900 p-5 rounded-2xl border border-gray-700 hover:border-blue-500 cursor-pointer transition-all group overflow-hidden relative h-40 flex flex-col justify-between"
                >
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                         <Icons.Camera />
                    </div>
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-900/50 mb-2">
                        <Icons.Camera />
                    </div>
                    <div>
                        <h3 className="font-bold text-white text-lg">Virtual Try-On</h3>
                        <p className="text-[10px] text-gray-400 mt-1">Paste Link & See Magic</p>
                    </div>
                    <div className="mt-2 text-[10px] bg-black/40 w-fit px-2 py-1 rounded text-blue-300 border border-blue-500/20">
                         25 Tokens
                    </div>
                </div>

                {/* 4. Smart Wardrobe (Shopping) */}
                <div 
                    onClick={() => setCurrentView(View.WARDROBE)}
                    className="bg-gradient-to-br from-gray-800 to-gray-900 p-5 rounded-2xl border border-gray-700 hover:border-green-500 cursor-pointer transition-all group overflow-hidden relative h-40 flex flex-col justify-between"
                >
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                         <Icons.Shirt />
                    </div>
                    <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-green-900/50 mb-2">
                        <Icons.Shirt />
                    </div>
                     <div>
                        <h3 className="font-bold text-white text-lg">Smart Shopper</h3>
                        <p className="text-[10px] text-gray-400 mt-1">Budget Wardrobe Planner</p>
                    </div>
                    <div className="mt-2 text-[10px] bg-black/40 w-fit px-2 py-1 rounded text-green-300 border border-green-500/20">
                         Free
                    </div>
                </div>
            </div>

            {/* Watch Ad Button */}
            {!userProfile?.hasPremium && (
                <div 
                    onClick={handleWatchAd}
                    className="bg-gray-900 p-4 rounded-xl border border-dashed border-gray-700 flex items-center justify-between cursor-pointer hover:bg-gray-800"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-yellow-500/20 text-yellow-500 rounded-lg"><Icons.Video /></div>
                        <div>
                            <p className="font-bold text-white text-sm">Need Tokens?</p>
                            <p className="text-xs text-gray-400">Watch ad to earn 10 tokens</p>
                        </div>
                    </div>
                    <span className="bg-yellow-500 text-black text-xs font-bold px-3 py-1 rounded-full">+10</span>
                </div>
            )}

            {/* Subscription Banner */}
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-4 rounded-xl border border-gray-700 flex items-center justify-between mt-4">
                <div>
                    <p className="font-bold text-white text-sm">TryKaro Premium</p>
                    <p className="text-xs text-gray-400">Unlock unlimited styling</p>
                </div>
                <button className="bg-white text-black text-xs font-bold py-2 px-4 rounded-full">
                    ₹299/mo
                </button>
            </div>
            
            <div className="text-center mt-4 pb-8">
                 <button onClick={handleSignOut} className="text-xs text-gray-600 underline hover:text-white">Sign Out</button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-neon selection:text-white">
      {renderContent()}
      
      {/* Rewarded Ad Overlay */}
      {showRewardedAd && (
          <RewardedAd 
            unitId={AD_UNITS.REWARDED_VIDEO} 
            onReward={handleAdReward} 
            onClose={() => setShowRewardedAd(false)} 
          />
      )}

      {/* Sticky Banner Ad (Global) */}
      {!userProfile?.hasPremium && (
          <BannerAd unitId={AD_UNITS.BANNER_HOME} />
      )}
      
      {/* Sticky Mobile Nav (Visible on Home) */}
      {currentView === View.HOME && (
        <nav className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-lg border-t border-gray-800 p-4 pb-4 flex justify-around z-50 max-w-md mx-auto">
            <button className="text-neon flex flex-col items-center gap-1">
                <Icons.Home />
                <span className="text-[10px]">Home</span>
            </button>
            <button className="text-gray-500 flex flex-col items-center gap-1 hover:text-white" onClick={() => setCurrentView(View.PDF_WARDROBE)}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.38 3.4a2 2 0 0 0-1.2-1.1l-2.19-.55a.5.5 0 0 0-.38.27L15 4H9l-1.6-2a.5.5 0 0 0-.38-.27L4.82 2.3a2 2 0 0 0-1.2 1.1l-2 6a2 2 0 0 0 1.2 2.5l1.18.3v9.7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-9.7l1.18-.3a2 2 0 0 0 1.2-2.5l-2-6Z"/></svg>
                <span className="text-[10px]">Wardrobe</span>
            </button>
            <button className="text-gray-500 flex flex-col items-center gap-1 hover:text-white" onClick={() => setCurrentView(View.PROFILE)}>
                <div className="w-6 h-6 rounded-full border-2 border-gray-600 overflow-hidden">
                     {userProfile?.avatarImage && <img src={userProfile.avatarImage} className="w-full h-full object-cover"/>}
                </div>
                <span className="text-[10px]">Profile</span>
            </button>
        </nav>
      )}
    </div>
  );
};

export default App;

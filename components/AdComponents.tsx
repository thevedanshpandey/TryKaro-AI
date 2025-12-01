
import React, { useState, useEffect } from 'react';
import { Icons } from '../constants';

// Fixed Bottom Banner Ad
export const BannerAd: React.FC<{ unitId: string }> = ({ unitId }) => {
  return (
    <div className="fixed bottom-[60px] left-0 right-0 z-40 bg-[#202124] h-[50px] flex items-center justify-between px-4 border-t border-gray-700 shadow-lg animate-in slide-in-from-bottom-2">
      <div className="flex flex-col">
        <span className="text-[10px] bg-[#fbc02d] text-black font-bold px-1 rounded-sm w-fit">Ad</span>
        <span className="text-[8px] text-gray-400">Google AdMob</span>
      </div>
      <div className="flex-1 text-center">
         <p className="text-[10px] text-gray-300 font-mono">ID: ...{unitId.slice(-8)}</p>
      </div>
      <button className="text-gray-500 hover:text-white">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
      </button>
    </div>
  );
};

// Full Screen Interstitial Ad
export const InterstitialAd: React.FC<{ unitId: string, onClose: () => void }> = ({ unitId, onClose }) => {
  const [canClose, setCanClose] = useState(false);
  const [timeLeft, setTimeLeft] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setCanClose(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center animate-in fade-in duration-300">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center bg-black/50 backdrop-blur-sm">
        <div className="text-white text-xs bg-black/50 px-2 py-1 rounded">Ad</div>
        {canClose ? (
          <button 
            onClick={onClose} 
            className="bg-white/20 hover:bg-white/40 text-white rounded-full p-2 w-8 h-8 flex items-center justify-center font-bold transition-all"
          >
            ✕
          </button>
        ) : (
          <div className="text-gray-400 text-xs font-bold">Close in {timeLeft}s</div>
        )}
      </div>
      
      {/* Content */}
      <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-gradient-to-b from-gray-900 to-black">
          <div className="w-full max-w-sm bg-white text-black p-6 rounded-2xl shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-yellow-400 text-[10px] font-bold px-2 py-1">PROMOTION</div>
              <div className="w-20 h-20 bg-blue-600 rounded-2xl mb-4 flex items-center justify-center text-white text-4xl shadow-lg">
                ⚡
              </div>
              <h3 className="font-bold text-2xl mb-2">TryKaro Premium</h3>
              <p className="text-gray-600 text-sm mb-6">Get unlimited generations, faster processing, and zero ads.</p>
              
              <button className="bg-blue-600 hover:bg-blue-700 text-white w-full py-4 rounded-xl font-bold text-lg shadow-lg transform active:scale-95 transition-all">
                Install Now
              </button>
              
              <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-[10px] text-gray-400 font-mono text-center">Test Ad Unit: {unitId}</p>
              </div>
          </div>
      </div>
    </div>
  );
};

// Full Screen Rewarded Ad
export const RewardedAd: React.FC<{ unitId: string, onReward: () => void, onClose: () => void }> = ({ unitId, onReward, onClose }) => {
  const [timeLeft, setTimeLeft] = useState(10);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setCompleted(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleClose = () => {
      if (completed) {
          onReward();
      }
      onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center animate-in zoom-in-95 duration-300">
       {/* Timer/Close */}
      <div className="absolute top-4 right-4 z-20">
          <button 
            onClick={handleClose} 
            className={`rounded-full px-4 py-2 text-xs font-bold transition-all flex items-center gap-2 ${completed ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-gray-800 text-gray-400 cursor-not-allowed'}`}
          >
              {completed ? (
                  <>Claim Reward <span className="text-lg">✓</span></>
              ) : (
                  <>Reward in {timeLeft}s</>
              )}
          </button>
      </div>
      
      {/* Video Simulation */}
      <div className="w-full h-full relative bg-gray-900 flex flex-col items-center justify-center overflow-hidden">
          {/* Background Animation */}
          <div className="absolute inset-0 bg-[url('https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYTJjZjMzMzFkMzQ1ZDIyMzMyMzMyMzMyMzMyMzMyMzMyMzMyMyZlcD12MV9pbnRlcm5hbF9naWZzX2dpZklkJmN0PWc/xT5LMB2WiOdjpB7K4o/giphy.gif')] bg-cover opacity-20"></div>
          
          <div className="z-10 text-center p-8">
              <div className="text-6xl mb-4 animate-bounce">🪙</div>
              <h2 className="text-3xl font-bold text-white mb-2">Free Tokens!</h2>
              <p className="text-gray-300 mb-8">Watch until the timer ends to earn +10 Tokens</p>
              
              <div className="w-64 h-3 bg-gray-800 rounded-full overflow-hidden border border-gray-700">
                  <div 
                    className="h-full bg-gradient-to-r from-neon to-purple-500 transition-all duration-1000 ease-linear"
                    style={{ width: `${((10 - timeLeft) / 10) * 100}%` }}
                  ></div>
              </div>
          </div>

          <div className="absolute bottom-8 left-0 right-0 text-center">
             <p className="text-[10px] text-gray-500 font-mono bg-black/50 inline-block px-2 py-1 rounded">Ad Unit: {unitId}</p>
          </div>
      </div>
    </div>
  );
};

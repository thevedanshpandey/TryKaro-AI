
import React from 'react';
import { UserProfile } from '../types';
import { Icons } from '../constants';
import { Button } from './Button';

interface Props {
  userProfile: UserProfile;
  onSelectPlan: (plan: 'Free' | 'Monthly_99' | 'Monthly_299') => void;
  isLoading: boolean;
}

const SubscriptionScreen: React.FC<Props> = ({ userProfile, onSelectPlan, isLoading }) => {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-neon/10 rounded-full blur-[100px]"></div>
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-600/10 rounded-full blur-[100px]"></div>
      </div>

      <div className="relative z-10 w-full max-w-5xl mx-auto flex flex-col items-center">
        <div className="text-center mb-10 animate-in slide-in-from-top-4 duration-700">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Choose Your <span className="text-neon">Style</span></h1>
            <p className="text-gray-400 text-lg">Unlock the full power of TryKaro AI</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full px-4">
            
            {/* 1. Monthly Basic */}
            <div className="bg-gray-900/50 backdrop-blur-md border border-gray-800 rounded-3xl p-6 flex flex-col relative group hover:border-blue-500/50 transition-all duration-300">
                <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-2">Basic Monthly</h3>
                    <div className="flex items-baseline gap-1 mb-6">
                        <span className="text-3xl font-bold text-blue-400">₹99</span>
                        <span className="text-gray-500 text-sm">/month</span>
                    </div>
                    
                    <ul className="space-y-4 mb-8">
                        <li className="flex items-start gap-3 text-sm text-gray-300">
                            <span className="text-blue-500 font-bold">✓</span> 20 Virtual Try-Ons
                        </li>
                        <li className="flex items-start gap-3 text-sm text-gray-300">
                            <span className="text-blue-500 font-bold">✓</span> Basic Wardrobe access
                        </li>
                        <li className="flex items-start gap-3 text-sm text-gray-500 line-through">
                             <span className="text-gray-600 font-bold">✕</span> Premium Features (Daily Outfit, Smart Shop)
                        </li>
                    </ul>
                </div>
                
                <Button 
                    variant="secondary" 
                    fullWidth 
                    onClick={() => onSelectPlan('Monthly_99')} 
                    disabled={isLoading}
                    className="border-blue-500/30 hover:bg-blue-900/20 hover:text-blue-400 hover:border-blue-500"
                >
                    Select Basic
                </Button>
            </div>

            {/* 2. Monthly Premium (Formerly Quarterly) */}
            <div className="bg-gradient-to-b from-gray-900 to-black backdrop-blur-xl border border-neon rounded-3xl p-6 flex flex-col relative transform scale-105 shadow-[0_0_40px_rgba(255,42,109,0.15)] z-20">
                <div className="absolute top-0 right-0 bg-neon text-black text-[10px] font-bold px-3 py-1 rounded-bl-xl rounded-tr-2xl uppercase tracking-wider">
                    Most Popular
                </div>

                <div className="flex-1">
                    <h3 className="text-2xl font-bold text-white mb-2">Premium Monthly</h3>
                    <div className="flex items-baseline gap-1 mb-6">
                        <span className="text-4xl font-bold text-neon">₹299</span>
                        <span className="text-gray-400 text-sm">/month</span>
                    </div>
                    
                    <ul className="space-y-4 mb-8">
                        <li className="flex items-start gap-3 text-sm text-white font-medium">
                            <div className="w-5 h-5 rounded-full bg-neon/20 flex items-center justify-center text-neon text-xs">✓</div> 
                            Unlimited Virtual Try-Ons
                        </li>
                        <li className="flex items-start gap-3 text-sm text-white font-medium">
                            <div className="w-5 h-5 rounded-full bg-neon/20 flex items-center justify-center text-neon text-xs">✓</div> 
                            Daily Outfit Suggestions
                        </li>
                        <li className="flex items-start gap-3 text-sm text-white font-medium">
                            <div className="w-5 h-5 rounded-full bg-neon/20 flex items-center justify-center text-neon text-xs">✓</div> 
                            Smart Wardrobe Builder
                        </li>
                        <li className="flex items-start gap-3 text-sm text-white font-medium">
                            <div className="w-5 h-5 rounded-full bg-neon/20 flex items-center justify-center text-neon text-xs">✓</div> 
                            PDF Wardrobe Analysis
                        </li>
                        <li className="flex items-start gap-3 text-sm text-white font-bold">
                            <div className="w-5 h-5 rounded-full bg-neon/20 flex items-center justify-center text-neon text-xs">✓</div> 
                            🚫 Ad-Free Experience
                        </li>
                    </ul>
                </div>
                
                <Button 
                    fullWidth 
                    onClick={() => onSelectPlan('Monthly_299')} 
                    isLoading={isLoading}
                    className="shadow-[0_0_20px_rgba(255,42,109,0.4)]"
                >
                    Get Full Access
                </Button>
            </div>

            {/* 3. Free Plan */}
            <div className="bg-gray-900/30 backdrop-blur-sm border border-gray-800 rounded-3xl p-6 flex flex-col order-last md:order-first opacity-80 hover:opacity-100 transition-opacity">
                <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-400 mb-2">Free Starter</h3>
                    <div className="flex items-baseline gap-1 mb-6">
                        <span className="text-3xl font-bold text-white">₹0</span>
                    </div>
                    
                    <ul className="space-y-4 mb-8">
                        <li className="flex items-start gap-3 text-sm text-gray-400">
                            <span className="text-gray-500 font-bold">✓</span> 2 Free Virtual Try-Ons (50 Tokens)
                        </li>
                        <li className="flex items-start gap-3 text-sm text-gray-500 line-through">
                             <span className="text-gray-600 font-bold">✕</span> Daily Outfit Suggestions
                        </li>
                        <li className="flex items-start gap-3 text-sm text-gray-500 line-through">
                             <span className="text-gray-600 font-bold">✕</span> Smart Wardrobe Builder
                        </li>
                    </ul>
                </div>
                
                <button 
                    onClick={() => onSelectPlan('Free')}
                    disabled={isLoading}
                    className="w-full py-3 rounded-xl border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 transition-colors text-sm font-bold"
                >
                    Continue with 2 free try-ons (50 tokens)
                </button>
            </div>

        </div>

        <p className="text-gray-500 text-xs mt-8 text-center max-w-lg">
            By subscribing, you agree to our Terms of Service. 
            Free tier includes 50 tokens. 
            ₹99 plan includes 20 try-ons/month. 
            ₹299 plan is unlimited.
        </p>
      </div>
    </div>
  );
};

export default SubscriptionScreen;

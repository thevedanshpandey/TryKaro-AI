
import React, { useState } from 'react';
import { UserProfile, DailyOutfitResult, GeneratedLook } from '../types';
import { getDailyOutfitAdvice } from '../services/geminiService';
import { Button } from './Button';
import { Icons, DAILY_OCCASIONS } from '../constants';
import { LoadingOverlay } from './LoadingOverlay';

interface Props {
  user: UserProfile;
  onBack: () => void;
  onCreateWardrobe?: () => void;
  onSaveLook: (look: GeneratedLook) => void;
}

const DailyOutfit: React.FC<Props> = ({ user, onBack, onCreateWardrobe, onSaveLook }) => {
  const [result, setResult] = useState<DailyOutfitResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedOccasion, setSelectedOccasion] = useState<string | null>(null);

  const hasWardrobe = user.wardrobeAnalysis && user.wardrobeAnalysis.outfits && user.wardrobeAnalysis.outfits.length > 0;

  const handleOccasionSelect = async (occasion: string) => {
      setSelectedOccasion(occasion);
      fetchAdvice(occasion);
  };

  const fetchAdvice = async (occasion: string) => {
      setLoading(true);
      setError(null);
      setResult(null);
      
      try {
          if (!user.wardrobeAnalysis?.outfits) throw new Error("No outfits found in wardrobe");

          const availableOutfits = user.wardrobeAnalysis.outfits.map(o => ({
              id: o.id,
              description: `${o.style} - ${o.top} combined with ${o.bottom}`,
              image: o.generatedImage,
              visualPrompt: o.visualPrompt
          }));

          const data = await getDailyOutfitAdvice(user.city, availableOutfits, occasion);
          setResult(data);
          
      } catch (e) {
          console.error(e);
          setError("Couldn't check the weather or wardrobe. Try again.");
      } finally {
          setLoading(false);
      }
  };

  const handleSaveDailyLook = (index: number) => {
      if (!result) return;
      const outfit = result.outfits[index];
      if (!outfit.image) {
          alert("This outfit has no image saved yet. Go to 'My Wardrobe' to generate it first.");
          return;
      }
      const look: GeneratedLook = {
          id: `daily-${Date.now()}-${index}`,
          image: outfit.image,
          description: `Daily Outfit: ${outfit.name} (${result.weather})`,
          timestamp: Date.now()
      };
      onSaveLook(look);
      alert("Outfit saved to Profile!");
  };

  if (!hasWardrobe) {
      return (
          <div className="min-h-screen p-4 max-w-md mx-auto flex flex-col justify-center items-center text-center pb-20">
              <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mb-6 text-gray-500 animate-bounce">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.38 3.4a2 2 0 0 0-1.2-1.1l-2.19-.55a.5.5 0 0 0-.38.27L15 4H9l-1.6-2a.5.5 0 0 0-.38-.27L4.82 2.3a2 2 0 0 0-1.2 1.1l-2 6a2 2 0 0 0 1.2 2.5l1.18.3v9.7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-9.7l1.18-.3a2 2 0 0 0 1.2-2.5l-2-6Z"/></svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Wardrobe Missing!</h2>
              <p className="text-gray-400 mb-8 max-w-xs">We need your wardrobe to suggest outfits. Please analyze your wardrobe PDF first.</p>
              <div className="space-y-3 w-full">
                <Button fullWidth onClick={onCreateWardrobe}>Create My Wardrobe</Button>
                <button onClick={onBack} className="text-sm text-gray-500 underline">Back to Home</button>
              </div>
          </div>
      );
  }

  return (
    <div className="min-h-screen p-4 max-w-md mx-auto flex flex-col pb-20">
       {loading && <LoadingOverlay message={`Styling for ${selectedOccasion} in ${user.city}...`} />}
       
       <header className="flex items-center mb-6 gap-4">
            <button onClick={() => selectedOccasion ? setSelectedOccasion(null) : onBack()} className="text-gray-400 hover:text-white">
                <Icons.ArrowLeft />
            </button>
            <h1 className="text-xl font-bold">Today's Look</h1>
        </header>

        {!result && !loading && (
            <div className="animate-in slide-in-from-right-4">
                 <h2 className="text-2xl font-bold text-white mb-2">What's the plan?</h2>
                 <p className="text-gray-400 mb-6">Select an occasion to get the perfect outfit suggestion.</p>
                 
                 <div className="grid grid-cols-2 gap-3">
                     {DAILY_OCCASIONS.map((occ) => (
                         <button 
                            key={occ}
                            onClick={() => handleOccasionSelect(occ)}
                            className="bg-card hover:bg-gray-800 p-4 rounded-xl border border-gray-800 hover:border-neon/50 text-left transition-all group"
                         >
                             <span className="block text-sm font-bold text-white group-hover:text-neon mb-1">{occ}</span>
                             <span className="text-[10px] text-gray-500">Tap to style</span>
                         </button>
                     ))}
                 </div>
            </div>
        )}

        {result && (
            <div className="flex-1 space-y-6 animate-in fade-in">
                <div className="bg-gradient-to-r from-blue-900/40 to-black p-4 rounded-2xl border border-blue-800/50 flex items-center justify-between">
                    <div>
                        <p className="text-xs text-blue-300 uppercase font-bold tracking-wider">Plan: {selectedOccasion}</p>
                        <h2 className="text-2xl font-bold text-white">{result.weather}</h2>
                        <p className="text-xs text-gray-400 flex items-center gap-1 mt-1"><span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> Live in {user.city}</p>
                    </div>
                    <div className="text-4xl">🌤️</div>
                </div>

                <h3 className="text-white font-bold text-lg">Top 2 Picks</h3>
                
                {result.outfits.map((outfit, index) => (
                    <div key={index} className="bg-card rounded-xl border border-gray-800 overflow-hidden group">
                        <div className="aspect-[3/4] bg-gray-900 relative">
                            {outfit.image ? (
                                <>
                                    <img src={outfit.image} className="w-full h-full object-cover" alt={outfit.name} />
                                    <div className="absolute top-2 right-2">
                                        <button onClick={() => handleSaveDailyLook(index)} className="bg-black/60 text-white p-2 rounded-full backdrop-blur-md hover:bg-neon transition-colors" title="Save Look"><Icons.Heart /></button>
                                    </div>
                                    <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] px-2 py-1 rounded backdrop-blur-md border border-white/10">From Wardrobe</div>
                                </>
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 gap-3 p-4 bg-black/50">
                                    <p className="text-xs font-bold text-gray-400">No Image Saved</p>
                                    <Button onClick={onCreateWardrobe} variant="outline" className="text-[10px] py-2 px-4 h-auto">Go to Wardrobe</Button>
                                </div>
                            )}
                        </div>

                        <div className="p-4">
                            <div className="flex justify-between items-start mb-2">
                                <h4 className="font-bold text-lg text-white">{outfit.name}</h4>
                                <span className={`text-[10px] px-2 py-1 rounded border font-bold ${index === 0 ? 'bg-neon/10 text-neon border-neon/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>OPTION {index + 1}</span>
                            </div>
                            <p className="text-sm text-gray-300 mb-3">{outfit.description}</p>
                            
                            <div className="bg-gray-900 p-3 rounded-lg border border-gray-800/50 mb-3">
                                <p className="text-xs text-gray-400 font-bold mb-1">STYLIST NOTES:</p>
                                <p className="text-xs text-gray-500 italic">" {outfit.reasoning} "</p>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-[10px] text-gray-400">
                                {outfit.comfortRating && (
                                    <div className="bg-gray-900 px-2 py-1 rounded border border-gray-800">
                                        Comfort: <span className="text-white font-bold">{outfit.comfortRating}/10</span>
                                    </div>
                                )}
                                {outfit.careInstructions && (
                                    <div className="bg-gray-900 px-2 py-1 rounded border border-gray-800 truncate">
                                        Tip: {outfit.careInstructions}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}

                <div className="pt-4 text-center">
                    <Button variant="outline" onClick={() => setSelectedOccasion(null)} fullWidth>
                        Change Occasion
                    </Button>
                </div>
            </div>
        )}
        
        {error && (
            <div className="text-center p-6 text-red-400 bg-red-900/10 rounded-xl border border-red-900/30">
                <p>{error}</p>
                <button onClick={() => selectedOccasion && fetchAdvice(selectedOccasion)} className="mt-2 underline text-sm">Retry</button>
            </div>
        )}
    </div>
  );
};

export default DailyOutfit;

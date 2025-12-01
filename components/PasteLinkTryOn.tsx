
import React, { useState } from 'react';
import { UserProfile, TryOnResult, GeneratedLook } from '../types';
import { Button } from './Button';
import { Icons, AD_UNITS } from '../constants';
import { generateTryOn, fileToGenerativePart, scrapeClothingImage } from '../services/geminiService';
import { LoadingOverlay } from './LoadingOverlay';
import { InterstitialAd } from './AdComponents';

interface Props {
  user: UserProfile;
  onBack: () => void;
  onSaveLook: (look: GeneratedLook) => void;
  onDeductTokens: (amount: number) => void;
}

const PasteLinkTryOn: React.FC<Props> = ({ user, onBack, onSaveLook, onDeductTokens }) => {
  const [link, setLink] = useState('');
  const [clothImage, setClothImage] = useState<string | null>(null);
  const [clothFile, setClothFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [result, setResult] = useState<TryOnResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isScraping, setIsScraping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showInterstitial, setShowInterstitial] = useState(false);

  const GENERATION_COST = 25;
  const canGenerate = user.hasPremium || user.tokens >= GENERATION_COST;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setClothFile(file);
      const base64 = await fileToGenerativePart(file);
      setClothImage(`data:image/jpeg;base64,${base64}`);
      if (!description) {
        setDescription(file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "));
      }
      setLink('');
    }
  };

  const handleLinkScrape = async () => {
      if (!link) return;
      setIsScraping(true);
      setError(null);
      setClothImage(null);
      try {
          const base64Image = await scrapeClothingImage(link);
          setClothImage(base64Image);
          if (!description) {
              try {
                  const urlObj = new URL(link);
                  if (link.match(/\.(jpeg|jpg|gif|png|webp)/i)) {
                       setDescription("Online Image Find");
                  } else {
                      const pathSegments = urlObj.pathname.split('/').filter(Boolean);
                      const potentialName = pathSegments[pathSegments.length - 1] || "New Outfit";
                      setDescription(potentialName.replace(/[-_]/g, " ").substring(0, 30));
                  }
              } catch (e) {
                  setDescription("Online Find");
              }
          }
      } catch (err: any) {
          console.error("Scraping failed", err);
          setError(err.message || "Could not fetch image. Try Image Address.");
      } finally {
          setIsScraping(false);
      }
  };

  const handleGenerate = async () => {
    if (!clothImage) {
        setError("Please upload an image or paste a valid link first.");
        return;
    }
    
    if (!canGenerate) {
        alert("Not enough tokens! Watch an ad to earn more.");
        return;
    }
    
    setIsGenerating(true);
    setError(null);

    try {
        const response = await generateTryOn(user, clothImage, description || "A stylish outfit");
        
        if (response && response.image) {
            setResult(response);
            if (!user.hasPremium) {
                onDeductTokens(GENERATION_COST);
                // Trigger interstitial after a slight delay or immediately
                setTimeout(() => setShowInterstitial(true), 1500);
            }
        } else {
            throw new Error("Could not generate the try-on. Please try a clearer image.");
        }

    } catch (err: any) {
        console.error(err);
        setError(err.message || "Something went wrong");
    } finally {
        setIsGenerating(false);
    }
  };

  const handleSave = () => {
      if (!result) return;
      
      const newLook: GeneratedLook = {
          id: Date.now().toString(),
          image: result.image,
          description: description || "Virtual Try-On",
          timestamp: Date.now()
      };
      
      onSaveLook(newLook);
      alert("Look saved to your profile!");
  };

  if (result) {
      return (
          <div className="min-h-screen p-4 flex flex-col max-w-md mx-auto pb-20">
              {showInterstitial && (
                  <InterstitialAd 
                    unitId={AD_UNITS.INTERSTITIAL} 
                    onClose={() => setShowInterstitial(false)} 
                  />
              )}
              
              <div className="flex justify-between items-center mb-4">
                  <button onClick={() => setResult(null)} className="text-gray-400 hover:text-white flex items-center gap-1">
                    <span>←</span> Back
                  </button>
                  <h2 className="font-bold text-neon uppercase tracking-wider text-sm">TryKaro Results</h2>
                  <button className="text-gray-400"><Icons.Share /></button>
              </div>
              
              <div className="flex-1 bg-card rounded-2xl overflow-hidden border border-gray-800 relative mb-4 shadow-[0_0_20px_rgba(255,42,109,0.15)] min-h-[400px]">
                  <img src={result.image} alt="Result" className="w-full h-full object-contain bg-black" />
                  <div className="absolute top-4 left-4 bg-black/60 px-3 py-1 rounded-full text-[10px] text-white backdrop-blur-md border border-white/10 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                      AI Generated
                  </div>
              </div>

              <div className="bg-gradient-to-br from-gray-900 to-black border border-neon/40 rounded-xl p-5 mb-4 relative overflow-hidden">
                  <div className="absolute -right-4 -top-4 w-20 h-20 bg-neon/10 rounded-full blur-xl"></div>
                  <div className="flex gap-3 relative z-10">
                      <div className="w-10 h-10 rounded-full bg-neon/20 flex items-center justify-center flex-shrink-0 border border-neon/50 text-neon">
                          <Icons.Sparkles />
                      </div>
                      <div className="flex-1">
                          <h3 className="text-sm font-bold text-white mb-1">Stylist Verdict</h3>
                          <div className="text-xs text-gray-300 leading-relaxed max-h-24 overflow-y-auto pr-2">
                              {result.feedback}
                          </div>
                      </div>
                  </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                   <button 
                      onClick={handleSave}
                      className="bg-gray-800 p-3 rounded-xl text-xs font-bold hover:bg-gray-700 text-white border border-gray-700 transition-colors"
                   >
                      Save Look
                  </button>
                  <button className="bg-neon text-white p-3 rounded-xl text-xs font-bold hover:bg-neon/80 shadow-[0_0_15px_rgba(255,42,109,0.3)] transition-all active:scale-95">
                      Buy Similar
                  </button>
              </div>
              
              <Button onClick={() => setResult(null)} variant="outline" fullWidth>Try Another Outfit</Button>
          </div>
      )
  }

  return (
    <div className="min-h-screen p-4 max-w-md mx-auto pb-20">
        {isGenerating && <LoadingOverlay message="Swapping faces & fitting outfit..." />}
        {isScraping && <LoadingOverlay message="Fetching outfit details..." />}
        
        <header className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="text-gray-400 hover:text-white">←</button>
                <h1 className="text-xl font-bold">Try New Look</h1>
            </div>
            {!user.hasPremium && (
                <div className="bg-gray-800 px-3 py-1 rounded-full text-xs font-bold border border-gray-700">
                    <span className="text-yellow-400">{user.tokens}</span> <span className="text-gray-400">Tokens</span>
                </div>
            )}
        </header>

        <div className="space-y-6">
            <div className="bg-gray-900/50 p-4 rounded-2xl border border-gray-800 flex items-center gap-4">
                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-neon shadow-[0_0_10px_rgba(255,42,109,0.3)]">
                    {user.avatarImage ? (
                        <img src={user.avatarImage} className="w-full h-full object-cover" alt="Me" />
                    ) : <div className="bg-gray-700 w-full h-full"></div>}
                </div>
                <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">MODEL (YOU)</p>
                    <h3 className="font-bold text-white text-lg">{user.name}</h3>
                </div>
            </div>

            <div className="space-y-4">
                 <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider">ADD CLOTHING</h3>
                 
                 <div className="flex gap-2">
                    <input 
                        type="text" 
                        value={link}
                        onChange={(e) => {
                            setLink(e.target.value);
                            setError(null); 
                        }}
                        placeholder="Product URL or Direct Image Address..."
                        className="flex-1 bg-card border border-gray-700 rounded-xl p-3 text-sm text-white focus:border-neon outline-none transition-colors"
                    />
                    <button 
                        onClick={handleLinkScrape}
                        disabled={!link}
                        className={`w-12 rounded-xl flex items-center justify-center border border-gray-700 transition-all ${link ? 'bg-gray-800 text-neon hover:bg-gray-700' : 'bg-gray-900 text-gray-600'}`}
                    >
                        <Icons.Zap />
                    </button>
                </div>
                
                <p className="text-[10px] text-gray-500 px-1">
                    💡 Tip: If the product link fails, right-click the image on the store, copy <strong>"Image Address"</strong>, and paste it above.
                </p>

                <div className="relative flex items-center py-2">
                    <div className="flex-grow border-t border-gray-800"></div>
                    <span className="flex-shrink-0 mx-4 text-gray-600 text-xs">OR UPLOAD IMAGE</span>
                    <div className="flex-grow border-t border-gray-800"></div>
                </div>

                <div 
                    className={`border-2 border-dashed rounded-2xl h-64 flex flex-col items-center justify-center transition-all cursor-pointer relative overflow-hidden group ${clothImage ? 'border-neon bg-black' : 'border-gray-700 bg-card hover:border-gray-500'}`}
                    onClick={() => document.getElementById('cloth-upload')?.click()}
                >
                    {clothImage ? (
                        <>
                            <img src={clothImage} className="w-full h-full object-contain p-2" alt="Cloth" />
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                                <p className="text-sm text-white font-bold flex items-center gap-2">
                                    <Icons.Upload /> Change Image
                                </p>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="w-14 h-14 rounded-full bg-gray-800 flex items-center justify-center mb-3 text-gray-400 group-hover:text-white group-hover:scale-110 transition-all shadow-lg">
                                <Icons.Upload />
                            </div>
                            <span className="text-sm text-gray-300 font-medium">Tap to upload clothing</span>
                        </>
                    )}
                    <input id="cloth-upload" type="file" className="hidden" onChange={handleFileChange} accept="image/*" />
                </div>

                <input 
                    type="text" 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Description (e.g. Black Kurti)"
                    className="w-full bg-card border border-gray-700 rounded-xl p-3 text-sm text-white focus:border-neon outline-none transition-all focus:bg-gray-900"
                />
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/50 p-3 rounded-xl text-red-400 text-xs flex items-center gap-2 animate-in slide-in-from-top-2">
                    <span className="block w-2 h-2 rounded-full bg-red-500"></span>
                    {error}
                </div>
            )}

            <div className="pt-2">
                <Button 
                    fullWidth 
                    onClick={handleGenerate} 
                    disabled={!clothImage} 
                    className={!clothImage ? "opacity-50 grayscale" : ""}
                >
                    {user.hasPremium ? "Generate (Premium)" : `Generate (${GENERATION_COST} Tokens)`}
                </Button>
                {!canGenerate && (
                    <p className="text-center text-red-400 text-xs mt-2">Not enough tokens.</p>
                )}
            </div>
        </div>
    </div>
  );
};

export default PasteLinkTryOn;

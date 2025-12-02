
import React, { useState, useRef } from 'react';
import { UserProfile, TryOnResult, GeneratedLook } from '../types';
import { Button } from './Button';
import { Icons, AD_UNITS } from '../constants';
import { generateTryOn, fileToGenerativePart, scrapeClothingImage } from '../services/geminiService';
import { LoadingOverlay } from './LoadingOverlay';
import { InterstitialAd } from './AdComponents';
import { saveUserProfileToStorage } from '../services/storageAdapter';
import { ImageCropper } from './ImageCropper';
import { auth } from '../firebaseConfig';

interface Props {
  user: UserProfile;
  onBack: () => void;
  onSaveLook: (look: GeneratedLook) => void;
  onDeductUsage: (amount: number) => void;
}

const LOADING_PHRASES = [
    "Synthesizing fabric physics...",
    "Mapping body topology...",
    "Rendering high-fidelity textures...",
    "Aligning style matrix...",
    "Fabricating your digital look...",
    "Calculating drape & lighting...",
    "Virtualizing garments..."
];

const PasteLinkTryOn: React.FC<Props> = ({ user, onBack, onSaveLook, onDeductUsage }) => {
  const [link, setLink] = useState('');
  const [clothImage, setClothImage] = useState<string | null>(null);
  const [clothFile, setClothFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [result, setResult] = useState<TryOnResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingText, setLoadingText] = useState("Initializing...");
  const [isScraping, setIsScraping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showInterstitial, setShowInterstitial] = useState(false);
  
  const [showAvatarUpload, setShowAvatarUpload] = useState(false);
  const [rawAvatarImage, setRawAvatarImage] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const GENERATION_COST = 25; 
  
  const canGenerate = () => {
      if (user.planType === 'Monthly_299') return true; 
      if (user.planType === 'Monthly_99') {
          return (user.tryOnUsed || 0) < (user.tryOnLimit || 20);
      }
      return user.tokens >= GENERATION_COST;
  };

  const getLimitMessage = () => {
      if (user.planType === 'Monthly_299') return "Unlimited Access";
      if (user.planType === 'Monthly_99') return `${(user.tryOnLimit || 20) - (user.tryOnUsed || 0)} tries left this month`;
      return `${user.tokens} Tokens available (${Math.floor(user.tokens / GENERATION_COST)} tries)`;
  };

  const hasValidAvatar = user.avatarImage && (user.avatarImage.startsWith('data:') || user.avatarImage.startsWith('http'));

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

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              setRawAvatarImage(reader.result as string);
              setShowAvatarUpload(true);
          };
          reader.readAsDataURL(file);
      }
  };

  const handleAvatarCropComplete = async (croppedBase64: string) => {
      user.avatarImage = croppedBase64; 
      if (auth.currentUser) {
          await saveUserProfileToStorage(user, auth.currentUser.uid);
      }
      setShowAvatarUpload(false);
      setRawAvatarImage(null);
      handleGenerate();
  };

  const handleLinkScrape = async () => {
      if (!link) return;
      setIsScraping(true);
      setError(null);
      setClothImage(null);
      
      try {
          const base64Image = await scrapeClothingImage(link);
          
          const linkEl = document.createElement("a");
          linkEl.href = base64Image;
          linkEl.download = "trykaro-outfit.jpg";
          document.body.appendChild(linkEl);
          linkEl.click();
          document.body.removeChild(linkEl);
          
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
          
          alert("Image downloaded! It's also ready for Try-On below.");

      } catch (err: any) {
          console.error("Scraping failed", err);
          setError("Auto-fetch failed. Please open the image, save it, and upload manually.");
      } finally {
          setIsScraping(false);
      }
  };

  const handleGenerate = async () => {
    if (!clothImage) {
        setError("Please upload an image or paste a valid link first.");
        return;
    }

    if (!hasValidAvatar && !showAvatarUpload) {
        if (confirm("⚠️ Missing Profile Photo\n\nSince images are stored locally for privacy, your profile photo is missing on this device.\n\nPlease upload a quick selfie to continue.")) {
            avatarInputRef.current?.click();
        }
        return;
    }
    
    if (!canGenerate()) {
        if (user.planType === 'Free') {
             alert("Not enough tokens! Watch an ad to earn more.");
        } else {
             alert("Monthly limit reached! Upgrade to Premium for unlimited access.");
        }
        return;
    }
    
    setIsGenerating(true);
    setLoadingText(LOADING_PHRASES[Math.floor(Math.random() * LOADING_PHRASES.length)]);
    setError(null);

    try {
        const response = await generateTryOn(user, clothImage, description || "A stylish outfit");
        
        if (response && response.image) {
            setResult(response);
            onDeductUsage(GENERATION_COST);
            
            if (user.planType !== 'Monthly_299') {
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

  if (showAvatarUpload && rawAvatarImage) {
      return (
          <ImageCropper 
              imageSrc={rawAvatarImage}
              onCancel={() => { setShowAvatarUpload(false); setRawAvatarImage(null); }}
              onCropComplete={handleAvatarCropComplete}
          />
      );
  }

  if (result) {
      return (
          <div className="min-h-screen p-4 w-full max-w-5xl mx-auto pb-20">
              {showInterstitial && (
                  <InterstitialAd 
                    unitId={AD_UNITS.INTERSTITIAL} 
                    onClose={() => setShowInterstitial(false)} 
                  />
              )}
              
              <div className="flex justify-between items-center mb-6">
                  <button onClick={() => setResult(null)} className="text-gray-400 hover:text-white flex items-center gap-1">
                    <span>←</span> Back
                  </button>
                  <h2 className="font-bold text-neon uppercase tracking-wider text-sm">TryKaro Results</h2>
                  <button className="text-gray-400"><Icons.Share /></button>
              </div>
              
              <div className="flex flex-col lg:flex-row gap-8">
                  <div className="flex-1 bg-card rounded-2xl overflow-hidden border border-gray-800 relative shadow-[0_0_20px_rgba(255,42,109,0.15)] min-h-[400px] lg:h-[600px]">
                      <img src={result.image} alt="Result" className="w-full h-full object-contain bg-black" />
                      <div className="absolute top-4 left-4 bg-black/60 px-3 py-1 rounded-full text-[10px] text-white backdrop-blur-md border border-white/10 flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                          AI Generated
                      </div>
                  </div>

                  <div className="flex-1 space-y-6">
                      <div className="bg-gradient-to-br from-gray-900 to-black border border-neon/40 rounded-xl p-6 relative overflow-hidden">
                          <div className="absolute -right-4 -top-4 w-20 h-20 bg-neon/10 rounded-full blur-xl"></div>
                          <div className="flex gap-4 relative z-10">
                              <div className="w-12 h-12 rounded-full bg-neon/20 flex items-center justify-center flex-shrink-0 border border-neon/50 text-neon">
                                  <Icons.Sparkles />
                              </div>
                              <div className="flex-1">
                                  <h3 className="text-lg font-bold text-white mb-2">Stylist Verdict</h3>
                                  <div className="text-sm text-gray-300 leading-relaxed">
                                      {result.feedback}
                                  </div>
                              </div>
                          </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <button 
                              onClick={handleSave}
                              className="bg-gray-800 p-4 rounded-xl font-bold hover:bg-gray-700 text-white border border-gray-700 transition-colors flex justify-center items-center gap-2"
                          >
                              <Icons.Heart /> Save Look
                          </button>
                          <button className="bg-neon text-white p-4 rounded-xl font-bold hover:bg-neon/80 shadow-[0_0_15px_rgba(255,42,109,0.3)] transition-all active:scale-95 flex justify-center items-center gap-2">
                              <Icons.Shirt /> Buy Similar
                          </button>
                      </div>
                      
                      <Button onClick={() => setResult(null)} variant="outline" fullWidth>Try Another Outfit</Button>
                  </div>
              </div>
          </div>
      )
  }

  return (
    <div className="min-h-screen p-4 w-full max-w-5xl mx-auto pb-20">
        {isGenerating && <LoadingOverlay message={loadingText} />}
        {isScraping && <LoadingOverlay message="Fetching outfit details..." />}
        
        <input 
            type="file" 
            ref={avatarInputRef} 
            className="hidden" 
            accept="image/*"
            onChange={handleAvatarUpload}
        />

        <header className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="text-gray-400 hover:text-white">←</button>
                <h1 className="text-2xl font-bold">Try New Look</h1>
            </div>
            <div className="bg-gray-800 px-3 py-1 rounded-full text-xs font-bold border border-gray-700">
                <span className="text-yellow-400">{getLimitMessage()}</span>
            </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
                <div className="bg-gray-900/50 p-6 rounded-3xl border border-gray-800 flex items-center gap-6">
                    <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-neon shadow-[0_0_10px_rgba(255,42,109,0.3)] shrink-0">
                        {hasValidAvatar ? (
                            <img src={user.avatarImage!} className="w-full h-full object-cover" alt="Me" />
                        ) : (
                            <div 
                                className="bg-gray-800 w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-gray-700 transition-colors"
                                onClick={() => avatarInputRef.current?.click()}
                            >
                                <Icons.Camera />
                                <span className="text-[8px] text-gray-400 mt-1">Upload</span>
                            </div>
                        )}
                    </div>
                    <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">MODEL (YOU)</p>
                        <h3 className="font-bold text-white text-xl">{user.name}</h3>
                        {!hasValidAvatar && (
                            <p className="text-xs text-red-400 font-bold animate-pulse mt-1">Photo missing on this device</p>
                        )}
                        <p className="text-sm text-gray-500 mt-1">{user.height}cm • {user.bodyShape}</p>
                    </div>
                </div>

                <div className="hidden lg:block bg-card p-6 rounded-3xl border border-gray-800">
                    <h3 className="font-bold text-white mb-2">How it works</h3>
                    <ul className="text-sm text-gray-400 space-y-2 list-disc pl-4">
                        <li>Paste a link from Amazon, Myntra, or Flipkart.</li>
                        <li>Or upload an image of clothing directly.</li>
                        <li>Our AI will fit the clothing to your body shape.</li>
                        <li>Ensure good lighting for best results.</li>
                    </ul>
                </div>
            </div>

            <div className="space-y-6 bg-black/40 p-6 rounded-3xl border border-white/5">
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
                        className="flex-1 bg-card border border-gray-700 rounded-xl p-4 text-sm text-white focus:border-neon outline-none transition-colors"
                    />
                    <button 
                        onClick={handleLinkScrape}
                        disabled={!link}
                        className={`w-14 rounded-xl flex items-center justify-center border border-gray-700 transition-all ${link ? 'bg-gray-800 text-neon hover:bg-gray-700' : 'bg-gray-900 text-gray-600'}`}
                    >
                        <Icons.Zap />
                    </button>
                </div>
                
                <p className="text-xs text-gray-500 px-1">
                    💡 Tip: If auto-fetch fails, <a href={link} target="_blank" rel="noopener noreferrer" className="text-neon underline">click here</a> to open the image, save it, and upload below.
                </p>

                <div className="relative flex items-center py-2">
                    <div className="flex-grow border-t border-gray-800"></div>
                    <span className="flex-shrink-0 mx-4 text-gray-600 text-xs font-bold">OR UPLOAD IMAGE</span>
                    <div className="flex-grow border-t border-gray-800"></div>
                </div>

                <div 
                    className={`border-2 border-dashed rounded-2xl h-64 flex flex-col items-center justify-center transition-all cursor-pointer relative overflow-hidden group ${clothImage ? 'border-neon bg-black' : 'border-gray-700 bg-card hover:border-gray-500'}`}
                    onClick={() => document.getElementById('cloth-upload')?.click()}
                >
                    {clothImage ? (
                        <>
                            <img src={clothImage} className="w-full h-full object-contain p-4" alt="Cloth" />
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                                <p className="text-sm text-white font-bold flex items-center gap-2">
                                    <Icons.Upload /> Change Image
                                </p>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mb-4 text-gray-400 group-hover:text-white group-hover:scale-110 transition-all shadow-lg">
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
                    className="w-full bg-card border border-gray-700 rounded-xl p-4 text-sm text-white focus:border-neon outline-none transition-all focus:bg-gray-900"
                />

                {error && (
                    <div className="bg-red-500/10 border border-red-500/50 p-4 rounded-xl text-red-400 text-sm flex items-center gap-3 animate-in slide-in-from-top-2">
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
                        {user.planType === 'Free' ? `Generate (${GENERATION_COST} Tokens)` : `Generate (Plan: ${user.planType.replace('_', ' ')})`}
                    </Button>
                    {!canGenerate() && (
                        <p className="text-center text-red-400 text-xs mt-2">Limit reached. Please upgrade.</p>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};

export default PasteLinkTryOn;

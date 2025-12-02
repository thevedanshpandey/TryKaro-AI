
import React, { useState, useRef, useEffect } from 'react';
import { UserProfile, PdfAnalysisResult, GeneratedLook } from '../types';
import { fileToGenerativePart, analyzePdfWardrobe, generateOutfitFromText } from '../services/geminiService';
import { Button } from './Button';
import { Icons, STYLE_VIBES } from '../constants';
import { LoadingOverlay } from './LoadingOverlay';

interface Props {
  user: UserProfile;
  onBack: () => void;
  onSaveWardrobe: (analysis: PdfAnalysisResult | null) => void;
  onSaveLook: (look: GeneratedLook) => void;
  onDeleteWardrobe: () => Promise<void>;
}

const PdfWardrobe: React.FC<Props> = ({ user, onBack, onSaveWardrobe, onSaveLook, onDeleteWardrobe }) => {
  const [file, setFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<PdfAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState<'outfits' | 'items' | 'intelligence'>('outfits');
  
  // Context Modal State
  const [showContextModal, setShowContextModal] = useState(false);
  const [stylePref, setStylePref] = useState('');
  const [occasion, setOccasion] = useState('');

  const [visualizingId, setVisualizingId] = useState<number | null>(null);
  const [generatedImages, setGeneratedImages] = useState<{[key: number]: string}>({});
  const [isBulkGenerating, setIsBulkGenerating] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user.wardrobeAnalysis) {
      setAnalysis(user.wardrobeAnalysis);
      const savedImages: {[key: number]: string} = {};
      user.wardrobeAnalysis.outfits.forEach(outfit => {
        if (outfit.generatedImage) {
          savedImages[outfit.id] = outfit.generatedImage;
        }
      });
      setGeneratedImages(savedImages);
    }
  }, [user.wardrobeAnalysis]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
      setShowContextModal(true); // Trigger modal after file select
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setShowContextModal(false);
    setIsAnalyzing(true);
    try {
      const base64 = await fileToGenerativePart(file);
      const result = await analyzePdfWardrobe(base64, user, { style: stylePref, occasion: occasion });
      setAnalysis(result);
    } catch (error) {
      console.error(error);
      alert("Failed to analyze PDF. Please ensure it contains images of clothes.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleShare = async (outfitId: number) => {
      const img = generatedImages[outfitId];
      if (!img) return;

      try {
        if (navigator.share) {
             await navigator.share({
                 title: 'Check out my new look!',
                 text: 'What do you think of this outfit I styled with TryKaro?',
                 url: window.location.href
             });
        } else {
             alert("Link copied to clipboard! (Simulated)");
        }
      } catch (err) {
          console.log("Share failed", err);
      }
  };

  const handleVisualize = async (outfitId: number, visualPrompt: string) => {
    if (generatedImages[outfitId]) return;
    setVisualizingId(outfitId);
    try {
        const image = await generateOutfitFromText(user, visualPrompt);
        setGeneratedImages(prev => ({...prev, [outfitId]: image}));
    } catch (e: any) {
        if (e.message?.includes("Profile photo")) {
            alert(e.message);
        } else {
            alert("Could not generate image for this outfit. Please try again.");
        }
    } finally {
        setVisualizingId(null);
    }
  };

  const handleBulkVisualize = async () => {
    if (!analysis) return;
    const outfitsToGen = analysis.outfits.filter(o => !generatedImages[o.id]);
    if (outfitsToGen.length === 0) {
        alert("All outfits already visualized!");
        return;
    }
    setIsBulkGenerating(true);
    setBulkProgress({ current: 0, total: outfitsToGen.length });

    const BATCH_SIZE = 2;
    let stopProcessing = false;

    for (let i = 0; i < outfitsToGen.length; i += BATCH_SIZE) {
        if (stopProcessing) break;
        
        const batch = outfitsToGen.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(async (outfit) => {
            if (stopProcessing) return;
            try {
                const img = await generateOutfitFromText(user, outfit.visualPrompt);
                setGeneratedImages(prev => ({...prev, [outfit.id]: img}));
            } catch (e: any) {
                console.error(`Failed to generate outfit ${outfit.id}`, e);
                if (e.message?.includes("Profile photo")) {
                    stopProcessing = true;
                    alert(e.message);
                }
            }
        }));
        
        if (!stopProcessing) {
            setBulkProgress(prev => ({ ...prev, current: Math.min(prev.current + BATCH_SIZE, prev.total) }));
        }
    }
    setIsBulkGenerating(false);
  };

  const handleSaveWardrobePlan = () => {
      if (!analysis) return;
      const updatedOutfits = analysis.outfits.map(outfit => ({
          ...outfit,
          generatedImage: generatedImages[outfit.id] || outfit.generatedImage
      }));
      const updatedAnalysis: PdfAnalysisResult = { ...analysis, outfits: updatedOutfits };
      onSaveWardrobe(updatedAnalysis);
      alert("Wardrobe saved successfully!");
  };

  const handleSaveIndividualOutfit = (outfitId: number) => {
      const outfit = analysis?.outfits.find(o => o.id === outfitId);
      const image = generatedImages[outfitId];
      if (!outfit || !image) return;
      const look: GeneratedLook = {
          id: `${Date.now()}-${outfitId}`,
          image: image,
          description: `Wardrobe Outfit #${outfit.id}: ${outfit.style}`,
          timestamp: Date.now()
      };
      onSaveLook(look);
      alert("Outfit saved to 'My Outfits'!");
  };

  const handleDeleteClick = () => {
      if (confirm("Are you sure you want to delete your current wardrobe? This will remove all associated outfits and items. This cannot be undone.")) {
          onDeleteWardrobe();
      }
  };

  if (isAnalyzing) return <LoadingOverlay message="Analyzing wardrobe..." />;

  // Context Modal
  if (showContextModal) {
      return (
          <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 backdrop-blur-md">
              <div className="bg-card w-full max-w-sm rounded-2xl p-6 border border-gray-800 animate-in zoom-in-95">
                  <h3 className="text-xl font-bold text-white mb-4">Styling Context</h3>
                  <p className="text-gray-400 text-sm mb-6">Help us understand how to style these clothes.</p>
                  
                  <div className="space-y-4 mb-6">
                      <div>
                          <label className="text-xs text-gray-500 mb-2 block uppercase">Where will you wear them?</label>
                          <input 
                            type="text" 
                            className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-white focus:border-neon outline-none"
                            placeholder="e.g. College, Office, Dates..."
                            value={occasion}
                            onChange={e => setOccasion(e.target.value)}
                          />
                      </div>
                      <div>
                          <label className="text-xs text-gray-500 mb-2 block uppercase">Preferred Vibe</label>
                          <select 
                            className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-white focus:border-neon outline-none"
                            value={stylePref}
                            onChange={e => setStylePref(e.target.value)}
                          >
                              <option value="">Surprise Me</option>
                              {STYLE_VIBES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                      </div>
                  </div>

                  <Button fullWidth onClick={handleAnalyze}>Start Analysis</Button>
                  <button onClick={() => { setShowContextModal(false); setFile(null); }} className="w-full text-center text-gray-500 text-sm mt-4">Cancel</button>
              </div>
          </div>
      )
  }

  return (
    <div className="min-h-screen p-4 w-full max-w-5xl mx-auto pb-20">
      <header className="flex items-center mb-6 gap-4 justify-between">
        <div className="flex items-center gap-4">
            <button onClick={onBack} className="text-gray-400 hover:text-white">←</button>
            <h1 className="text-2xl font-bold">My Wardrobe</h1>
        </div>
        {analysis && (
            <button onClick={handleDeleteClick} className="text-red-500 hover:text-red-400 p-2 bg-red-900/10 rounded-full hover:bg-red-900/20 transition-colors">
                <Icons.Trash />
            </button>
        )}
      </header>

      {isBulkGenerating && (
         <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center backdrop-blur-sm p-6">
            <h3 className="text-xl font-bold text-white mb-2 animate-pulse">Designing Your Collection</h3>
            <p className="text-gray-400 text-sm mb-4">Generating {bulkProgress.total} outfits...</p>
            <div className="w-full max-w-xs bg-gray-800 rounded-full h-4 overflow-hidden border border-gray-700">
                <div 
                    className="bg-neon h-full transition-all duration-500 ease-out"
                    style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
                ></div>
            </div>
            <p className="text-xs text-neon mt-2">{bulkProgress.current} / {bulkProgress.total} completed</p>
         </div>
      )}

      {!analysis ? (
        <div className="space-y-6 animate-in slide-in-from-bottom-4">
          <div className="bg-card border border-dashed border-gray-700 rounded-2xl p-12 flex flex-col items-center justify-center text-center max-w-lg mx-auto">
            <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mb-6 text-neon shadow-lg">
              <Icons.Upload />
            </div>
            <h3 className="font-bold text-white text-xl mb-2">Upload Wardrobe PDF</h3>
            <p className="text-gray-400 mb-8 max-w-xs mx-auto">Upload a PDF containing photos of your clothes. Our AI will analyze, categorize, and create outfits for you.</p>
            <input type="file" accept="application/pdf" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
            <Button onClick={() => fileInputRef.current?.click()} className="px-8">
                Select PDF
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
            <div className="bg-gradient-to-r from-gray-900 to-black p-6 rounded-2xl border border-gray-800">
                <h2 className="font-bold text-neon mb-2 text-lg">Stylist Summary</h2>
                <p className="text-gray-300 leading-relaxed">{analysis.summary}</p>
            </div>

            <div className="flex bg-gray-900 p-1.5 rounded-xl max-w-lg mx-auto">
                <button onClick={() => setActiveTab('outfits')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'outfits' ? 'bg-neon text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>Outfits</button>
                <button onClick={() => setActiveTab('items')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'items' ? 'bg-neon text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>Items ({analysis.items?.length})</button>
                <button onClick={() => setActiveTab('intelligence')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'intelligence' ? 'bg-neon text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>Stats</button>
            </div>

            {activeTab === 'intelligence' && (
                <div className="space-y-4 animate-in fade-in max-w-2xl mx-auto">
                    {/* Health Score */}
                    {analysis.wardrobeHealth && (
                        <div className="bg-card p-6 rounded-2xl border border-gray-800">
                             <div className="flex justify-between items-center mb-6">
                                 <h3 className="font-bold text-white text-lg">Wardrobe Health</h3>
                                 <span className={`text-3xl font-bold ${analysis.wardrobeHealth.score > 80 ? 'text-green-400' : 'text-yellow-400'}`}>
                                     {analysis.wardrobeHealth.score}/100
                                 </span>
                             </div>
                             <div className="w-full bg-gray-800 h-3 rounded-full overflow-hidden mb-3">
                                 <div className="bg-gradient-to-r from-red-500 to-green-500 h-full" style={{ width: `${analysis.wardrobeHealth.score}%` }}></div>
                             </div>
                             <p className="text-sm text-gray-400 mb-6">{analysis.wardrobeHealth.verdict}</p>
                             
                             {analysis.wardrobeHealth.missingEssentials && analysis.wardrobeHealth.missingEssentials.length > 0 && (
                                 <div className="mb-4">
                                     <p className="text-xs font-bold text-red-300 uppercase mb-3">Missing Essentials</p>
                                     <div className="flex flex-wrap gap-2">
                                         {analysis.wardrobeHealth.missingEssentials.map((item, i) => (
                                             <span key={i} className="text-xs bg-red-900/20 text-red-200 px-3 py-1.5 rounded-lg border border-red-900/50">{item}</span>
                                         ))}
                                     </div>
                                 </div>
                             )}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'outfits' && (
                <div className="space-y-6">
                    <div className="bg-neon/10 border border-neon/30 p-4 rounded-xl flex items-center justify-between">
                         <div>
                             <h4 className="font-bold text-white text-sm">Visualize All</h4>
                             <p className="text-xs text-gray-400">Generate photos for {analysis.outfits.length} outfits</p>
                         </div>
                         <Button onClick={handleBulkVisualize} className="py-2 px-4 text-xs"><Icons.Sparkles /> Start Bulk</Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {analysis.outfits?.map((outfit) => (
                            <div key={outfit.id} className="bg-card rounded-2xl overflow-hidden border border-gray-800 flex flex-col h-full">
                                <div className="p-4 border-b border-gray-800 flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="bg-neon/10 text-neon text-[10px] px-2 py-0.5 rounded border border-neon/20 font-bold">Outfit #{outfit.id}</span>
                                            <span className="text-xs text-gray-500">{outfit.style}</span>
                                        </div>
                                        <p className="text-xs text-gray-300 truncate"><span className="text-gray-500">Top:</span> {outfit.top}</p>
                                        <p className="text-xs text-gray-300 truncate"><span className="text-gray-500">Bottom:</span> {outfit.bottom}</p>
                                    </div>
                                    <div className="text-center bg-gray-900 p-2 rounded-lg">
                                        <span className="block text-lg font-bold text-white">{outfit.rating}</span>
                                        <span className="text-[8px] text-gray-500">RATING</span>
                                    </div>
                                </div>
                                
                                {/* Generated Image Area */}
                                <div className="bg-black min-h-[250px] relative flex items-center justify-center group flex-1">
                                    {generatedImages[outfit.id] ? (
                                        <div className="relative w-full h-full">
                                            <img src={generatedImages[outfit.id]} className="w-full h-full object-cover absolute inset-0" alt={`Outfit ${outfit.id}`} />
                                            <div className="absolute top-2 right-2 flex gap-2">
                                                <button onClick={() => handleShare(outfit.id)} className="bg-black/60 hover:bg-neon text-white p-2 rounded-full backdrop-blur-md transition-colors z-10"><Icons.Share /></button>
                                                <button onClick={() => handleSaveIndividualOutfit(outfit.id)} className="bg-black/60 hover:bg-neon text-white p-2 rounded-full backdrop-blur-md transition-colors z-10"><Icons.Heart /></button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center p-6">
                                            <p className="text-xs text-gray-500 mb-4 italic line-clamp-3">"{outfit.reasoning}"</p>
                                            <Button variant="outline" onClick={() => handleVisualize(outfit.id, outfit.visualPrompt)} isLoading={visualizingId === outfit.id} disabled={visualizingId !== null}>{visualizingId === outfit.id ? "Generating..." : "Visualize on Me"}</Button>
                                        </div>
                                    )}
                                </div>

                                {/* Upgrade Tip Section */}
                                <div className="p-3 bg-gray-900/50 border-t border-gray-800 flex items-start gap-3 mt-auto">
                                    <span className="text-lg">🚀</span>
                                    <div>
                                        <p className="text-[10px] text-gray-500 font-bold uppercase">Make it 10/10</p>
                                        <p className="text-xs text-white line-clamp-2">{outfit.upgradeTip || "Add a silver watch for a premium touch."}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    <div className="py-8 border-t border-gray-800 flex justify-center">
                        <Button onClick={handleSaveWardrobePlan} className="bg-gradient-to-r from-neon to-purple-600 border-none shadow-lg shadow-neon/20 px-12 py-4 text-lg">Save My Wardrobe</Button>
                    </div>
                </div>
            )}

            {activeTab === 'items' && (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {analysis.items?.map((item, i) => (
                        <div key={i} className="bg-gray-900 p-4 rounded-xl border border-gray-800 hover:border-gray-700 transition-colors">
                            <h4 className="font-bold text-sm text-white mb-2 line-clamp-1">{item.name}</h4>
                            <p className="text-xs text-gray-400 mb-1">{item.color} • {item.fit}</p>
                            <span className="inline-block mt-2 text-[10px] bg-gray-800 px-2 py-0.5 rounded text-gray-500 border border-gray-700 uppercase tracking-wide">{item.category}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
      )}
    </div>
  );
};

export default PdfWardrobe;

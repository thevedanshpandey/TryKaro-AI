import React, { useState } from 'react';
import { Button } from './Button';
import { generateWardrobePlan } from '../services/geminiService';
import { LoadingOverlay } from './LoadingOverlay';
import { WardrobeFormData, WardrobePlan, SavedWardrobeItem } from '../types';
import { Icons } from '../constants';

interface Props {
  onBack: () => void;
  onSaveItem: (item: SavedWardrobeItem) => void;
}

const QUESTIONS = [
  { id: 'budget', label: 'What is your total budget?', type: 'select', options: ['₹2,000', '₹5,000', '₹10,000', '₹20,000', '₹50,000'] },
  { id: 'gender', label: 'Your gender?', type: 'select', options: ['Male', 'Female', 'Non-Binary', 'Prefer not to say'] },
  { id: 'age', label: 'Your age?', type: 'number', placeholder: 'e.g. 24' },
  { id: 'style', label: 'Your preferred style?', type: 'select', options: ['Casual', 'Formal', 'Streetwear', 'Minimalist', 'Ethnic', 'Mix & Match'] },
  { id: 'purpose', label: 'Your main use?', type: 'select', options: ['College', 'Work / Office', 'Daily Wear', 'Party', 'Travel', 'Gym'] },
  { id: 'climate', label: 'Your climate?', type: 'select', options: ['Hot & Humid', 'Cold / Winter', 'Mixed / Moderate'] },
  { id: 'colors', label: 'Any color preferences?', type: 'text', placeholder: 'e.g. Pastels, Black & White, Earth Tones...' },
  { id: 'specifics', label: 'Any specific items you want or don’t want?', type: 'text', placeholder: 'e.g. No skinny jeans, need a blazer...' }
];

const WardrobeBuilder: React.FC<Props> = ({ onBack, onSaveItem }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<WardrobeFormData>({
    budget: '',
    gender: '',
    age: '',
    style: '',
    purpose: '',
    climate: '',
    colors: '',
    specifics: ''
  });
  const [plan, setPlan] = useState<WardrobePlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [savedItemIndices, setSavedItemIndices] = useState<Set<number>>(new Set());

  const handleInputChange = (value: string) => {
    const fieldId = QUESTIONS[currentStep].id;
    setFormData(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleNext = async () => {
    if (currentStep < QUESTIONS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      // Submit
      setLoading(true);
      try {
        const result = await generateWardrobePlan(formData);
        setPlan(result);
        setSavedItemIndices(new Set()); // Reset saved state for new plan
      } catch (e) {
        alert("Couldn't generate plan. Please try again.");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSaveClick = (item: any, idx: number) => {
      onSaveItem({
          id: Date.now().toString() + idx,
          name: item.name,
          price: item.price,
          link: item.link,
          image_keyword: item.image_keyword,
          timestamp: Date.now()
      });
      // Update local state to show filled heart
      setSavedItemIndices(prev => new Set(prev).add(idx));
  };

  const progress = ((currentStep + 1) / QUESTIONS.length) * 100;
  const currentQuestion = QUESTIONS[currentStep];

  const renderInput = () => {
    switch (currentQuestion.type) {
      case 'select':
        return (
          <div className="grid grid-cols-2 gap-3 animate-in slide-in-from-right-4">
            {currentQuestion.options?.map(opt => (
              <button
                key={opt}
                onClick={() => {
                  handleInputChange(opt);
                  // Auto advance for selects after short delay for better UX
                  setTimeout(() => {
                      if (currentStep < QUESTIONS.length - 1) setCurrentStep(p => p + 1);
                  }, 200);
                }}
                className={`p-4 rounded-xl border text-left transition-all ${
                  (formData as any)[currentQuestion.id] === opt 
                    ? 'border-neon bg-neon/10 text-white shadow-[0_0_10px_rgba(255,42,109,0.2)]' 
                    : 'border-gray-700 bg-card text-gray-400 hover:border-gray-500'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        );
      case 'number':
      case 'text':
        return (
          <div className="animate-in slide-in-from-right-4">
            <input
              type={currentQuestion.type}
              value={(formData as any)[currentQuestion.id]}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder={currentQuestion.placeholder}
              className="w-full bg-card border border-gray-700 rounded-xl p-4 text-white focus:border-neon outline-none text-lg"
              autoFocus
            />
          </div>
        );
      default:
        return null;
    }
  };

  if (loading) {
      return <LoadingOverlay message="AI Stylist is searching Amazon, Flipkart & Myntra for best deals..." />;
  }

  // ---------------- RESULT VIEW ---------------- //
  if (plan) {
    return (
      <div className="min-h-screen p-4 w-full max-w-5xl mx-auto pb-24">
         <header className="flex items-center mb-8 gap-4 sticky top-0 bg-black/80 backdrop-blur-md py-4 z-10 border-b border-gray-800">
            <button onClick={() => setPlan(null)} className="text-gray-400 hover:text-white">← Back</button>
            <h1 className="text-2xl font-bold text-neon">Your Plan</h1>
         </header>

         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
             {/* Summary Card */}
             <div className="bg-gradient-to-br from-gray-900 to-black p-6 rounded-2xl border border-neon/30 shadow-lg">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-white">📌 Wardrobe Summary</h2>
                    <Icons.Sparkles />
                </div>
                <div className="space-y-3 text-sm">
                    <div className="flex justify-between border-b border-gray-800 pb-2">
                        <span className="text-gray-400">Total Budget</span>
                        <span className="font-bold text-neon">{plan.summary.totalBudget}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-800 pb-2">
                        <span className="text-gray-400">Style</span>
                        <span className="text-white">{plan.summary.style}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-400">Purpose</span>
                        <span className="text-white">{plan.summary.purpose}</span>
                    </div>
                </div>
             </div>

             {/* Budget Breakdown */}
             <div className="bg-card p-6 rounded-2xl border border-gray-800">
                <h3 className="font-bold text-white mb-6 flex items-center gap-2 text-xl">
                    🧩 Budget Breakdown
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-gray-900 p-4 rounded-xl text-center">
                        <span className="block text-gray-400 text-xs mb-1 uppercase tracking-wide">Tops</span>
                        <span className="font-bold text-white">₹{plan.breakdown.tops}</span>
                    </div>
                    <div className="bg-gray-900 p-4 rounded-xl text-center">
                        <span className="block text-gray-400 text-xs mb-1 uppercase tracking-wide">Bottoms</span>
                        <span className="font-bold text-white">₹{plan.breakdown.bottoms}</span>
                    </div>
                    <div className="bg-gray-900 p-4 rounded-xl text-center">
                        <span className="block text-gray-400 text-xs mb-1 uppercase tracking-wide">Shoes</span>
                        <span className="font-bold text-white">₹{plan.breakdown.shoes}</span>
                    </div>
                    <div className="bg-gray-900 p-4 rounded-xl text-center">
                        <span className="block text-gray-400 text-xs mb-1 uppercase tracking-wide">Accs</span>
                        <span className="font-bold text-white">₹{plan.breakdown.accessories}</span>
                    </div>
                </div>
                <div className="mt-6 pt-4 border-t border-gray-800 flex justify-between items-center">
                    <span className="text-sm text-gray-400">Total Estimated</span>
                    <span className="text-xl font-bold text-green-400">₹{plan.breakdown.totalSpent}</span>
                </div>
             </div>
         </div>

         {/* Shopping Items */}
         <h3 className="font-bold text-white mb-6 px-1 text-2xl">👕 Essential Items to Buy</h3>
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {plan.items.map((item, idx) => {
                const isSaved = savedItemIndices.has(idx);
                return (
                    <div key={idx} className="bg-card rounded-2xl overflow-hidden border border-gray-800 flex flex-col group hover:border-gray-600 transition-colors">
                        <div className="h-48 bg-gray-800 relative overflow-hidden">
                            {/* Placeholder image based on keyword */}
                            <img 
                                src={`https://source.unsplash.com/random/400x300/?fashion,${encodeURIComponent(item.image_keyword || item.name)}`} 
                                className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-500"
                                alt={item.name}
                                onError={(e) => {
                                    (e.target as HTMLImageElement).src = `https://placehold.co/400x300/1a1a1a/FFF?text=${encodeURIComponent(item.name)}`;
                                }}
                            />
                            <div className="absolute top-2 right-2 bg-black/70 text-white text-xs font-bold px-3 py-1.5 rounded backdrop-blur-md">
                                {item.price}
                            </div>
                        </div>
                        <div className="p-5 flex-1 flex flex-col">
                            <div className="flex justify-between items-start mb-4">
                                <h4 className="font-bold text-white text-lg line-clamp-1">{item.name}</h4>
                                <span className="text-[10px] bg-green-900/50 text-green-400 border border-green-500/30 px-2 py-0.5 rounded flex items-center gap-1 shrink-0">
                                    ✓ Verified
                                </span>
                            </div>
                            
                            <div className="mt-auto grid grid-cols-4 gap-2">
                                <a 
                                    href={item.link} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="col-span-3 bg-white text-black text-center text-sm font-bold py-3 rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center"
                                >
                                    Buy Now
                                </a>
                                <button 
                                    onClick={() => handleSaveClick(item, idx)}
                                    className={`border rounded-xl flex items-center justify-center transition-all ${isSaved ? 'bg-neon border-neon text-white shadow-[0_0_10px_rgba(255,42,109,0.5)]' : 'bg-gray-800 text-neon border-gray-700 hover:bg-gray-700 hover:border-neon'}`}
                                >
                                    {isSaved ? <Icons.HeartFilled /> : <Icons.Heart />}
                                </button>
                            </div>
                            <p className="text-[10px] text-center text-gray-500 mt-3">Found on Amazon/Flipkart/Myntra</p>
                        </div>
                    </div>
                );
            })}
         </div>

         {/* Outfit Ideas */}
         <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800">
            <h3 className="font-bold text-white mb-8 text-xl">🥼 Outfit Combinations</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {plan.outfits.map((outfit, idx) => (
                    <div key={idx} className="relative pl-6 border-l-2 border-neon/30 pb-2">
                        <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-black border-2 border-neon"></div>
                        <h4 className="font-bold text-neon text-md mb-2">{outfit.name}</h4>
                        <p className="text-sm text-gray-300 leading-relaxed">{outfit.description}</p>
                    </div>
                ))}
            </div>
         </div>

         <div className="mt-12 text-center">
             <Button variant="outline" onClick={() => setPlan(null)}>Start New Plan</Button>
         </div>
      </div>
    );
  }

  // ---------------- QUESTIONNAIRE VIEW ---------------- //
  return (
    <div className="min-h-screen p-4 w-full max-w-5xl mx-auto pb-20 flex flex-col">
      <header className="flex items-center mb-6 gap-4">
        <button onClick={onBack} className="text-gray-400 hover:text-white">←</button>
        <h1 className="text-xl font-bold">Smart Wardrobe</h1>
      </header>

      {/* Progress Bar */}
      <div className="w-full bg-gray-800 h-1.5 rounded-full mb-10 max-w-xl mx-auto">
        <div 
            className="bg-neon h-full rounded-full transition-all duration-300 ease-out" 
            style={{ width: `${progress}%` }}
        ></div>
      </div>

      <div className="flex-1 flex flex-col justify-center max-w-xl mx-auto w-full">
        <div className="mb-3 text-neon font-bold text-xs tracking-widest uppercase">
            QUESTION {currentStep + 1} OF {QUESTIONS.length}
        </div>
        <h2 className="text-3xl font-bold text-white mb-8 leading-tight">
            {currentQuestion.label}
        </h2>

        {renderInput()}
      </div>

      <div className="mt-12 max-w-xl mx-auto w-full">
        <Button 
            fullWidth 
            onClick={handleNext}
            disabled={!(formData as any)[currentQuestion.id]}
            className={!(formData as any)[currentQuestion.id] ? "opacity-50" : ""}
        >
            {currentStep === QUESTIONS.length - 1 ? 'Generate My Wardrobe' : 'Next Step'}
        </Button>
      </div>
    </div>
  );
};

export default WardrobeBuilder;
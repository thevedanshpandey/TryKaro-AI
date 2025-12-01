
import React, { useState, useRef } from 'react';
import { UserProfile } from '../types';
import { BODY_SHAPES, OCCUPATIONS } from '../constants';
import { Button } from './Button';
import { Icons } from '../constants';

interface OnboardingProps {
  onComplete: (profile: UserProfile) => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [gender, setGender] = useState('');
  const [occupation, setOccupation] = useState('');
  
  const [height, setHeight] = useState('165');
  const [weight, setWeight] = useState('60');
  const [bodyShape, setBodyShape] = useState(BODY_SHAPES[0]);
  const [skinTone, setSkinTone] = useState(10);
  const [avatarImage, setAvatarImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAvatarClick = () => {
    alert("⚠️ IMPORTANT: Please upload a clear selfie where your face is fully visible. Avoid masks, sunglasses, or heavy shadows for the best Try-On results!");
    fileInputRef.current?.click();
  };

  const handleSubmit = () => {
    const profile: UserProfile = {
      name,
      city,
      gender,
      occupation,
      height,
      weight,
      bodyShape,
      skinTone,
      avatarImage,
      hasPremium: false,
      tokens: 50 // New user bonus
    };
    onComplete(profile);
  };

  const renderStep1 = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">Welcome to <span className="text-neon">TryKaro</span></h1>
        <p className="text-gray-400">Your Personal AI Stylist</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">Let's start with your name</label>
        <input 
          type="text" 
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-card border border-gray-700 rounded-xl p-4 text-white focus:border-neon focus:outline-none text-lg"
          placeholder="e.g. Rahul, Ananya..."
          autoFocus
        />
      </div>

      <Button 
        fullWidth 
        onClick={() => name && setStep(2)}
        disabled={!name}
      >
        Next
      </Button>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
       <div className="text-center">
        <h2 className="text-2xl font-bold text-white">Tell us about yourself</h2>
        <p className="text-gray-400 text-sm">Help AI suggest styles that fit your life.</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">City</label>
          <input 
            type="text" 
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full bg-card border border-gray-700 rounded-xl p-3 text-white focus:border-neon focus:outline-none"
            placeholder="e.g. Mumbai, Bangalore..."
          />
        </div>

        <div>
           <label className="block text-sm font-medium text-gray-400 mb-1">Gender</label>
           <div className="grid grid-cols-3 gap-2">
               {['Male', 'Female', 'Other'].map(g => (
                   <button
                        key={g}
                        onClick={() => setGender(g)}
                        className={`p-3 rounded-xl text-xs font-bold border transition-all ${gender === g ? 'bg-neon text-white border-neon' : 'bg-card text-gray-400 border-gray-700'}`}
                   >
                       {g}
                   </button>
               ))}
           </div>
        </div>

        <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Who are you?</label>
            <select 
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
                className="w-full bg-card border border-gray-700 rounded-xl p-3 text-white focus:border-neon focus:outline-none appearance-none"
            >
                <option value="" disabled>Select your role...</option>
                {OCCUPATIONS.map(occ => (
                    <option key={occ} value={occ}>{occ}</option>
                ))}
            </select>
        </div>
      </div>

      <div className="flex gap-3">
         <Button variant="secondary" onClick={() => setStep(1)} className="flex-1">Back</Button>
         <Button 
            className="flex-1"
            onClick={() => city && gender && occupation && setStep(3)}
            disabled={!city || !gender || !occupation}
         >
            Next
         </Button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
       <div className="text-center">
        <h2 className="text-2xl font-bold text-white">Create Your Look</h2>
        <p className="text-gray-400 text-sm">Upload a selfie for accurate Try-Ons.</p>
      </div>

      <div className="flex justify-center my-2">
        <div 
          onClick={handleAvatarClick}
          className={`relative w-28 h-28 rounded-full border-2 border-dashed flex items-center justify-center cursor-pointer overflow-hidden transition-colors ${avatarImage ? 'border-neon' : 'border-gray-600 bg-gray-800'}`}
        >
          {avatarImage ? (
            <img src={avatarImage} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <div className="text-center p-2 text-gray-400">
              <Icons.Camera />
              <span className="text-[10px] block mt-1">Selfie</span>
            </div>
          )}
        </div>
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept="image/*"
          onChange={handleImageUpload}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-gray-400">Height (cm)</label>
          <input 
            type="number" 
            value={height}
            onChange={(e) => setHeight(e.target.value)}
            className="w-full bg-card border border-gray-700 rounded-lg p-3 text-white"
          />
        </div>
        <div>
          <label className="text-xs text-gray-400">Weight (kg)</label>
          <input 
            type="number" 
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="w-full bg-card border border-gray-700 rounded-lg p-3 text-white"
          />
        </div>
      </div>

      <div>
        <label className="text-xs text-gray-400 mb-2 block">Body Shape</label>
        <div className="grid grid-cols-2 gap-2">
          {BODY_SHAPES.slice(0, 4).map(shape => (
            <button 
              key={shape}
              onClick={() => setBodyShape(shape)}
              className={`p-2 rounded-lg text-[10px] border transition-all ${bodyShape === shape ? 'border-neon bg-neon/10 text-white' : 'border-gray-700 bg-card text-gray-400'}`}
            >
              {shape}
            </button>
          ))}
        </div>
      </div>

       <div>
        <label className="text-xs text-gray-400 mb-2 block">Skin Tone</label>
        <input 
          type="range" 
          min="1" 
          max="20" 
          value={skinTone}
          onChange={(e) => setSkinTone(parseInt(e.target.value))}
          className="w-full accent-neon h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-gray-500 mt-1">
            <span>Fair</span>
            <span>Medium</span>
            <span>Dark</span>
        </div>
      </div>

      <div className="flex gap-3">
         <Button variant="secondary" onClick={() => setStep(2)} className="flex-1">Back</Button>
         <Button 
            className="flex-1"
            onClick={handleSubmit}
            disabled={!avatarImage}
         >
            Complete
         </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-black">
      <div className="w-full max-w-md">
        {step === 1 ? renderStep1() : step === 2 ? renderStep2() : renderStep3()}
      </div>
    </div>
  );
};

export default Onboarding;

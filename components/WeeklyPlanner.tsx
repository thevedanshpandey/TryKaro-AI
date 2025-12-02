
import React, { useState, useEffect } from 'react';
import { UserProfile, WeeklyPlanDay, GeneratedLook } from '../types';
import { Button } from './Button';
import { Icons } from '../constants';

interface Props {
  user: UserProfile;
  onBack: () => void;
  onSavePlan: (plan: WeeklyPlanDay[], time: string | undefined) => void;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const WeeklyPlanner: React.FC<Props> = ({ user, onBack, onSavePlan }) => {
  const [plan, setPlan] = useState<WeeklyPlanDay[]>([]);
  const [notificationTime, setNotificationTime] = useState<string>('08:00');
  const [selectingForDay, setSelectingForDay] = useState<string | null>(null);
  
  // Available Outfits (Combine Saved Looks & Wardrobe Analysis Looks)
  const [availableOutfits, setAvailableOutfits] = useState<any[]>([]);

  useEffect(() => {
    // Initialize Plan from User Profile or Default
    if (user.weeklyPlan && user.weeklyPlan.length > 0) {
        setPlan(user.weeklyPlan);
    } else {
        setPlan(DAYS.map(day => ({
            day,
            outfitId: null,
            outfitImage: null,
            outfitName: null,
            isWorn: false
        })));
    }

    if (user.notificationTime) {
        setNotificationTime(user.notificationTime);
    }

    // Flatten Available Outfits
    const looks = [
        ...(user.savedLooks || []).map(l => ({ id: l.id, image: l.image, name: l.description, type: 'Try-On' })),
        ...(user.wardrobeAnalysis?.outfits || []).map(o => ({ 
            id: `wa-${o.id}`, 
            image: o.generatedImage, 
            name: `${o.style} (${o.top} + ${o.bottom})`,
            type: 'Wardrobe' 
        }))
    ].filter(o => o.image); // Only allow outfits with images

    setAvailableOutfits(looks);
  }, [user]);

  const handleSelectOutfit = (outfit: any) => {
      if (!selectingForDay) return;
      
      const updatedPlan = plan.map(d => {
          if (d.day === selectingForDay) {
              return {
                  ...d,
                  outfitId: outfit.id,
                  outfitImage: outfit.image,
                  outfitName: outfit.name,
                  isWorn: false
              };
          }
          return d;
      });
      
      setPlan(updatedPlan);
      setSelectingForDay(null);
  };

  const toggleWorn = (day: string) => {
      const updatedPlan = plan.map(d => {
          if (d.day === day) return { ...d, isWorn: !d.isWorn };
          return d;
      });
      setPlan(updatedPlan);
  };

  const handleSave = () => {
      onSavePlan(plan, notificationTime);
      
      // Request Notification Permission
      if ("Notification" in window) {
          Notification.requestPermission().then(permission => {
              if (permission === "granted") {
                  alert(`Plan Saved! We'll notify you daily at ${notificationTime}`);
              } else {
                  alert("Plan Saved! Enable notifications to get daily reminders.");
              }
          });
      } else {
           alert("Plan Saved!");
      }
  };

  const getToday = () => {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return days[new Date().getDay()];
  };

  const currentDayName = getToday();

  return (
    <div className="min-h-screen p-4 w-full max-w-5xl mx-auto pb-20">
      
      {/* Outfit Selector Modal */}
      {selectingForDay && (
          <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in">
              <div className="bg-card w-full max-w-2xl max-h-[80vh] rounded-3xl border border-gray-700 flex flex-col">
                  <div className="p-6 border-b border-gray-700 flex justify-between items-center">
                      <h3 className="text-xl font-bold text-white">Select Outfit for <span className="text-neon">{selectingForDay}</span></h3>
                      <button onClick={() => setSelectingForDay(null)} className="text-gray-400 hover:text-white">✕</button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-6 grid grid-cols-2 md:grid-cols-3 gap-4">
                      {availableOutfits.length === 0 ? (
                          <div className="col-span-full text-center text-gray-500 py-10">
                              No outfits found. Generate some in "Try-On" or "My Wardrobe" first!
                          </div>
                      ) : (
                          availableOutfits.map((outfit) => (
                              <div 
                                key={outfit.id} 
                                onClick={() => handleSelectOutfit(outfit)}
                                className="bg-gray-900 rounded-xl overflow-hidden cursor-pointer border border-gray-800 hover:border-neon transition-all hover:scale-105 group"
                              >
                                  <div className="h-40 bg-black">
                                      <img src={outfit.image} className="w-full h-full object-cover" alt="Outfit" />
                                  </div>
                                  <div className="p-3">
                                      <p className="text-xs text-white font-bold line-clamp-1">{outfit.name}</p>
                                      <p className="text-[10px] text-gray-500">{outfit.type}</p>
                                  </div>
                              </div>
                          ))
                      )}
                  </div>
              </div>
          </div>
      )}

      <header className="flex items-center mb-8 gap-4 justify-between">
         <div className="flex items-center gap-4">
            <button onClick={onBack} className="text-gray-400 hover:text-white">
                <Icons.ArrowLeft />
            </button>
            <div>
                <h1 className="text-2xl font-bold text-white">Weekly Planner</h1>
                <p className="text-xs text-gray-400">Organize your style, stress less.</p>
            </div>
         </div>
         
         <div className="bg-gray-900 border border-gray-700 rounded-full px-4 py-1.5 flex items-center gap-2">
             <span className="text-xs text-gray-400">Reminder:</span>
             <input 
                type="time" 
                value={notificationTime}
                onChange={(e) => setNotificationTime(e.target.value)}
                className="bg-transparent text-white text-xs font-bold outline-none cursor-pointer"
             />
         </div>
      </header>

      <div className="space-y-4">
          {plan.map((dayPlan) => {
              const isToday = dayPlan.day === currentDayName;
              const hasOutfit = !!dayPlan.outfitImage;

              return (
                  <div 
                    key={dayPlan.day} 
                    className={`
                        relative overflow-hidden rounded-2xl border transition-all duration-300
                        ${isToday ? 'bg-gradient-to-r from-gray-900 via-gray-900 to-blue-900/20 border-blue-500/50 shadow-lg shadow-blue-900/20' : 'bg-card border-gray-800 hover:border-gray-700'}
                    `}
                  >
                      {isToday && <div className="absolute top-0 right-0 bg-blue-600 text-[10px] font-bold px-3 py-1 rounded-bl-xl text-white">TODAY</div>}
                      
                      <div className="flex flex-col sm:flex-row items-center p-4 gap-4 sm:gap-6">
                          {/* Day Column */}
                          <div className="min-w-[100px] text-center sm:text-left">
                              <h3 className={`text-lg font-bold ${isToday ? 'text-blue-400' : 'text-white'}`}>{dayPlan.day}</h3>
                              <p className="text-xs text-gray-500">{hasOutfit ? 'Outfit Set' : 'No Outfit'}</p>
                          </div>

                          {/* Outfit Display Area */}
                          <div className="flex-1 w-full sm:w-auto">
                              {hasOutfit ? (
                                  <div className="flex items-center gap-4 bg-black/40 p-2 rounded-xl border border-white/5">
                                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-800 flex-shrink-0 cursor-pointer" onClick={() => setSelectingForDay(dayPlan.day)}>
                                          <img src={dayPlan.outfitImage!} className="w-full h-full object-cover" alt="Outfit" />
                                      </div>
                                      <div className="flex-1 min-w-0" onClick={() => setSelectingForDay(dayPlan.day)}>
                                          <p className="text-sm text-white font-medium truncate">{dayPlan.outfitName}</p>
                                          <p className="text-xs text-neon mt-1 cursor-pointer hover:underline">Change Outfit</p>
                                      </div>
                                      
                                      {/* Checkmark */}
                                      <button 
                                        onClick={() => toggleWorn(dayPlan.day)}
                                        className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all ${dayPlan.isWorn ? 'bg-green-500 border-green-500 text-white' : 'bg-transparent border-gray-600 text-gray-600 hover:border-gray-400'}`}
                                        title="Mark as Worn"
                                      >
                                          {dayPlan.isWorn ? <span className="font-bold text-lg">✓</span> : <span className="text-xs">Wear</span>}
                                      </button>
                                  </div>
                              ) : (
                                  <div 
                                    onClick={() => setSelectingForDay(dayPlan.day)}
                                    className="h-16 border-2 border-dashed border-gray-700 rounded-xl flex items-center justify-center cursor-pointer hover:border-neon hover:bg-neon/5 transition-all group"
                                  >
                                      <p className="text-sm text-gray-500 group-hover:text-neon flex items-center gap-2">
                                          <span className="text-xl">+</span> Add Outfit
                                      </p>
                                  </div>
                              )}
                          </div>
                      </div>
                  </div>
              );
          })}
      </div>

      <div className="mt-8 flex justify-center pb-8">
          <Button onClick={handleSave} className="px-12 py-4 text-lg shadow-xl shadow-neon/20">
              Save Weekly Plan
          </Button>
      </div>

    </div>
  );
};
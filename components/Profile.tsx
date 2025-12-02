
import React, { useState, useRef } from 'react';
import { UserProfile } from '../types';
import { Icons } from '../constants';
import { Button } from './Button';
import { ImageCropper } from './ImageCropper';

interface Props {
  user: UserProfile;
  onBack: () => void;
  onOpenWardrobe: () => void;
  onDeleteItem: (id: string) => void;
  onSignOut: () => void;
  onUpdateAvatar: (base64: string) => void;
}

const Profile: React.FC<Props> = ({ user, onBack, onOpenWardrobe, onDeleteItem, onSignOut, onUpdateAvatar }) => {
  const [activeTab, setActiveTab] = useState<'wardrobe' | 'looks' | 'wishlist'>('wardrobe');
  
  // Avatar Update State
  const [rawImage, setRawImage] = useState<string | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Sign Out Confirmation State
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setRawImage(reader.result as string);
        setIsCropping(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropComplete = (croppedBase64: string) => {
      onUpdateAvatar(croppedBase64);
      setIsCropping(false);
      setRawImage(null);
  };

  const confirmSignOut = () => {
      setShowSignOutConfirm(false);
      onSignOut();
  };

  // If Cropping
  if (isCropping && rawImage) {
      return (
          <ImageCropper 
             imageSrc={rawImage}
             onCancel={() => { setIsCropping(false); setRawImage(null); }}
             onCropComplete={handleCropComplete}
          />
      );
  }

  const hasValidAvatar = user.avatarImage && (user.avatarImage.startsWith('data:') || user.avatarImage.startsWith('http'));

  return (
    <div className="min-h-screen bg-black pb-20">
      
      {/* Custom Sign Out Modal */}
      {showSignOutConfirm && (
          <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-6 backdrop-blur-md animate-in fade-in">
              <div className="bg-card w-full max-w-sm rounded-2xl p-6 border border-red-900 shadow-2xl relative">
                  <div className="w-14 h-14 bg-red-900/20 rounded-full flex items-center justify-center mb-4 text-red-500 mx-auto border border-red-900/50">
                      <Icons.Trash />
                  </div>
                  <h3 className="text-xl font-bold text-white text-center mb-2">Sign Out?</h3>
                  <p className="text-gray-400 text-sm text-center mb-6 leading-relaxed">
                      ⚠️ <strong>Warning:</strong> All generated images are stored locally on this device for privacy. 
                      <br/><br/>
                      Signing out will <strong>permanently delete these images</strong> from this device. Your profile details and credits are safe in the cloud.
                  </p>
                  
                  <div className="flex gap-3">
                      <Button variant="secondary" onClick={() => setShowSignOutConfirm(false)} className="flex-1">Cancel</Button>
                      <button 
                          onClick={confirmSignOut}
                          className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors py-3 px-6 flex items-center justify-center"
                      >
                          Yes, Sign Out
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Glassmorphism Header */}
      <div className="relative h-64 lg:h-80 w-full bg-gradient-to-b from-gray-800 to-black overflow-hidden">
        <div className="absolute inset-0 opacity-30">
             <div className="absolute top-0 right-0 w-64 h-64 bg-neon/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
             <div className="absolute bottom-0 left-0 w-40 h-40 bg-blue-500/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2"></div>
        </div>
        
        <div className="absolute top-4 left-4 z-50">
            <button onClick={onBack} className="text-white hover:text-neon bg-black/50 p-2 rounded-full backdrop-blur-md transition-colors border border-white/10">
                <Icons.ArrowLeft />
            </button>
        </div>
        
        <div className="absolute top-4 right-4 z-50">
             <button onClick={() => setShowSignOutConfirm(true)} className="text-xs bg-red-900/40 text-red-200 px-3 py-1.5 rounded-full border border-red-800/50 backdrop-blur-md hover:bg-red-800 transition-colors font-bold">
                 Sign Out
             </button>
        </div>

        <div className="relative z-10 flex flex-col items-center justify-center h-full pt-8">
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <div className="w-24 h-24 lg:w-32 lg:h-32 rounded-full p-1 bg-gradient-to-tr from-neon to-blue-500 shadow-xl mb-3">
                    <div className="w-full h-full rounded-full overflow-hidden border-2 border-black bg-gray-800">
                        {hasValidAvatar ? (
                            <img src={user.avatarImage!} className="w-full h-full object-cover" alt="Avatar" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-gray-500">
                                {user.name.charAt(0)}
                            </div>
                        )}
                    </div>
                </div>
                {/* Edit Overlay */}
                <div className="absolute bottom-3 right-0 lg:bottom-4 lg:right-2 bg-white text-black p-1.5 rounded-full border border-gray-300 shadow-lg hover:scale-110 transition-transform">
                     <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                </div>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
            </div>

            <h1 className="text-2xl lg:text-4xl font-bold text-white mb-1">{user.name}</h1>
            <p className="text-xs lg:text-sm text-gray-400">{user.occupation} • {user.city}</p>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="max-w-4xl mx-auto -mt-6 relative z-20 px-4 mb-8">
         <div className="bg-gray-900/80 backdrop-blur-lg border border-gray-800 rounded-2xl p-4 flex justify-between shadow-2xl">
             <div className="text-center flex-1 border-r border-gray-800">
                 <p className="text-xs text-gray-500 uppercase tracking-wide">Height</p>
                 <p className="font-bold text-white text-lg">{user.height}cm</p>
             </div>
             <div className="text-center flex-1 border-r border-gray-800">
                 <p className="text-xs text-gray-500 uppercase tracking-wide">Shape</p>
                 <p className="font-bold text-white text-lg">{user.bodyShape}</p>
             </div>
             <div className="text-center flex-1">
                 <p className="text-xs text-gray-500 uppercase tracking-wide">Looks</p>
                 <p className="font-bold text-neon text-lg">{user.savedLooks?.length || 0}</p>
             </div>
         </div>
      </div>

      <div className="w-full max-w-5xl mx-auto px-4 mt-6">
          {/* Tabs */}
          <div className="flex bg-gray-900 p-1.5 rounded-xl mb-8 max-w-lg mx-auto">
              <button 
                onClick={() => setActiveTab('wardrobe')}
                className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'wardrobe' ? 'bg-gray-800 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
              >
                Analysis
              </button>
              <button 
                onClick={() => setActiveTab('looks')}
                className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'looks' ? 'bg-gray-800 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
              >
                Saved Looks
              </button>
              <button 
                onClick={() => setActiveTab('wishlist')}
                className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'wishlist' ? 'bg-gray-800 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
              >
                Wishlist
              </button>
          </div>

          {/* Content */}
          <div className="animate-in slide-in-from-bottom-2 duration-300">
              {activeTab === 'wardrobe' && (
                  <div className="max-w-2xl mx-auto">
                    {user.wardrobeAnalysis ? (
                        <div 
                            onClick={onOpenWardrobe}
                            className="bg-gradient-to-br from-gray-900 to-black p-6 rounded-3xl border border-gray-800 cursor-pointer group hover:border-neon/50 transition-all shadow-xl"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="font-bold text-white text-xl">Current Wardrobe Plan</h3>
                                    <p className="text-xs text-gray-400 mt-1">Tap to view full details</p>
                                </div>
                                <span className="bg-neon/10 text-neon p-3 rounded-full"><Icons.Shirt /></span>
                            </div>
                            <p className="text-sm text-gray-300 line-clamp-3 mb-6 leading-relaxed">{user.wardrobeAnalysis.summary}</p>
                            
                            <div className="flex gap-3">
                                <span className="text-xs bg-gray-800 text-white px-3 py-1.5 rounded-lg border border-gray-700">
                                    {user.wardrobeAnalysis.outfits.length} Outfits
                                </span>
                                {user.wardrobeAnalysis.wardrobeHealth && (
                                    <span className={`text-xs px-3 py-1.5 rounded-lg border ${user.wardrobeAnalysis.wardrobeHealth.score > 80 ? 'bg-green-900/20 text-green-400 border-green-900' : 'bg-yellow-900/20 text-yellow-400 border-yellow-900'}`}>
                                        Health: {user.wardrobeAnalysis.wardrobeHealth.score}/100
                                    </span>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-16 border-2 border-dashed border-gray-800 rounded-3xl">
                            <p className="text-gray-500 text-sm mb-6">No analysis generated yet.</p>
                            <Button onClick={onOpenWardrobe} className="mx-auto">Upload Wardrobe PDF</Button>
                        </div>
                    )}
                  </div>
              )}

              {activeTab === 'looks' && (
                  <div>
                      {(!user.savedLooks || user.savedLooks.length === 0) ? (
                           <div className="text-center py-20 text-gray-500">No saved looks yet. Start creating!</div>
                      ) : (
                          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                              {user.savedLooks.map((look) => (
                                  <div key={look.id} className="bg-card rounded-xl overflow-hidden border border-gray-800 relative group aspect-[3/4]">
                                      {look.image ? (
                                        <img src={look.image} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt="saved" />
                                      ) : (
                                        <div className="w-full h-full bg-gray-900 flex items-center justify-center text-gray-600 text-xs text-center p-2">
                                            Image Lost (Local)
                                        </div>
                                      )}
                                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                                          <p className="text-xs text-white line-clamp-2 font-medium">{look.description}</p>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      )}
                  </div>
              )}

              {activeTab === 'wishlist' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {(!user.savedItems || user.savedItems.length === 0) ? (
                          <div className="col-span-full text-center py-20 text-gray-500">Your wishlist is empty.</div>
                      ) : (
                          user.savedItems.map((item) => (
                            <div key={item.id} className="bg-card p-4 rounded-xl border border-gray-800 flex gap-4 items-center group hover:border-gray-700 transition-colors">
                                <div className="w-16 h-16 bg-gray-800 rounded-lg overflow-hidden flex-shrink-0">
                                    <img 
                                        src={`https://source.unsplash.com/random/200x200/?fashion,${encodeURIComponent(item.image_keyword || item.name)}`} 
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                                        alt={item.name}
                                    />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-white text-sm truncate">{item.name}</h4>
                                    <p className="text-neon text-sm font-bold mt-1">{item.price}</p>
                                </div>
                                <div className="flex flex-col gap-2">
                                     <a href={item.link} target="_blank" className="bg-white text-black text-[10px] font-bold px-3 py-1.5 rounded-lg hover:bg-gray-200 transition-colors text-center">Buy</a>
                                     <button onClick={() => onDeleteItem(item.id)} className="text-gray-500 hover:text-red-500 text-xs p-1"><Icons.Trash /></button>
                                </div>
                            </div>
                          ))
                      )}
                  </div>
              )}
          </div>
      </div>
    </div>
  );
};

export default Profile;

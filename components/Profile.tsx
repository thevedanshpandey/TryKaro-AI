
import React, { useState } from 'react';
import { UserProfile } from '../types';
import { Icons } from '../constants';
import { Button } from './Button';

interface Props {
  user: UserProfile;
  onBack: () => void;
  onOpenWardrobe: () => void;
  onDeleteItem: (id: string) => void;
}

const Profile: React.FC<Props> = ({ user, onBack, onOpenWardrobe, onDeleteItem }) => {
  const [activeTab, setActiveTab] = useState<'wardrobe' | 'looks' | 'wishlist'>('wardrobe');

  return (
    <div className="min-h-screen bg-black pb-20">
      {/* Glassmorphism Header */}
      <div className="relative h-64 w-full bg-gradient-to-b from-gray-800 to-black overflow-hidden">
        <div className="absolute inset-0 opacity-30">
             <div className="absolute top-0 right-0 w-64 h-64 bg-neon/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
             <div className="absolute bottom-0 left-0 w-40 h-40 bg-blue-500/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2"></div>
        </div>
        
        <div className="absolute top-4 left-4 z-50">
            <button onClick={onBack} className="text-white hover:text-neon bg-black/50 p-2 rounded-full backdrop-blur-md transition-colors border border-white/10">
                <Icons.ArrowLeft />
            </button>
        </div>

        <div className="relative z-10 flex flex-col items-center justify-center h-full pt-8">
            <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-neon to-blue-500 shadow-xl mb-3">
                <div className="w-full h-full rounded-full overflow-hidden border-2 border-black">
                    {user.avatarImage ? (
                        <img src={user.avatarImage} className="w-full h-full object-cover" alt="Avatar" />
                    ) : <div className="w-full h-full bg-gray-800"></div>}
                </div>
            </div>
            <h1 className="text-2xl font-bold text-white">{user.name}</h1>
            <p className="text-xs text-gray-400">{user.occupation} • {user.city}</p>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="max-w-md mx-auto -mt-6 relative z-20 px-4">
         <div className="bg-gray-900/80 backdrop-blur-lg border border-gray-800 rounded-xl p-3 flex justify-between shadow-2xl">
             <div className="text-center flex-1 border-r border-gray-800">
                 <p className="text-xs text-gray-500 uppercase">Height</p>
                 <p className="font-bold text-white">{user.height}cm</p>
             </div>
             <div className="text-center flex-1 border-r border-gray-800">
                 <p className="text-xs text-gray-500 uppercase">Shape</p>
                 <p className="font-bold text-white">{user.bodyShape}</p>
             </div>
             <div className="text-center flex-1">
                 <p className="text-xs text-gray-500 uppercase">Looks</p>
                 <p className="font-bold text-neon">{user.savedLooks?.length || 0}</p>
             </div>
         </div>
      </div>

      <div className="max-w-md mx-auto px-4 mt-6">
          {/* Tabs */}
          <div className="flex bg-gray-900 p-1 rounded-xl mb-6">
              <button 
                onClick={() => setActiveTab('wardrobe')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'wardrobe' ? 'bg-gray-800 text-white shadow-lg' : 'text-gray-500'}`}
              >
                Analysis
              </button>
              <button 
                onClick={() => setActiveTab('looks')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'looks' ? 'bg-gray-800 text-white shadow-lg' : 'text-gray-500'}`}
              >
                Saved Looks
              </button>
              <button 
                onClick={() => setActiveTab('wishlist')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'wishlist' ? 'bg-gray-800 text-white shadow-lg' : 'text-gray-500'}`}
              >
                Wishlist
              </button>
          </div>

          {/* Content */}
          <div className="animate-in slide-in-from-bottom-2 duration-300">
              {activeTab === 'wardrobe' && (
                  <div>
                    {user.wardrobeAnalysis ? (
                        <div 
                            onClick={onOpenWardrobe}
                            className="bg-gradient-to-br from-gray-900 to-black p-5 rounded-2xl border border-gray-800 cursor-pointer group hover:border-neon/50 transition-all"
                        >
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h3 className="font-bold text-white text-lg">Current Wardrobe Plan</h3>
                                    <p className="text-xs text-gray-400">Created recently</p>
                                </div>
                                <span className="bg-neon/10 text-neon p-2 rounded-full"><Icons.Shirt /></span>
                            </div>
                            <p className="text-sm text-gray-300 line-clamp-3 mb-4">{user.wardrobeAnalysis.summary}</p>
                            
                            <div className="flex gap-2">
                                <span className="text-[10px] bg-gray-800 text-white px-2 py-1 rounded border border-gray-700">
                                    {user.wardrobeAnalysis.outfits.length} Outfits
                                </span>
                                {user.wardrobeAnalysis.wardrobeHealth && (
                                    <span className={`text-[10px] px-2 py-1 rounded border ${user.wardrobeAnalysis.wardrobeHealth.score > 80 ? 'bg-green-900/20 text-green-400 border-green-900' : 'bg-yellow-900/20 text-yellow-400 border-yellow-900'}`}>
                                        Health: {user.wardrobeAnalysis.wardrobeHealth.score}/100
                                    </span>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-10 border border-dashed border-gray-800 rounded-2xl">
                            <p className="text-gray-500 text-sm mb-4">No analysis yet.</p>
                            <Button onClick={onOpenWardrobe} className="mx-auto">Upload Wardrobe PDF</Button>
                        </div>
                    )}
                  </div>
              )}

              {activeTab === 'looks' && (
                  <div>
                      {(!user.savedLooks || user.savedLooks.length === 0) ? (
                           <div className="text-center py-10 text-gray-500">No saved looks yet.</div>
                      ) : (
                          <div className="grid grid-cols-2 gap-4">
                              {user.savedLooks.map((look) => (
                                  <div key={look.id} className="bg-card rounded-xl overflow-hidden border border-gray-800 relative group">
                                      <img src={look.image} className="w-full aspect-[3/4] object-cover" alt="saved" />
                                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                                          <p className="text-[10px] text-white line-clamp-2">{look.description}</p>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      )}
                  </div>
              )}

              {activeTab === 'wishlist' && (
                  <div className="space-y-3">
                      {(!user.savedItems || user.savedItems.length === 0) ? (
                          <div className="text-center py-10 text-gray-500">Your wishlist is empty.</div>
                      ) : (
                          user.savedItems.map((item) => (
                            <div key={item.id} className="bg-card p-3 rounded-xl border border-gray-800 flex gap-3 items-center">
                                <div className="w-14 h-14 bg-gray-800 rounded-lg overflow-hidden flex-shrink-0">
                                    <img 
                                        src={`https://source.unsplash.com/random/200x200/?fashion,${encodeURIComponent(item.image_keyword || item.name)}`} 
                                        className="w-full h-full object-cover" 
                                        alt={item.name}
                                    />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-white text-sm truncate">{item.name}</h4>
                                    <p className="text-neon text-xs font-bold">{item.price}</p>
                                </div>
                                <div className="flex gap-2">
                                     <a href={item.link} target="_blank" className="bg-white text-black text-[10px] font-bold px-3 py-1.5 rounded-lg">Buy</a>
                                     <button onClick={() => onDeleteItem(item.id)} className="text-gray-500 hover:text-red-500"><Icons.Trash /></button>
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

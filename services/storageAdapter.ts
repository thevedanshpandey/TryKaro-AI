
import { UserProfile, SavedWardrobeItem, GeneratedLook, PdfAnalysisResult } from '../types';
import { db } from '../firebaseConfig';
import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  writeBatch,
  Timestamp
} from 'firebase/firestore';
import { saveImageToDB, getImageFromDB } from './db';

// Helper: Save image locally, return ID to store in Cloud
const processImageForStorage = async (imageBase64: string | null | undefined): Promise<string | null> => {
    if (!imageBase64) return null;
    if (imageBase64.length < 500 && (imageBase64.startsWith('img_') || imageBase64.startsWith('http'))) {
        return imageBase64;
    }

    try {
        const result = await saveImageToDB(imageBase64);
        if (result && result.length > 2000) {
            return null;
        }
        return result;
    } catch (e) {
        return null;
    }
};

// Helper: Resolve ID from Cloud to local Base64
const resolveImageFromStorage = async (imageId: string | null | undefined): Promise<string | null> => {
    if (!imageId) return null;
    
    try {
        const localImage = await getImageFromDB(imageId);
        return localImage || imageId;
    } catch (e) {
        return imageId;
    }
};

export const saveUserProfileToStorage = async (profile: UserProfile, userId: string): Promise<void> => {
    if (!userId) return;

    // --- BATCH 1: CRITICAL CORE DATA (Profile & Subscription) ---
    // If this fails, we must throw an error so the UI knows the plan update failed.
    try {
        const batch = writeBatch(db);

        // 1. Process Avatar
        const avatarId = await processImageForStorage(profile.avatarImage);

        // 2. User Profile (Core Data)
        const userRef = doc(db, 'users', userId);
        batch.set(userRef, {
            user_id: userId,
            name: profile.name || '',
            city: profile.city || '',
            gender: profile.gender || '',
            occupation: profile.occupation || '',
            height: profile.height || '',
            weight: profile.weight || '',
            bodyShape: profile.bodyShape || '',
            skinTone: profile.skinTone || 10,
            avatarImage: avatarId, 
            updatedAt: Timestamp.now()
        }, { merge: true });

        // 3. Subscriptions (Billing Data)
        const subRef = doc(db, 'subscriptions', userId);
        batch.set(subRef, {
            user_id: userId,
            planType: profile.planType || 'Free',
            priceTier: profile.priceTier ?? 0,
            tokens: profile.tokens ?? 50,
            tryOnLimit: profile.tryOnLimit ?? 2,
            tryOnUsed: profile.tryOnUsed ?? 0,
            hasPremiumFeatures: profile.hasPremiumFeatures ?? false,
            updatedAt: Timestamp.now()
        }, { merge: true });

        await batch.commit();
        console.log("✅ Core profile & subscription saved successfully.");

    } catch (e) {
        console.error("❌ CRITICAL SAVE ERROR (Core):", e);
        throw e; // Stop execution, alert user in App.tsx
    }

    // --- BATCH 2: SAVED ITEMS (Silent Fail Allowed) ---
    if (profile.savedItems && profile.savedItems.length > 0) {
        try {
            const wishlistBatch = writeBatch(db);
            for (const item of profile.savedItems) {
                const itemRef = doc(db, 'wardrobe_items', item.id);
                wishlistBatch.set(itemRef, {
                    item_id: item.id,
                    user_id: userId,
                    name: item.name,
                    price: item.price,
                    link: item.link,
                    image_keyword: item.image_keyword || '',
                    timestamp: item.timestamp,
                    origin: 'WISHLIST'
                });
            }
            await wishlistBatch.commit();
        } catch (e) {
            console.warn("⚠️ Error saving savedItems:", e);
        }
    }

    // --- BATCH 3: SAVED LOOKS (Silent Fail Allowed) ---
    if (profile.savedLooks && profile.savedLooks.length > 0) {
        try {
             const looksWithImageIds = await Promise.all(profile.savedLooks.map(async (look) => {
                 const imgId = await processImageForStorage(look.image);
                 return { ...look, image: imgId };
             }));

             const looksBatch = writeBatch(db);
             for (const look of looksWithImageIds) {
                 const lookRef = doc(db, 'outfits', look.id);
                 looksBatch.set(lookRef, {
                     outfit_id: look.id,
                     user_id: userId,
                     image: look.image,
                     description: look.description,
                     timestamp: look.timestamp,
                     type: 'GENERATED_LOOK'
                 }, { merge: true });
             }
             await looksBatch.commit();
        } catch (e) {
            console.warn("⚠️ Error saving savedLooks:", e);
        }
    }

    // --- BATCH 4: WARDROBE ANALYSIS (Silent Fail Allowed) ---
    if (profile.wardrobeAnalysis) {
        try {
            const wa = profile.wardrobeAnalysis;
            const analysisId = `wa_${userId}_latest`;
            
            // We can do analysis + items + outfits in one batch if small, but let's split if huge.
            // For now, simple batch.
            const waBatch = writeBatch(db);
            
            waBatch.set(doc(db, 'wardrobe_analyses', analysisId), {
                analysis_id: analysisId,
                user_id: userId,
                summary: wa.summary,
                colorPalette: wa.colorPalette,
                wardrobeHealth: wa.wardrobeHealth,
                colorProfile: wa.colorProfile,
                updatedAt: Timestamp.now()
            });

            if (wa.items) {
                wa.items.forEach((item, idx) => {
                    const itemId = `wai_${userId}_${idx}`;
                    const itemRef = doc(db, 'wardrobe_items', itemId);
                    waBatch.set(itemRef, {
                        item_id: itemId,
                        user_id: userId,
                        name: item.name,
                        color: item.color,
                        fit: item.fit,
                        category: item.category,
                        pattern: item.pattern,
                        origin: 'PDF_ANALYSIS',
                        analysis_id: analysisId
                    });
                });
            }

            if (wa.outfits) {
                 const waOutfitsWithIds = await Promise.all(wa.outfits.map(async (o) => {
                     const imgId = await processImageForStorage(o.generatedImage);
                     return { ...o, generatedImage: imgId };
                 }));

                 for (const o of waOutfitsWithIds) {
                     const outfitId = `wao_${userId}_${o.id}`;
                     const outfitRef = doc(db, 'outfits', outfitId);
                     waBatch.set(outfitRef, {
                         outfit_id: outfitId,
                         user_id: userId,
                         type: 'WARDROBE_LOOK',
                         analysis_id: analysisId,
                         top: o.top,
                         bottom: o.bottom,
                         style: o.style,
                         reasoning: o.reasoning,
                         rating: o.rating,
                         upgradeTip: o.upgradeTip,
                         visualPrompt: o.visualPrompt,
                         image: o.generatedImage 
                     });
                 }
            }
            await waBatch.commit();
        } catch (e) {
            console.warn("⚠️ Error saving wardrobeAnalysis:", e);
        }
    }
};

export const deleteWardrobeFromStorage = async (userId: string): Promise<void> => {
    if (!userId) return;
    try {
        const batch = writeBatch(db);
        const analysisRef = doc(db, 'wardrobe_analyses', `wa_${userId}_latest`);
        batch.delete(analysisRef);

        const itemsQuery = query(collection(db, 'wardrobe_items'), 
            where('user_id', '==', userId), 
            where('origin', '==', 'PDF_ANALYSIS')
        );
        const itemsSnap = await getDocs(itemsQuery);
        itemsSnap.forEach((doc) => {
            batch.delete(doc.ref);
        });

        const outfitsQuery = query(collection(db, 'outfits'), 
            where('user_id', '==', userId), 
            where('type', '==', 'WARDROBE_LOOK')
        );
        const outfitsSnap = await getDocs(outfitsQuery);
        outfitsSnap.forEach((doc) => {
            batch.delete(doc.ref);
        });

        await batch.commit();
    } catch (e) {
        console.error("Error deleting wardrobe:", e);
        throw e;
    }
};

// CORE LOAD: Instantly gets Profile + Subscription. Nothing else.
export const loadUserProfileFromStorage = async (userId: string): Promise<UserProfile | null> => {
    if (!userId) return null;
    
    let userData: any = null;
    // Default subscription schema
    let subData: any = { 
        planType: 'Free', 
        priceTier: 0, 
        tokens: 50, 
        tryOnLimit: 2, 
        tryOnUsed: 0, 
        hasPremiumFeatures: false 
    };
    
    let avatarImage: string | null = null;

    try {
        const userRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userRef);
        
        if (!userDoc.exists()) return null;
        
        userData = userDoc.data();
        avatarImage = await resolveImageFromStorage(userData.avatarImage);
    } catch (e) {
        return null;
    }

    try {
        const subRef = doc(db, 'subscriptions', userId);
        const subDoc = await getDoc(subRef);
        if (subDoc.exists()) {
            subData = subDoc.data();
        }
    } catch (e) {
        console.warn("Failed to load subscription data", e);
    }

    return {
        name: userData.name,
        city: userData.city,
        gender: userData.gender,
        occupation: userData.occupation,
        height: userData.height,
        weight: userData.weight,
        bodyShape: userData.bodyShape,
        skinTone: userData.skinTone,
        avatarImage: avatarImage,
        
        planType: subData.planType || 'Free',
        priceTier: subData.priceTier ?? 0,
        tokens: subData.tokens ?? 50,
        tryOnLimit: subData.tryOnLimit ?? 2,
        tryOnUsed: subData.tryOnUsed ?? 0,
        hasPremiumFeatures: subData.hasPremiumFeatures ?? false,

        savedItems: [],
        savedLooks: [],
        wardrobeAnalysis: null
    };
};

// BACKGROUND LOAD: Fetches History, Wardrobe, Items
export const loadUserHistoryFromStorage = async (userId: string): Promise<Partial<UserProfile>> => {
    if (!userId) return {};

    let savedItems: SavedWardrobeItem[] = [];
    let savedLooks: GeneratedLook[] = [];
    let wardrobeAnalysis: PdfAnalysisResult | null = null;
    let waItems: any[] = [];
    let waOutfits: any[] = [];

    // 1. Items
    try {
        const itemsQuery = query(collection(db, 'wardrobe_items'), where('user_id', '==', userId));
        const itemsSnap = await getDocs(itemsQuery);
        const allItems = itemsSnap.docs.map(d => ({ ...d.data(), id: d.id }));

        savedItems = allItems
            .filter((d: any) => d.origin === 'WISHLIST')
            .map((data: any) => ({
                id: data.item_id || data.id,
                name: data.name,
                price: data.price,
                link: data.link,
                image_keyword: data.image_keyword,
                timestamp: data.timestamp
            }));

        waItems = allItems
            .filter((d: any) => d.origin === 'PDF_ANALYSIS')
            .map((data: any) => ({
                name: data.name,
                color: data.color,
                fit: data.fit,
                category: data.category,
                pattern: data.pattern
            }));
    } catch (e) { console.warn("Hist 1 fail", e); }

    // 2. Outfits
    try {
        const outfitsQuery = query(collection(db, 'outfits'), where('user_id', '==', userId));
        const outfitsSnap = await getDocs(outfitsQuery);
        const allOutfits = outfitsSnap.docs.map(d => d.data());

        const savedLooksRaw = allOutfits.filter((d: any) => d.type === 'GENERATED_LOOK');
        savedLooks = await Promise.all(savedLooksRaw.map(async (data: any) => {
            const img = await resolveImageFromStorage(data.image);
            return {
                id: data.outfit_id,
                description: data.description,
                timestamp: data.timestamp,
                image: img || '' 
            };
        }));
        savedLooks.sort((a, b) => b.timestamp - a.timestamp);

        const waOutfitsRaw = allOutfits.filter((d: any) => d.type === 'WARDROBE_LOOK');
        waOutfits = await Promise.all(waOutfitsRaw.map(async (data: any) => {
            const idParts = (data.outfit_id || '').split('_');
            const numericId = parseInt(idParts[idParts.length - 1]) || 0;
            const img = await resolveImageFromStorage(data.image);

            return {
                id: numericId,
                top: data.top,
                bottom: data.bottom,
                style: data.style,
                reasoning: data.reasoning,
                rating: data.rating,
                upgradeTip: data.upgradeTip,
                visualPrompt: data.visualPrompt,
                generatedImage: img || undefined
            };
        }));
        waOutfits.sort((a, b) => a.id - b.id);
    } catch (e) { console.warn("Hist 2 fail", e); }

    // 3. Analysis Metadata
    try {
        const analysisId = `wa_${userId}_latest`;
        const analysisDoc = await getDoc(doc(db, 'wardrobe_analyses', analysisId));
        
        if (analysisDoc.exists()) {
            const aData = analysisDoc.data();
            wardrobeAnalysis = {
                summary: aData.summary,
                wardrobeHealth: aData.wardrobeHealth,
                colorProfile: aData.colorProfile,
                colorPalette: aData.colorPalette,
                items: waItems || [],
                outfits: waOutfits || []
            };
        }
    } catch (e) { console.warn("Hist 3 fail", e); }

    return {
        savedItems,
        savedLooks,
        wardrobeAnalysis
    };
};

export const clearUserProfile = async (userId: string): Promise<void> => {};

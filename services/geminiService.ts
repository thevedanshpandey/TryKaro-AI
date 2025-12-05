import { GoogleGenAI, Type } from "@google/genai";
import { UserProfile, TryOnResult, PdfAnalysisResult, WardrobeFormData, WardrobePlan, DailyOutfitResult } from "../types";

const KIE_API_KEY = "bb8c4d177e6a6cc4682e1ea34bb1be49";
const KIE_BASE_URL = "https://api.kie.ai/api/v1/gpt4o-image";

export const fileToGenerativePart = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      resolve(base64String.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const getMimeType = (dataUrl: string): string => {
    if (!dataUrl) return "image/jpeg";
    const match = dataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,/);
    return match ? match[1] : "image/jpeg";
};

// OPTIMIZATION: Aggressive compression to fix XHR/Payload errors
// Resizing to 384px and 0.5 quality ensures the base64 string is tiny (<20KB)
export const compressImage = async (base64Str: string, maxWidth = 384, quality = 0.5): Promise<string> => {
    return new Promise((resolve, reject) => {
        if (!base64Str || !base64Str.startsWith('data:image')) {
             reject(new Error("Invalid image format. Expected Data URI."));
             return;
        }

        const img = new Image();
        img.src = base64Str;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            // Always resize if larger than maxWidth, or if it's a very large high-res image
            if (width > maxWidth) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                resolve(base64Str);
                return;
            }
            // Fill white background to handle transparent PNGs converting to JPEG
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, width, height);
            
            ctx.drawImage(img, 0, 0, width, height);
            // Force JPEG for maximum compression
            resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => reject(new Error("Failed to load image for compression.")); 
    });
};

export const createGeminiClient = () => {
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
}

const getSkinToneDescription = (val: number) => {
    if (val <= 5) return "Fair/Light";
    if (val <= 10) return "Medium/Wheatish (Indian Wheatish)";
    if (val <= 15) return "Tan/Olive";
    return "Deep/Dark";
};

const fetchImageViaProxy = async (imageUrl: string): Promise<string> => {
    try {
        if (imageUrl.startsWith('//')) {
            imageUrl = 'https:' + imageUrl;
        }
        
        const imageProxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(imageUrl)}`;
        const response = await fetch(imageProxyUrl);
        if (!response.ok) throw new Error("Proxy error");
        
        const data = await response.json();
        if (!data.contents) throw new Error("No image content found");
        
        if (data.contents.startsWith('data:image')) {
            return data.contents;
        }
        
        const rawProxy = `https://api.allorigins.win/raw?url=${encodeURIComponent(imageUrl)}`;
        const rawResponse = await fetch(rawProxy);
        const blob = await rawResponse.blob();
        
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result as string;
                resolve(base64); 
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });

    } catch (error) {
        console.error("Proxy fetch error:", error);
        throw new Error("Could not download image content.");
    }
};

export const scrapeClothingImage = async (url: string): Promise<string> => {
    if (url.match(/\.(jpeg|jpg|gif|png|webp|bmp|tiff)(\?.*)?$/i)) {
        return fetchImageViaProxy(url);
    }

    try {
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error("Failed to load page content");
        
        const data = await response.json();
        const html = data.contents;
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        let imageUrl = doc.querySelector('meta[property="og:image"]')?.getAttribute('content');
        if (!imageUrl) imageUrl = doc.querySelector('meta[name="twitter:image"]')?.getAttribute('content');

        if (!imageUrl) {
            const schemaScript = doc.querySelector('script[type="application/ld+json"]');
            if (schemaScript) {
                try {
                    const json = JSON.parse(schemaScript.textContent || '{}');
                    if (json.image) imageUrl = Array.isArray(json.image) ? json.image[0] : json.image;
                    else if (json['@graph']) {
                        const product = json['@graph'].find((item: any) => item['@type'] === 'Product');
                        if (product && product.image) imageUrl = Array.isArray(product.image) ? product.image[0] : product.image;
                    }
                } catch (e) { }
            }
        }

        if (!imageUrl) {
            const images = Array.from(doc.querySelectorAll('img'));
            const likelyProduct = images.find(img => {
                const src = img.getAttribute('src');
                if (!src) return false;
                return !src.endsWith('.svg') && (src.includes('http') || src.includes('cdn')); 
            });
            if (likelyProduct) imageUrl = likelyProduct.getAttribute('src');
        }

        if (!imageUrl) throw new Error("Could not find a suitable product image on this page.");

        if (imageUrl.startsWith('/')) {
            const urlObj = new URL(url);
            imageUrl = urlObj.origin + imageUrl;
        }

        return await fetchImageViaProxy(imageUrl);

    } catch (error) {
        console.error("Scraping error:", error);
        throw new Error("Could not automatically retrieve the image. Try pasting the 'Image Address' directly instead of the page URL.");
    }
};

// Feature 1: Virtual Try-On (Requires Image-to-Image, using Gemini)
export const generateTryOn = async (user: UserProfile, clothingImageBase64: string, description: string): Promise<TryOnResult | null> => {
    const ai = createGeminiClient();
    
    if (!user.avatarImage || !user.avatarImage.startsWith('data:image')) {
        throw new Error("Profile photo missing on this device. For privacy, photos are stored locally. Please go to Profile and re-upload your selfie.");
    }

    try {
        // Optimized Compression for Speed & Payload Size
        const compressedUserImage = await compressImage(user.avatarImage, 384, 0.5);
        const compressedClothImage = await compressImage(clothingImageBase64, 384, 0.5);

        const userCameoBase64 = compressedUserImage.split('base64,')[1];
        const userMimeType = getMimeType(compressedUserImage);

        const clothData = compressedClothImage.includes('base64,') ? compressedClothImage.split('base64,')[1] : compressedClothImage;
        const clothMimeType = getMimeType(compressedClothImage);

        const skinToneDesc = getSkinToneDescription(user.skinTone);

        // UPDATED PROMPT: Forced face visibility
        const prompt = `
        ACT AS VIRTUAL TAILOR.
        INPUTS: 1. User Face (Reference) 2. Clothing Image.
        
        TASK: Generate a FULL-BODY photo of the User wearing the Clothing.
        
        STRICT RULES:
        1. **INCLUDE HEAD & FACE**: Do not crop the head. The user's face must be fully visible and clear.
        2. **IDENTITY**: Match the face from Input 1 (User Reference).
        3. **FIT**: ${user.height}cm, ${user.weight}kg, ${user.bodyShape}.
        4. **SCENE**: Studio lighting, plain white/grey background.
        
        OUTPUT: IMAGE FIRST. Then "VERDICT:" followed by fit comment.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image', 
            contents: {
                parts: [
                    { text: prompt },
                    { inlineData: { mimeType: userMimeType, data: userCameoBase64 } },
                    { inlineData: { mimeType: clothMimeType, data: clothData } }
                ]
            }
        });

        let generatedImage = null;
        let feedbackText = "";

        const parts = response.candidates?.[0]?.content?.parts;
        if (parts) {
             for (const part of parts) {
                if (part.inlineData) generatedImage = `data:image/png;base64,${part.inlineData.data}`;
                else if (part.text) feedbackText += part.text;
            }
        }

        if (generatedImage) {
            let cleanFeedback = feedbackText.replace(/VERDICT:/i, "").trim();
            if (cleanFeedback.startsWith("```json")) {
                try {
                    const json = JSON.parse(cleanFeedback.replace(/```json/g, "").replace(/```/g, ""));
                    cleanFeedback = json.verdict || cleanFeedback;
                } catch (e) {}
            }

            return {
                image: generatedImage,
                feedback: cleanFeedback || "Outfit looks great!"
            };
        } else if (feedbackText) {
             throw new Error("Generation failed: " + feedbackText);
        }
        return null;

    } catch (error: any) {
        console.error("TryOn Error:", error);
        if (error.message?.includes("Invalid image") || error.message?.includes("Profile photo")) {
             throw error;
        }
        if (error.message?.includes("xhr error") || error.code === 500) {
            throw new Error("Network unstable or image too large. Please try a smaller image.");
        }
        throw new Error("Try-On failed. Please ensure you have a clear selfie uploaded.");
    }
};

// Feature 2: Smart Wardrobe Builder
export const generateWardrobePlan = async (data: WardrobeFormData): Promise<WardrobePlan> => {
    const ai = createGeminiClient();
    
    const prompt = `
    Build a budget wardrobe plan (JSON).
    USER: ₹${data.budget}, ${data.gender}, ${data.age}y, ${data.style}, ${data.purpose}, ${data.climate}.
    
    LOGIC:
    - >10k: Premium brands. <5k: Value picks.
    - Suggest verified items from Amazon.in/Flipkart/Myntra.
    
    OUTPUT JSON:
    {
      "summary": { "totalBudget": "₹...", "style": "...", "purpose": "..." },
      "breakdown": { "tops": 0, "bottoms": 0, "shoes": 0, "accessories": 0, "totalSpent": 0 },
      "items": [{ "name": "...", "price": "...", "link": "...", "image_keyword": "..." }],
      "outfits": [{ "name": "...", "description": "..." }]
    }
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { tools: [{ googleSearch: {} }] }
        });

        const text = response.text || "";
        let jsonString = "";
        const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```\n([\s\S]*?)\n```/);
        
        if (jsonMatch && jsonMatch[1]) jsonString = jsonMatch[1];
        else {
            const start = text.indexOf('{');
            const end = text.lastIndexOf('}');
            if (start !== -1 && end !== -1) jsonString = text.substring(start, end + 1);
        }

        if (!jsonString) throw new Error("AI response format error.");

        return JSON.parse(jsonString);

    } catch (error) {
        console.error("Wardrobe Error:", error);
        throw error;
    }
};

// Feature 4: Daily Outfit Advice
export const getDailyOutfitAdvice = async (
    city: string, 
    availableOutfits: { id: number; description: string; image?: string; visualPrompt?: string }[],
    occasion: string
): Promise<DailyOutfitResult> => {
    const ai = createGeminiClient();
    
    const outfitsList = availableOutfits.map(o => `ID ${o.id}: ${o.description}`).join('\n');

    const prompt = `
    Daily Stylist.
    CONTEXT: Weather in ${city}, Occasion: ${occasion}.
    TASK: Pick 2 best outfits from list.
    
    OUTFITS:
    ${outfitsList}
    
    OUTPUT JSON:
    {
      "weather": "...",
      "outfits": [{ "name": "...", "description": "...", "reasoning": "...", "careInstructions": "...", "comfortRating": 9, "id": 123 }]
    }
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { tools: [{ googleSearch: {} }] }
        });

        const text = response.text || "";
        let jsonString = "";
        const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```\n([\s\S]*?)\n```/);
        
        if (jsonMatch && jsonMatch[1]) jsonString = jsonMatch[1];
        else {
            const start = text.indexOf('{');
            const end = text.lastIndexOf('}');
            if (start !== -1 && end !== -1) jsonString = text.substring(start, end + 1);
        }

        if (!jsonString) throw new Error("No JSON found");

        const parsed = JSON.parse(jsonString);
        
        const mappedOutfits = parsed.outfits.map((selection: any) => {
            const original = availableOutfits.find(o => o.id === selection.id) || availableOutfits[0]; 
            return {
                name: selection.name,
                description: original.description,
                reasoning: selection.reasoning,
                careInstructions: selection.careInstructions,
                comfortRating: selection.comfortRating,
                visualPrompt: original.visualPrompt || "",
                image: original.image 
            };
        }).filter((o: any) => o !== null);

        return {
            weather: parsed.weather,
            outfits: mappedOutfits
        };

    } catch (e) {
        return { weather: "Offline", outfits: [] };
    }
};

// Feature 5: Wardrobe Analysis (PDF or Images)
export const analyzeWardrobe = async (
    mediaInputs: { mimeType: string, data: string }[], 
    user: UserProfile, 
    context?: { style: string, occasion: string }
): Promise<PdfAnalysisResult> => {
    const ai = createGeminiClient();
    const skinToneDesc = getSkinToneDescription(user.skinTone);
    
    const userVisualDesc = `${user.gender}, ${user.height}cm, ${user.weight}kg, ${user.bodyShape}, ${skinToneDesc} skin`;

    const prompt = `
    Analyze Wardrobe (Images/PDF).
    USER: ${userVisualDesc}. PREF: ${context?.style || 'Mix'}, ${context?.occasion || 'General'}.
    
    TASKS:
    1. Classify items.
    2. Score Wardrobe Health (0-100).
    3. Generate EXACTLY 10 distinct outfits.
    
    CRITICAL: For each outfit, write a "visualPrompt": "Full body studio shot of ${userVisualDesc} with CLEAR FACE VISIBLE wearing [Top] and [Bottom]. Neutral studio lighting."

    OUTPUT JSON:
    {
      "summary": "...",
      "wardrobeHealth": { "score": 85, "verdict": "...", "missingEssentials": [], "overusedItems": [] },
      "colorProfile": { "undertone": "...", "season": "...", "bestColors": [] },
      "items": [{ "name": "...", "color": "...", "fit": "...", "category": "..." }],
      "outfits": [{ "id": 1, "top": "...", "bottom": "...", "style": "...", "reasoning": "...", "rating": 9, "upgradeTip": "...", "visualPrompt": "..." }]
    }
    `;

    try {
        const parts = [
            { text: prompt },
            ...mediaInputs.map(item => ({ inlineData: { mimeType: item.mimeType, data: item.data } }))
        ];

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts },
            config: {
                responseMimeType: "application/json",
            }
        });

        return JSON.parse(response.text || "{}");
    } catch (error) {
        console.error("Wardrobe Analysis Error:", error);
        throw error;
    }
}

// Kie.ai Helper: Poll for task status
const pollKieTask = async (taskId: string, retries = 30): Promise<string> => {
    // Assuming a standard query/task endpoint structure for Kie/GPT-4o wrappers
    // Since exact retrieval docs weren't provided, we use a common pattern for task retrieval
    const queryUrl = `${KIE_BASE_URL}/query`; 

    for (let i = 0; i < retries; i++) {
        await new Promise(r => setTimeout(r, 2000)); // Poll every 2s

        try {
            const response = await fetch(queryUrl, {
                method: "POST", // Many of these wrappers use POST for query with ID in body
                headers: {
                    "Authorization": `Bearer ${KIE_API_KEY}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ taskId })
            });

            const result = await response.json();
            
            if (result.code === 200 && result.data && result.data.status === 'success') {
                return result.data.url || result.data.imageUrl || (Array.isArray(result.data.images) ? result.data.images[0] : null);
            } else if (result.code !== 200 && result.code !== 202) {
                 // 202 usually means processing
                 console.warn("Kie Polling Status:", result);
            }
        } catch (e) {
            console.error("Polling error", e);
        }
    }
    throw new Error("Image generation timed out.");
}

export const generateOutfitFromText = async (user: UserProfile, visualPrompt: string): Promise<string> => {
    // SWITCHED TO KIE.AI (GPT-4o Image) for better face consistency
    
    try {
        const skinToneDesc = getSkinToneDescription(user.skinTone);
        
        // Construct a highly detailed visual persona prompt since we can't pass the image reference
        const fullPrompt = `Photorealistic full body studio shot of a ${user.gender}, approximately 25 years old. ${skinToneDesc} skin tone. ${user.bodyShape} body build. The person is facing the camera. The face is fully visible, clear and detailed. They are wearing: ${visualPrompt}. Neutral studio lighting, 8k resolution, high detailed texture.`;

        // 1. Submit Task
        const response = await fetch(`${KIE_BASE_URL}/generate`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${KIE_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                prompt: fullPrompt,
                size: "1:1", // Matches provided python snippet
                nVariants: 1
            })
        });

        const result = await response.json();
        
        if (!response.ok || result.code !== 200) {
            throw new Error(result.msg || "Kie.ai generation failed");
        }

        const taskId = result.data.taskId;
        if (!taskId) throw new Error("No Task ID returned from Kie.ai");

        // 2. Poll for Result
        const imageUrl = await pollKieTask(taskId);
        
        if (!imageUrl) throw new Error("Failed to retrieve image URL.");
        
        // 3. Convert URL to Base64 (to maintain app consistency) or return URL
        // Returning URL is fine for <img> tags
        return imageUrl;

    } catch (error: any) {
        console.error("Kie.ai Generation Error:", error);
        throw new Error("Could not generate image. " + (error.message || "Unknown error"));
    }
}

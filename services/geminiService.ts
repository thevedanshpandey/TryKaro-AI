
import { GoogleGenAI, Type } from "@google/genai";
import { UserProfile, TryOnResult, PdfAnalysisResult, WardrobeFormData, WardrobePlan, DailyOutfitResult } from "../types";

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

// Helper to compress image to reduce payload size and prevent XHR errors
const compressImage = async (base64Str: string, maxWidth = 800, quality = 0.7): Promise<string> => {
    return new Promise((resolve) => {
        // If it's already a short string (URL) or not base64, return as is
        if (!base64Str.startsWith('data:image')) {
             resolve(base64Str);
             return;
        }

        const img = new Image();
        img.src = base64Str;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            // Resize if too large
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
            ctx.drawImage(img, 0, 0, width, height);
            // Always convert to JPEG for efficient compression
            resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => resolve(base64Str); // Fallback
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

// Helper to fetch image via CORS proxy and convert to Base64
const fetchImageViaProxy = async (imageUrl: string): Promise<string> => {
    try {
        // Fix relative URLs before fetching
        if (imageUrl.startsWith('//')) {
            imageUrl = 'https:' + imageUrl;
        }
        
        // Use JSON endpoint which is more reliable for CORS than raw
        const imageProxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(imageUrl)}`;
        const response = await fetch(imageProxyUrl);
        if (!response.ok) throw new Error("Proxy error");
        
        const data = await response.json();
        if (!data.contents) throw new Error("No image content found");
        
        // contents is usually a data URI or raw text. For images, we need to handle it carefully.
        // If allorigins returns base64 data uri directly:
        if (data.contents.startsWith('data:image')) {
            return data.contents;
        }
        
        // If it returns binary/text, we might need a different approach.
        // Let's fallback to the raw endpoint if JSON doesn't give us a Data URI, 
        // but often the 'raw' endpoint is what we want for images if we can fetch it.
        // However, fetching 'raw' directly in browser often fails CORS.
        
        // Strategy 2: If the JSON approach failed to give a Data URI (it usually returns text for HTML),
        // let's try a different proxy strategy or just try the raw link if it allows CORS.
        
        // Let's try to construct a new Image object and draw it to canvas (bypassing strict fetch, but might taint canvas)
        // Actually, for "download and show", we need the data.
        
        // Let's try a different approach: standard fetch.
        // If that fails, we return the URL itself and handle it in UI? No, Gemini needs base64.
        
        // Let's go back to 'raw' but with better error handling.
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
    // 1. DIRECT IMAGE LINK CHECK
    if (url.match(/\.(jpeg|jpg|gif|png|webp|bmp|tiff)(\?.*)?$/i)) {
        return fetchImageViaProxy(url);
    }

    try {
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error("Failed to load page content");
        
        const data = await response.json();
        const html = data.contents; // allorigins 'get' returns content in this field
        
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
                } catch (e) { /* ignore */ }
            }
        }

        if (!imageUrl) {
            const images = Array.from(doc.querySelectorAll('img'));
            // Heuristic: Prefer large images that are not SVGs
            const likelyProduct = images.find(img => {
                const src = img.getAttribute('src');
                if (!src) return false;
                // Check if absolute URL to avoid checking width of tracking pixels
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

// Feature 1: Virtual Try-On
export const generateTryOn = async (user: UserProfile, clothingImageBase64: string, description: string): Promise<TryOnResult | null> => {
    const ai = createGeminiClient();
    
    if (!user.avatarImage) throw new Error("User cameo not found. Please create your avatar first.");

    // Compress images to ensure payload isn't too large (fixes xhr error)
    const compressedUserImage = await compressImage(user.avatarImage);
    const compressedClothImage = await compressImage(clothingImageBase64);

    const userCameoBase64 = compressedUserImage.includes('base64,') ? compressedUserImage.split('base64,')[1] : compressedUserImage;
    const userMimeType = getMimeType(compressedUserImage);

    const clothData = compressedClothImage.includes('base64,') ? compressedClothImage.split('base64,')[1] : compressedClothImage;
    const clothMimeType = getMimeType(compressedClothImage);

    const skinToneDesc = getSkinToneDescription(user.skinTone);

    // Prompt updated to prioritize IMAGE generation over JSON text
    const prompt = `
    ACT AS TRYKARO AI — EXPERT VIRTUAL TAILOR.
    
    INPUTS:
    1. TARGET MODEL (First Image): User's face/body.
    2. CLOTHING (Second Image): The outfit to try on.

    TASK:
    Generate a photorealistic image of the TARGET MODEL wearing the CLOTHING.

    CONSTRAINTS (STRICT):
    - Height: ${user.height} cm
    - Weight: ${user.weight} kg
    - Body Shape: ${user.bodyShape}
    - Skin Tone: ${skinToneDesc}
    - IDENTITY LOCK: Must be the person from the first image.
    
    OUTPUT INSTRUCTIONS:
    1. GENERATE THE IMAGE FIRST. This is the most important step.
    2. After the image, provide a brief text verdict starting with "VERDICT:".
    `;

    try {
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
            // Clean up the feedback text
            let cleanFeedback = feedbackText.replace(/VERDICT:/i, "").trim();
            if (cleanFeedback.startsWith("```json")) {
                try {
                    const json = JSON.parse(cleanFeedback.replace(/```json/g, "").replace(/```/g, ""));
                    cleanFeedback = json.verdict || cleanFeedback;
                } catch (e) {}
            }

            return {
                image: generatedImage,
                feedback: cleanFeedback || "Bhai, outfit solid lag raha hai! 🔥"
            };
        } else if (feedbackText) {
             throw new Error("Generation failed but AI says: " + feedbackText);
        }
        return null;
    } catch (error: any) {
        console.error("TryOn Error:", error);
        if (error.message?.includes("xhr error") || error.code === 500) {
            throw new Error("Image too large or network connection unstable. Try a smaller image.");
        }
        throw error;
    }
};

// Feature 2: Smart Wardrobe Builder
export const generateWardrobePlan = async (data: WardrobeFormData): Promise<WardrobePlan> => {
    const ai = createGeminiClient();
    
    const prompt = `
    You are TRYKARO AI — a world-class personal stylist and smart shopping assistant.
    Your goal is to build a high-IQ, budget-optimized wardrobe.

    USER PROFILE:
    - Budget: ₹${data.budget}
    - Details: ${data.gender}, ${data.age} years old
    - Style: ${data.style}
    - Use Case: ${data.purpose}
    - Climate: ${data.climate}

    SECTION 6 — BUY SMARTER ENGINE:
    - **Budget Logic**: 
      - If Budget > ₹10k: Suggest premium brands (Zara, H&M, Levi's).
      - If Budget < ₹5k: Suggest value picks (Amazon, Flipkart).
    - **Selection Logic**:
      - Do NOT push random products.
      - Justify every item: "This white sneaker unlocks 18 new outfit combinations."
      - Prioritize essentials over trends.

    REAL SHOPPING SEARCH:
    - Use the 'googleSearch' tool to find REAL products on Amazon.in, Flipkart, and Myntra.
    - **VERIFY LINKS**: Provide working URLs only.

    OUTPUT FORMAT (JSON ONLY):
    {
      "summary": {
        "totalBudget": "₹${data.budget}",
        "style": "Description of the vibe",
        "purpose": "Wardrobe goal"
      },
      "breakdown": {
        "tops": 0, "bottoms": 0, "shoes": 0, "accessories": 0, "totalSpent": 0
      },
      "items": [
        {
          "name": "Product Name",
          "price": "₹...",
          "link": "https://...",
          "image_keyword": "Visual keyword for image gen"
        }
      ],
      "outfits": [
        {
          "name": "Outfit Name",
          "description": "How to style it. Use friendly, stylish tone."
        }
      ]
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

        if (!jsonString) throw new Error("Could not parse the wardrobe plan. AI response was not in JSON format.");

        return JSON.parse(jsonString);

    } catch (error) {
        console.error("Wardrobe Error:", error);
        throw error;
    }
};

// Feature 4: Daily Outfit Advice (Climate Aware + Persona)
export const getDailyOutfitAdvice = async (
    city: string, 
    availableOutfits: { id: number; description: string; image?: string; visualPrompt?: string }[],
    occasion: string // Added context
): Promise<DailyOutfitResult> => {
    const ai = createGeminiClient();
    
    const outfitsList = availableOutfits.map(o => `ID ${o.id}: ${o.description}`).join('\n');

    const prompt = `
    You are TRYKARO AI — the user's daily styling companion.
    
    SECTION 4 — DAILY WHAT-TO-WEAR ENGINE:
    1. **Context**: Use Google Search to find CURRENT weather in **${city}**.
    2. **User Context**: The user is dressing for **${occasion}**.
    3. **Selection**: Pick the 2 BEST outfits from the provided list that match BOTH the weather AND the occasion.
       - *Example*: If occasion is "Gym", pick activewear. If "Date", pick stylish/semi-formal.
    4. **Intelligence**:
       - Comfort Rating (1-10) based on humidity/temp.
       - Fabric Match: Why this material works today.
       - Care Instructions: e.g., "Avoid suede shoes today, rain expected."

    MY OUTFITS:
    ${outfitsList}
    
    OUTPUT FORMAT (JSON ONLY):
    {
      "weather": "e.g. Rainy, 24°C",
      "outfits": [
        {
          "name": "Stylish Name for Today",
          "description": "Original description...",
          "reasoning": "Why this is perfect for ${occasion} & weather...",
          "careInstructions": "Specific care tip for today...",
          "comfortRating": 9,
          "visualPrompt": "Original visual prompt...",
          "id": 123
        }
      ]
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
        console.error(e);
        if (availableOutfits.length > 0) {
             return {
                 weather: "Offline Mode",
                 outfits: availableOutfits.slice(0, 2).map(o => ({
                     name: `Outfit #${o.id}`,
                     description: o.description,
                     reasoning: "Safe choice from your wardrobe.",
                     visualPrompt: o.visualPrompt || "",
                     image: o.image,
                     careInstructions: "Stay stylish!",
                     comfortRating: 8
                 }))
             }
        }
        return { weather: "Unknown", outfits: [] };
    }
};

// Feature 5: PDF Wardrobe Analysis (Full Intelligence)
export const analyzePdfWardrobe = async (pdfBase64: string, user: UserProfile, context?: { style: string, occasion: string }): Promise<PdfAnalysisResult> => {
    const ai = createGeminiClient();
    const skinToneDesc = getSkinToneDescription(user.skinTone);

    const prompt = `
    You are TRYKARO AI — a world-class virtual wardrobe manager.
    I have uploaded a PDF of my clothes. Analyze it deeply.

    SECTION 1 — USER UNDERSTANDING:
    - User Profile: ${user.gender}, ${user.occupation}, Skin Tone: ${skinToneDesc}, Body Shape: ${user.bodyShape}
    - User Preferences: Style = ${context?.style || 'Mix of styles'}, Occasion = ${context?.occasion || 'General use'}

    SECTION 2 — WARDROBE INTELLIGENCE ENGINE:
    - **Classify**: Identify every item (Name, Color, Fit, Pattern, Category).
    - **Wardrobe Health Score (0-100)**: Analyze Variety, Seasonal Balance, Color Diversity.
    - **Insights**: Detect gaps (e.g., "Missing a white tee") and overused items.

    SECTION 3 — OUTFIT GENERATION ENGINE:
    - Generate 15+ ultra-personalized outfits using ONLY these items.
    - **Rules**:
      - Color Harmony (Complementary, Monochromatic).
      - Proportions (Slim bottom + Oversized top).
      - Skin Tone Match: Ensure colors suit ${skinToneDesc}.
    - **Visual Prompt**: Create a detailed description for image generation.
    - **UPGRADE TIP**: For EACH outfit, suggest ONE missing element (e.g. "White Sneakers", "Silver Watch") that would turn this look from 7/10 to 10/10.

    SECTION 5 — COLOR PROFILE:
    - Determine Undertone (Warm/Cool/Neutral) based on ${skinToneDesc}.
    - Suggest Best & Worst colors.

    OUTPUT FORMAT (Strict JSON):
    {
      "summary": "Short professional summary of the wardrobe.",
      "wardrobeHealth": {
         "score": 85,
         "verdict": "Excellent / Good / Needs Work",
         "missingEssentials": ["Item 1", "Item 2"],
         "overusedItems": ["Too many black shirts"]
      },
      "colorProfile": {
         "undertone": "Warm/Cool",
         "season": "Autumn/Winter...",
         "bestColors": ["Color 1", "Color 2"]
      },
      "colorPalette": ["Hex/Name 1", "Hex/Name 2"],
      "items": [
        { "name": "...", "color": "...", "fit": "...", "category": "...", "pattern": "..." }
      ],
      "outfits": [
        {
          "id": 1,
          "top": "...", "bottom": "...", "style": "Streetwear/Formal...",
          "reasoning": "Why it works...",
          "rating": 9,
          "upgradeTip": "Make it 10/10 by adding...",
          "visualPrompt": "Detailed visual description..."
        }
      ]
    }
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { text: prompt },
                    { inlineData: { mimeType: 'application/pdf', data: pdfBase64 } }
                ]
            },
            config: {
                responseMimeType: "application/json",
            }
        });

        return JSON.parse(response.text || "{}");
    } catch (error) {
        console.error("PDF Analysis Error:", error);
        throw error;
    }
}

export const generateOutfitFromText = async (user: UserProfile, visualPrompt: string): Promise<string> => {
    const ai = createGeminiClient();
    if (!user.avatarImage) throw new Error("User cameo not found.");
    
    // Compress user image
    const compressedUserImage = await compressImage(user.avatarImage);
    const userCameoBase64 = compressedUserImage.includes('base64,') ? compressedUserImage.split('base64,')[1] : compressedUserImage;
    const userMimeType = getMimeType(compressedUserImage);
    
    const skinToneDesc = getSkinToneDescription(user.skinTone);

    const prompt = `
    ACT AS TRYKARO AI — EXPERT VIRTUAL STYLIST.
    
    Target Model: User image provided.
    BODY METRICS (STRICT): Height: ${user.height} cm, Weight: ${user.weight} kg, Shape: ${user.bodyShape}, Skin: ${skinToneDesc}.
    
    Task: Generate a photorealistic image of the Target Model wearing:
    ${visualPrompt}
    
    RULES:
    1. IDENTITY LOCK: Exact face, hair, and body shape of reference.
    2. PHYSIQUE REALISM: Must look like ${user.height}cm / ${user.weight}kg.
    3. PHOTOREALISM: Studio lighting, high fashion.
    `;

    try {
        const response = await ai.models.generateContent({
             model: 'gemini-2.5-flash-image',
             contents: {
                 parts: [
                     { text: prompt },
                     { inlineData: { mimeType: userMimeType, data: userCameoBase64 } }
                 ]
             }
        });

        const parts = response.candidates?.[0]?.content?.parts;
        if (parts) {
             for (const part of parts) {
                if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
            }
        }
        throw new Error("No image generated.");
    } catch (error) {
        console.error("Outfit Viz Error:", error);
        throw error;
    }
}


export enum View {
  ONBOARDING = 'ONBOARDING',
  HOME = 'HOME',
  TRY_ON = 'TRY_ON',
  WARDROBE = 'WARDROBE',
  MIX_MATCH = 'MIX_MATCH',
  DAILY_OUTFIT = 'DAILY_OUTFIT',
  PROFILE = 'PROFILE',
  PDF_WARDROBE = 'PDF_WARDROBE',
}

export interface SavedWardrobeItem {
  id: string;
  name: string;
  price: string;
  link: string;
  image_keyword?: string;
  timestamp: number;
}

export interface UserProfile {
  name: string;
  city: string;
  gender: string;
  occupation: string;
  height: string;
  weight: string;
  bodyShape: string;
  skinTone: number; // 1-20
  avatarImage: string | null; // Base64
  hasPremium: boolean;
  tokens: number; // New: Token system
  savedLooks?: GeneratedLook[];
  wardrobeAnalysis?: PdfAnalysisResult | null;
  savedItems?: SavedWardrobeItem[];
}

export interface ClothingItem {
  id: string;
  name: string;
  type: 'top' | 'bottom' | 'dress' | 'ethnic' | 'shoes' | 'accessory';
  image: string; // Base64 or URL
  price?: string;
  buyLink?: string;
}

export interface GeneratedLook {
  id: string;
  image: string; // Base64
  description: string;
  timestamp: number;
}

export interface WardrobeFormData {
  budget: string;
  gender: string;
  age: string;
  style: string;
  purpose: string;
  climate: string;
  colors: string;
  specifics: string;
}

export interface WardrobePlan {
  summary: {
    totalBudget: string;
    style: string;
    purpose: string;
  };
  breakdown: {
    tops: number;
    bottoms: number;
    shoes: number;
    accessories: number;
    totalSpent: number;
  };
  items: Array<{
    name: string;
    price: string;
    link: string;
    image_keyword: string; // Used to fetch a dummy image
  }>;
  outfits: Array<{
    name: string;
    description: string;
  }>;
}

export interface DailyOutfitResult {
  weather: string;
  outfits: Array<{
    name: string;
    description: string;
    reasoning: string;
    visualPrompt: string; // Description for image generation
    image?: string; // Base64 of the generated outfit
    careInstructions?: string; 
    comfortRating?: number; 
  }>;
}

export interface TryOnResult {
  image: string;
  feedback: string;
}

export interface PdfAnalysisResult {
  summary: string;
  colorPalette: string[];
  wardrobeHealth?: {
    score: number;
    verdict: string;
    missingEssentials: string[];
    overusedItems: string[];
  };
  colorProfile?: {
    undertone: string;
    season: string;
    bestColors: string[];
  };
  items: Array<{
    name: string;
    color: string;
    fit: string;
    category: string;
    pattern?: string;
  }>;
  outfits: Array<{
    id: number;
    top: string;
    bottom: string;
    style: string;
    reasoning: string;
    rating: number;
    upgradeTip: string;
    visualPrompt: string; 
    generatedImage?: string; 
  }>;
}

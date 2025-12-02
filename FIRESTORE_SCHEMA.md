# TryKaro AI - Firestore Database Schema

This schema is normalized to support Wardrobe creation, Climate suggestions, Virtual Try-On, and the Token system based on the existing `types.ts` and application logic.

## 1. Collection: `users`
Stores the core profile information. Authentication is handled by Firebase Auth, but this collection stores the extended profile data required for AI generation.

| Field Name | Data Type | Source/Notes |
| :--- | :--- | :--- |
| **user_id** | String (PK) | **Primary Key**. Matches Firebase Auth UID. |
| `name` | String | User's display name. |
| `email` | String | From Firebase Auth. |
| `city` | String | Used for Weather/Climate API context. |
| `gender` | String | 'Male', 'Female', etc. Used for wardrobe context. |
| `occupation` | String | e.g., 'Student', 'Professional'. affects style advice. |
| `height` | String/Number | Stored as cm (e.g., "175"). |
| `weight` | String/Number | Stored as kg (e.g., "70"). |
| `bodyShape` | String | e.g., 'Athletic', 'Hourglass'. |
| `skinTone` | Number | 1-20 scale used for prompt engineering. |
| `avatarImage` | String | Base64 or Storage URL of the user's reference selfie. |
| `createdAt` | Timestamp | Account creation date. |

---

## 2. Collection: `billing_tokens`
Manages the economy system (Ads & Premium status). Separated to allow for transactional updates without locking the main user profile.

| Field Name | Data Type | Source/Notes |
| :--- | :--- | :--- |
| **user_id** | String (PK/FK) | **Primary Key**. Links to `users` collection. |
| `tokens` | Number | Current balance (e.g., 50). Decrements on generation. |
| `hasPremium` | Boolean | True if user has active subscription. |
| `planType` | String | 'Free' or 'Premium'. |
| `lastAdWatch` | Timestamp | To prevent spamming ads (optional). |

---

## 3. Collection: `wardrobe_items`
Stores two types of items:
1. **Analyzed Items**: Extracted from PDF wardrobe analysis.
2. **Wishlist Items**: Saved from the "Smart Shopper" feature.

| Field Name | Data Type | Source/Notes |
| :--- | :--- | :--- |
| **item_id** | String (PK) | Unique Item ID. |
| `user_id` | String (FK) | Links to `users` collection. |
| `name` | String | Item name (e.g., "Black Kurti" or "Nike Shoes"). |
| `category` | String | 'top', 'bottom', 'shoes', 'accessory', etc. |
| `origin` | String | 'PDF_ANALYSIS' or 'WISHLIST'. |
| **Fields for PDF Items:** | | |
| `color` | String | Extracted color name/hex. |
| `fit` | String | e.g., 'Slim', 'Oversized'. |
| `pattern` | String | e.g., 'Solid', 'Striped'. |
| **Fields for Wishlist Items:** | | |
| `price` | String | e.g., "₹2,500". |
| `link` | String | Shopping URL (Amazon/Myntra). |
| `image_keyword` | String | Used to fetch dummy images if real one fails. |
| `timestamp` | Number | Date added. |

---

## 4. Collection: `outfits`
Stores generated results from all three major AI features:
1. **Virtual Try-On** (Image Generation)
2. **Daily Outfit** (Text + Image Recommendation)
3. **Wardrobe Plan** (Text/JSON Outfits)

| Field Name | Data Type | Source/Notes |
| :--- | :--- | :--- |
| **outfit_id** | String (PK) | Unique Outfit ID. |
| `user_id` | String (FK) | Links to `users` collection. |
| `type` | String | 'TRY_ON', 'DAILY_OUTFIT', 'WARDROBE_LOOK'. |
| `timestamp` | Number | Creation time. |
| **Visuals:** | | |
| `image` | String | Base64 or Storage URL of the generated result. |
| `visualPrompt` | String | The prompt sent to Gemini (for re-generation). |
| **Context:** | | |
| `description` | String | AI-generated description of the look. |
| `weather` | String | (Daily Outfit) e.g., "Rainy, 24°C". |
| `occasion` | String | (Daily Outfit) e.g., "Office", "Date". |
| **AI Intelligence:** | | |
| `reasoning` | String | Why this outfit was chosen. |
| `careInstructions` | String | Fabric care tips. |
| `comfortRating` | Number | 1-10 score based on weather. |
| `styleRating` | Number | 1-10 score (Wardrobe Analysis). |
| `upgradeTip` | String | Suggestion to improve the look (e.g., "Add a watch"). |

---

## 5. Collection: `wardrobe_analyses` (Optional/Advanced)
Stores the meta-data result of a full PDF scan.

| Field Name | Data Type | Source/Notes |
| :--- | :--- | :--- |
| **analysis_id** | String (PK) | Unique ID. |
| `user_id` | String (FK) | Links to `users`. |
| `summary` | String | Overall wardrobe summary text. |
| `healthScore` | Number | 0-100 Wardrobe Health Score. |
| `healthVerdict` | String | "Excellent", "Needs Work", etc. |
| `missingEssentials` | Array<String> | List of items to buy. |
| `colorUndertone` | String | "Warm", "Cool", "Neutral". |
| `bestColors` | Array<String> | List of recommended colors. |

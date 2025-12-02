
================================================================================
MANUAL CONFIGURATION GUIDE: GOOGLE SIGN-IN & PLAY STORE DEPLOYMENT
================================================================================

This document outlines the steps required to configure Google Sign-In when deploying 
this app to the Google Play Store (e.g., using Capacitor, Cordova, or a WebView wrapper).

--------------------------------------------------------------------------------
PART 1: FIREBASE CONSOLE STEP (ADDING SHA-1 KEY)
--------------------------------------------------------------------------------

1.  Log in to the Firebase Console (https://console.firebase.google.com/).
2.  Open your project: "trykaro-ai".
3.  Click the "Gear" icon (Settings) next to "Project Overview" in the top-left sidebar.
4.  Select "Project settings".
5.  Scroll down to the "Your apps" card.
6.  If you haven't created an Android app yet, click "Add app" and select the Android icon.
    (If you already have one, select it from the list).
7.  Look for the "SHA certificate fingerprints" section.
8.  Click "Add fingerprint".
9.  Paste your SHA-1 key here.
    *   DEBUG KEY: Used while developing on your computer.
    *   RELEASE KEY: Used when you sign your .aab/.apk for the Play Store.
    *   PLAY STORE SIGNING KEY: Found in Google Play Console > Release > Setup > App Integrity.
    (You typically need to add ALL of these).

10. Once added, scroll up and click the "google-services.json" download button.
11. MOVE this file:
    *   If using Capacitor: Place it in `android/app/google-services.json`.
    *   If using generic web build: This file is not needed for pure web, but required for the native wrapper project structure.

--------------------------------------------------------------------------------
PART 2: CODE UPDATE STEP (THE GOOGLE SIGN-IN UI)
--------------------------------------------------------------------------------

The Google Sign-In button is located in the `AuthScreen` component. If you need to 
hide, enable, or modify the button, here is the exact location.

FILE: components/AuthScreen.tsx

LOOK FOR THIS BLOCK (Around Line 170):

```tsx
        {/* Google Button */}
        <button 
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full bg-white text-black font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-3 hover:bg-gray-100 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed mb-6"
        >
            <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
                {/* ... SVG Path Data ... */}
            </svg>
            Continue with Google
        </button>
```

TO HIDE IT:
Wrap the entire button block in comments `{/* ... */}` or simply delete it.

TO ENABLE IT:
Ensure the code above is present and uncommented.

--------------------------------------------------------------------------------
TROUBLESHOOTING "10" ERROR (Common in Android)
--------------------------------------------------------------------------------
If you receive a generic "10" error on Android Google Sign-In:
1. It is almost ALWAYS a missing SHA-1 key in Firebase Console.
2. Ensure you added the SHA-1 from the *Google Play Console App Integrity* section, 
   not just your local keystore.

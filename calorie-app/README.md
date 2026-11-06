# Calorie Snap 📷🍔

An iPhone app: take (or pick) a photo of your food, and Google Gemini estimates the calories,
lists each food item with its portion, and gives protein / carbs / fat.

Built with [Expo](https://expo.dev) (React Native), so you can run it on your iPhone **without a Mac or Xcode**.

## Setup

1. Get a free Gemini API key at <https://aistudio.google.com/apikey>.
2. In this folder:
   ```bash
   cp .env.example .env        # then paste your key into .env
   npm install
   npx expo start
   ```
3. On your iPhone, install **Expo Go** from the App Store and scan the QR code shown in the terminal
   (phone and computer on the same Wi‑Fi, or run `npx expo start --tunnel`).

## How it works

- `App.tsx` – the screen: camera / photo library buttons, photo preview and the results card.
- `src/gemini.ts` – shrinks the photo to 1024px JPEG and calls Gemini's `generateContent` REST API
  with a JSON response schema, so the answer comes back as structured data.

The model defaults to `gemini-flash-latest`; set `EXPO_PUBLIC_GEMINI_MODEL` in `.env` to use another
image-capable Gemini model.

## ⚠️ About the API key

`EXPO_PUBLIC_*` variables are bundled into the app, so anyone with the app could extract the key.
That's fine for personal use on your own phone. Before publishing to the App Store, move the Gemini
call to a small backend (e.g. the Express server in the parent folder) and have the app call that instead.

## Publishing as a real installable app

Use EAS Build (`npm i -g eas-cli && eas build -p ios`) — requires an Apple Developer account.

# React Native Expo Frontend

## 📱 This is a Mobile App (Not for EC2)

React Native apps run on mobile devices (iOS/Android), not on servers like EC2.

---

## 🚀 Deployment Options

### Option 1: Expo Go (Development/Testing) ✅ EASIEST
Users can test your app immediately without publishing:

1. **On your development machine:**
   ```bash
   cd fitness-mvp
   npm install
   npm start
   ```

2. **Users download Expo Go:**
   - iOS: https://apps.apple.com/app/expo-go/id982107779
   - Android: https://play.google.com/store/apps/details?id=host.exp.exponent

3. **Users scan QR code** from your terminal and app runs on their phone

**Note:** Requires you to keep `npm start` running. Backend must be accessible from their phones.

---

### Option 2: Expo Application Services (EAS) - Recommended for Production

Build standalone apps for iOS/Android app stores:

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo account
eas login

# Configure project
cd fitness-mvp
eas build:configure

# Build for Android
eas build --platform android

# Build for iOS (requires Apple Developer account)
eas build --platform ios

# Submit to stores
eas submit
```

**Cost:** Free for up to 30 builds/month

---

### Option 3: Build Locally (Free)

#### Android APK:
```bash
cd fitness-mvp
expo build:android
```

#### iOS (requires Mac + Xcode):
```bash
cd fitness-mvp
expo build:ios
```

---

## 🔧 Configure Backend URL

Before deployment, update the API endpoint:

**File:** `fitness-mvp/src/services/api.ts` (or wherever API URL is defined)

```typescript
// Change from localhost to your EC2 public IP or domain
const API_URL = 'http://your-ec2-public-ip:8080';

// Or with domain
const API_URL = 'https://api.yourdomain.com';
```

---

## 📦 What's in this folder?

- `src/` - Source code
- `assets/` - Images, fonts, etc.
- `package.json` - Dependencies
- `App.tsx` - Main app component
- `app.json` - Expo configuration

---

## ⚙️ Setup Instructions

1. **Install dependencies:**
   ```bash
   cd fitness-mvp
   npm install
   ```

2. **Update API endpoint** to point to your EC2 backend

3. **Test locally:**
   ```bash
   npm start
   ```

4. **Build for production** using one of the options above

---

## 🆘 Quick Reference

```bash
# Start development server
npm start

# Run on Android emulator
npm run android

# Run on iOS simulator (Mac only)
npm run ios

# Run in web browser
npm run web

# Clear cache
npx expo start -c
```

---

## 📱 Distribution Strategy

**For Testing:**
- Share Expo Go link (easiest)
- Build and share APK file (Android only)

**For Production:**
- Use EAS to publish to app stores
- Or build standalone apps and distribute manually

---

## 💡 Important Notes

1. **Backend must be accessible:** Your EC2 backend needs a public IP or domain that mobile phones can reach

2. **Update API URL:** Change localhost to your actual backend address

3. **HTTPS recommended:** For production, use HTTPS (SSL certificate) not HTTP

4. **Mobile permissions:** Camera, location, etc. are configured in `app.json`

5. **Not serverless:** This doesn't run on EC2, it runs on users' phones

---

For more help: https://docs.expo.dev/

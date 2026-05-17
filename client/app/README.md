# SKEducations SMS — Mobile App

Expo managed-workflow Android app for the SMS platform. One binary serves all roles (admin, teacher, staff, student, parent); tab bars and screens are gated by the role returned at login.

---

## Table of Contents

- [Dev Setup](#dev-setup)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [Building for Production](#building-for-production)
- [Submitting to Google Play](#submitting-to-google-play)

---

## Dev Setup

### Prerequisites

- Node.js 20+
- [Expo CLI](https://docs.expo.dev/get-started/installation/) (`npm install -g expo-cli`)
- [EAS CLI](https://docs.expo.dev/eas/) (`npm install -g eas-cli`)
- Android Studio (for emulator) **or** the Expo Go app on a physical device

### 1. Install dependencies

```bash
cd client/app
npm install
```

### 2. Configure the API URL

Create a `.env` file in `client/app/`:

```env
EXPO_PUBLIC_API_URL=http://localhost:8000
```

For a remote dev server, replace with your actual backend URL (e.g. `https://bp3150.skeducations.com`).

### 3. Start the dev server

```bash
npm start
```

This opens the Expo dev tools. From here:

- Press `a` to open on a connected Android device or emulator
- Scan the QR code with the **Expo Go** app on a physical device
- Press `w` to open the web preview (limited — native features won't work)

### Running on a specific platform

```bash
npm run android   # launch directly on Android emulator/device
npm run ios       # requires macOS + Xcode
```

---

## Project Structure

```
client/app/
├── app/
│   ├── (auth)/
│   │   └── login.tsx          # OTP phone login
│   └── (app)/
│       ├── _layout.tsx        # auth guard + role-based bottom tab navigator
│       ├── dashboard/
│       ├── attendance/
│       ├── homework/
│       ├── notices/
│       ├── concerns/
│       ├── timetable/
│       ├── exams/
│       ├── results/
│       ├── leaves/
│       └── settings/
├── components/
│   ├── ui/                    # Button, Card, Badge, Input, Spinner, etc.
│   ├── forms/                 # OtpInput, PhoneInput, DatePicker
│   └── shared/                # AttendanceDot, RoleBadge, ChildSelector, etc.
├── lib/
│   ├── api/                   # per-resource axios API modules
│   ├── storage.ts             # expo-secure-store wrappers (token persistence)
│   └── queryClient.ts
├── store/
│   ├── auth.ts                # token, role, schoolId, userId, entityId
│   └── parentChild.ts         # selected child for parent role
├── hooks/
├── types/
├── constants/
├── app.json                   # Expo app config (slug, package name, plugins)
└── eas.json                   # EAS build profiles (development / preview / production)
```

---

## Environment Variables

| Variable | Description |
|---|---|
| `EXPO_PUBLIC_API_URL` | Base URL of the FastAPI backend |

All `EXPO_PUBLIC_*` variables are inlined at build time. There is no runtime `.env` loading — the value baked into the build is final.

The `eas.json` development profile sets this to `http://localhost:8000` automatically for EAS development builds. For preview and production builds, set it via EAS environment variables (see below).

---

## Building for Production

Production builds use [EAS Build](https://docs.expo.dev/build/introduction/) and produce an Android App Bundle (`.aab`) for Play Store submission.

### 1. Log in to EAS

```bash
eas login
```

### 2. Set production environment variables

In the [Expo dashboard](https://expo.dev) under your project → **Environment Variables**, add:

```
EXPO_PUBLIC_API_URL=https://your-production-api-url.com
```

Or pass inline per build:

```bash
EXPO_PUBLIC_API_URL=https://your-api.com eas build --profile production --platform android
```

### 3. Run the production build

```bash
eas build --profile production --platform android
```

This queues a cloud build and returns a download link for the `.aab` when done. No local Android SDK required.

### Build profiles

Defined in `eas.json`:

| Profile | Output | Distribution | Use for |
|---|---|---|---|
| `development` | dev client | internal | local dev with native modules |
| `preview` | `.apk` | internal | testing on devices without Play Store |
| `production` | `.aab` | store | Play Store submission |

To install a **preview APK** directly on a device:

```bash
eas build --profile preview --platform android
# Download the .apk from the link and install via adb or share the link
```

---

## Submitting to Google Play

### First submission (manual)

1. Go to [Google Play Console](https://play.google.com/console) → your app → **Production** track
2. Create a new release, upload the `.aab` downloaded from the EAS build
3. Fill in release notes, roll out

### Subsequent submissions via EAS Submit

Once the app is live on the Play Store, you can automate submission:

```bash
eas submit --platform android --latest
```

This picks up the most recent production build automatically. You'll need a Google Play service account JSON configured in your EAS project (see [EAS Submit docs](https://docs.expo.dev/submit/android/)).

---

## Auth Flow

Login uses phone + OTP (no passwords):

1. Enter phone number → backend sends OTP via SMS
2. If the phone is linked to multiple schools, a school picker appears
3. Enter the 6-digit OTP → session token saved to device secure storage
4. All subsequent requests use this token; a 401 response clears the session and redirects to login

Token is stored in `expo-secure-store` (encrypted, tied to device credentials).

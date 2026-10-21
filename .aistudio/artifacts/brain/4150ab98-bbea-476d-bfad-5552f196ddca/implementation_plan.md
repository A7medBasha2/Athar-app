# Athar Secure Profile Management & Cloud Storage System

A robust, enterprise-grade profile management system for Athar (`com.athar.islamic`) supporting high-performance avatar image optimization, Firebase Cloud Storage uploads with live progress and retry, Firestore user document synchronization, and zero-trust security rules—all while strictly preserving the application's existing visual design.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural decisions were confirmed during Phase 1 interactive clarification:
> - **Avatar Storage Strategy**: Firebase Cloud Storage with download URL synchronization into the Firestore `users/{userId}` document (`photoURL` <= 2048 characters), with client-side cached fallback for offline resilience.
> - **Image Picker Flow**: Universal system photo picker (`<input type="file" accept="image/*">`) triggering native Android photo picker sheet / system gallery on mobile and native file dialog on web, with instant client-side preview, canvas-based resizing/compression, and validation.
> - **Design Preservation**: Zero modifications to existing UI colors, typography, frame sizes, and medallion alignments ("do not change anything in the design").

---

## 1. Overview & Core Concept

- **What It Does**: Enables Muslim users to personalize their spiritual journey profile in Athar by managing their display name, handle (`username`), spiritual intention/bio, and custom profile picture or royal avatar presets. It supports secure photo upload with real-time compression, progress indicator, replacement, and safe deletion back to the default Athar avatar.
- **Target Audience / Persona**: Users of Athar seeking an authenticated, synchronized profile that tracks spiritual streaks, levels, and deeds across devices.
- **Key Value**: Provides seamless, fault-tolerant profile customization with zero risk of orphaned media, strict user ownership isolation, and instant offline responsiveness.

---

## 2. User Experience & Visual Design

- **Existing Layout Continuity**: The 78px centered gold medallion frame with the bottom-right 22px gold camera badge remains intact. Clicking the badge opens the system photo picker.
- **Visual Feedback & Micro-Interactions**:
  - **Instant Preview**: Selected images immediately render inside the golden circular frame using a local object URL or compressed preview while the upload is staged.
  - **Upload Progress & States**: A sleek golden progress ring or pulse indicator appears during network transmission. If an upload fails, an inline Arabic retry prompt is displayed without losing form entries.
  - **Photo Actions**: Clear "رفع صورة" (Upload Image), "الصورة الافتراضية" (Reset to Athar default silhouette), and "حذف الصورة" (Remove current photo) options.
  - **Spiritual Presets**: Preserves the 6 royal gold/emerald avatar presets (`هلال الذهب`, `منارة الفجر`, `قبة النور`, `شعلة الأثر`, `مسبحة الذاكرين`, `درع السكينة`).
- **Form Controls**: Display name (up to 60 chars), username handle (alphanumeric, auto-trimmed), and intention bio (up to 180 chars) with tactile haptic feedback on save.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Client-Side Compression & Resizing (Canvas Pipeline)**
  - *Chosen Approach*: Downscale high-resolution phone camera photos (often 5MB–20MB) directly in the browser/WebView using HTML5 Canvas to a crisp 320x320 JPEG/WebP (~30KB–70KB) prior to transmission.
  - *Why*: Drastically reduces mobile data usage, prevents network timeouts on weak connections, avoids Cloud Storage billing bloat, and speeds up avatar rendering worldwide.
  - *Alternatives Considered*: Uploading raw 10MB images and resizing via Cloud Functions was rejected to avoid cold-start delays and additional backend runtime costs.

- **Decision 2: Safe Replace & Rollback (Orphan Elimination)**
  - *Chosen Approach*: When replacing an avatar, the new image is uploaded to a deterministic path `users/{uid}/profile_avatar.{ext}`. Once the upload and download URL generation succeed, the Firestore document and Firebase Auth `updateProfile` are updated. If the upload is cancelled or aborted, the previous photo URL remains intact.
  - *Why*: Eliminates broken avatar links and prevents corrupted user records.

- **Decision 3: Zero-Trust Security & Path Protection**
  - *Chosen Approach*: Firestore security rules restrict `read` and `write` on `/users/{userId}` strictly to `request.auth.uid == userId`. Storage rules restrict `write` on `users/{userId}/*` strictly to `request.auth.uid == userId` with content-type `image/*` and size limit `<= 2MB`.
  - *Why*: Guarantees that no user can overwrite or tamper with another user's profile data or uploaded assets.

---

## 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                    Athar Client Application                 │
│                                                             │
│   ┌─────────────────────────┐   ┌───────────────────────┐   │
│   │  ProfileDashboardView   │   │   ProfileEditModal    │   │
│   │  - 78px Centered Avatar │   │  - System Picker      │   │
│   │  - Golden Camera Badge  │   │  - Instant Preview    │   │
│   │  - Level & Stats Medals │   │  - Form Validation    │   │
│   └───────────┬─────────────┘   └───────────┬───────────┘   │
└───────────────┼─────────────────────────────┼───────────────┘
                │                             │
                ▼                             ▼
┌─────────────────────────────────────────────────────────────┐
│             AuthService & Storage Integration               │
│                                                             │
│   1. Validate file (type: image/*, max 2MB compressed)     │
│   2. Compress & scale to 320x320 via HTML Canvas           │
│   3. Upload to Firebase Storage: users/{uid}/avatar        │
│   4. Retrieve public downloadURL                           │
│   5. Atomic update: Firestore users/{uid} & Auth profile   │
│   6. Cache profile locally in localStorage for offline     │
└───────────────┬─────────────────────────────┬───────────────┘
                │                             │
                ▼                             ▼
┌─────────────────────────────┐ ┌─────────────────────────────┐
│    Cloud Firestore DB       │ │    Firebase Cloud Storage   │
│    `users/{userId}`         │ │    `users/{userId}/avatar`  │
│    - uid (immutable)        │ │    - Content-Type: image/*  │
│    - photoURL (URL)         │ │    - Size limit: <= 2MB     │
│    - displayName, username  │ │    - User isolated          │
│    - bio, createdAt         │ │                             │
└─────────────────────────────┘ └─────────────────────────────┘
```

### Component & Service Interaction Mapping:
1. **`src/services/storageService.ts` (or enhanced `authService.ts`)**:
   - `uploadProfilePhoto(uid: string, fileOrBlob: Blob, onProgress?: (pct: number) => void): Promise<string>`
   - `deleteProfilePhoto(uid: string): Promise<void>`
   - `compressImage(file: File, maxWidth?: number, quality?: number): Promise<Blob>`
2. **`src/services/authService.ts`**:
   - `updateUserProfile(uid, { displayName, username, bio, photoURL })` syncing `updateProfile(auth.currentUser)` and Firestore `users/{uid}`.
3. **`src/components/ProfileEditModal.tsx`**:
   - Manages preview state, upload progress percentage (0–100%), retry triggers, and validation errors.
4. **`src/tests/authSystem.test.ts`**:
   - Automated unit tests covering profile creation, validation boundaries, image compression logic, photo URL updates, removal, and cross-UID security assertions.

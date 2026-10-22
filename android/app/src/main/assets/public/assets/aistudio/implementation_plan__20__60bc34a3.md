# Athar Spiritual Habit, Particle Celebrations & Account Navigation Architecture

A focused implementation plan for integrating an elegant golden particle celebration system in the Achievements Modal, relocating the Cloud Account & Logout card to the Account screen, and adding a smooth top header back button in Settings.

## User Decisions & Clarifications Summary
- **Golden Particle Effect**: Elegant gold and amber particle burst (`#FFE6A0`, `#D9AE48`, `#B8860B`, `#F3E5AB`) triggered upon level up, milestone unlock, or inspecting an unlocked medallion. Uses `canvas-confetti` with high restraint (no loud game-like clutter, respecting the solemnity of spiritual achievements).
- **Settings Back Button**: Dedicated top header back button in `SettingsView` returning smoothly to the Account screen (`'profile'`).
- **Profile & Logout Relocation**: Moved from `SettingsView` to the bottom of `ProfileDashboardView` (Account screen), removing the redundant "الملف الشخصي" navigation button while preserving cloud sync status, guest login, and logout functionality.

---

## 1. Golden Particle Animation Architecture (`AchievementsOverviewModal.tsx`)
- **Engine**: Utilize `canvas-confetti` already available in `package.json`.
- **Particle Aesthetics**:
  - Palette: Athar royal gold spectrum `['#FFE6A0', '#D9AE48', '#B8860B', '#F3E5AB', '#ECC86C']`.
  - Motion: Low gravity (`0.8`), soft velocity, short scalar size, and subtle particle spread (40–50 particles max).
  - Triggers:
    1. Automatic detection when opening the modal if a level-up or new badge unlock occurred recently.
    2. When tapping an unlocked medal or tapping the level rosette.
    3. Respects `prefers-reduced-motion` and avoids flashing or visual noise.

---

## 2. Navigation & View Reorganization

### A. Settings View (`src/views/SettingsView.tsx`)
- **Top Header Back Button**:
  - Place a prominent, accessible top navigation button in the Settings header (`ArrowRight` in RTL direction) labeled "العودة إلى حسابي" or clean icon with touch target $\ge 44\text{px}$.
  - Seamlessly triggers `onNavigateTab('profile')` or `onBackToAccount()`.
- **Remove Account Card from Settings**:
  - Remove the Cloud Account & Identity Card and redundant "الملف الشخصي" button from `SettingsView`.
  - Keep all technical settings intact (Prayer calculation methods, Adhan/Iqamah, Quran reciters, Voice assistant, Offline backup & restore, Telemetry toggle, and GitHub repo update checks).

### B. Account / Profile Dashboard (`src/components/profile/ProfileDashboardView.tsx`)
- **Cloud Account & Logout Card Relocation**:
  - Add the Cloud Account & Session card at the bottom of the Account view (below the stats grid and journey banner).
  - Include:
    - User avatar (preset, photo, or silhouette fallback)
    - Name and email / guest status
    - Cloud sync badge (`سحابي` with icon)
    - Logout button (for authenticated users) with confirmation or direct toast
    - Login / Sync CTA button (for guest users)
    - **Excluded**: The redundant "الملف الشخصي" button is eliminated as requested.
  - Quick shortcut card to navigate to Settings ("الإعدادات والتنبيهات") so the user can easily toggle notifications, prayer times, and reciters.

### C. Application Shell (`src/App.tsx`)
- Ensure bidirectional navigation between `'profile'` and `'settings'` is seamlessly wired with correct props (`onBackToAccount`, `onOpenSettings`).

---

## 3. Step-by-Step Implementation Sequence

1. **Step 1: Particle Animation in `AchievementsOverviewModal.tsx`**
   - Import `confetti` from `canvas-confetti`.
   - Add `triggerGoldSparkles(originX?, originY?)` helper function configured with gold/amber particles, low count, and gentle decay.
   - Attach particle triggers to medal interactions and level rosette clicks.

2. **Step 2: Settings Header Back Button & Account Card Removal in `SettingsView.tsx`**
   - Add `onBackToAccount` to `SettingsViewProps`.
   - Add the top header back button with RTL arrow and smooth touch ergonomics.
   - Remove the cloud account & identity card block from `SettingsView`.

3. **Step 3: Account Screen Redesign in `src/components/profile/ProfileDashboardView.tsx`**
   - Import `AuthService`, `LogOut`, `LogIn`, `Cloud`, and related identity utilities.
   - Render the bottom Cloud Account & Session card (omitting the redundant profile button).
   - Ensure `handleLogout` and `onOpenAuth` events function correctly.

4. **Step 4: App Navigation Binding in `src/App.tsx`**
   - Connect `onBackToAccount={() => navigateToTab('profile')}` in `SettingsView`.

5. **Step 5: Verification & Quality Assurance**
   - Run `npm run test:gamification` to guarantee gamification integrity.
   - Run `lint_applet` and `compile_applet` to confirm zero TypeScript errors.

# Athar Royal Visual Asset System: Profile, Achievements & Level Progression

An end-to-end game-art direction and Islamic visual identity specification for Athar. This plan establishes a unified, cohesive visual language for the user profile, level system, and 3D achievement medals—rendered in antique 24K gold, dark velvet obsidian, subtle Islamic geometry, and refined directional lighting.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following art direction decisions have been confirmed via Phase 1 user clarification and govern the asset pipeline:

- **Confirmed Decision 1 (3D Achievement Medals Style)**: **Embossed 24K antique gold with engraved calligraphy**. Medals feature deep tactile relief, micro-faceted Islamic star geometry, and subtle directional warm lighting without garish gloss or neon artifacts.
- **Confirmed Decision 2 (Architectural & Empty-State Illustrations)**: **Architectural golden line-art with atmospheric dark gradients**. Atmospheric nocturnal mosque arches, minarets, and mihrab contours rendered in fine gold lines over deep obsidian surfaces (`#080807` to `#14120B`).
- **Confirmed Decision 3 (Badge State Differentiation)**: **Muted bronze silhouette for locked badges** and **radiating golden aura for unlocked/newly earned badges**, providing instant visual recognition at small mobile viewports without visual noise.

---

## 1. Overview & Core Concept

- **What It Delivers**: A comprehensive visual asset pipeline and design system token set covering 4 distinct categories:
  1. *Profile Imagery*: Authentic anonymous avatar, custom photo frame, camera trigger, and completion badge.
  2. *Achievement Medals*: 5 core worship milestones (Quran, Adhkar, Consistency/Streak, Saved Content/Wird, Beneficial Action/Sadaqah) plus distinctive Locked and Newly Unlocked states.
  3. *Level & Progression*: 3D Level rosette emblem, XP gold star, ornamental milestone progress bar, and next-level ascension crest.
  4. *Dashboard Architectural Art*: High-resolution Islamic sanctuary illustration for "رحلتك مع أثر", vector activity statistic icons, and an empty-state serene line-art composition.
- **Target Audience**: Devout users seeking a regal, tranquil digital sanctuary that honors their spiritual journey with reverence and understated elegance.
- **Key Value**: Replaces disparate placeholders with an integrated, high-resolution asset library crafted specifically for Athar's black-and-gold design system.

---

## 2. User Experience & Visual Design

### Visual Hierarchy & Art Direction Tokens

```
┌────────────────────────────────────────────────────────────────────────┐
│                      ATHAR COLOR & LIGHTING SYSTEM                     │
├────────────────────────────────────────────────────────────────────────┤
│  Velvet Obsidian (Base Canvas):      #080807 / #0B0F12                 │
│  Surface Elevation (Card Fill):       #14120B (Gradient to #0C0A07)    │
│  24K Antique Gold (Primary Emblems):  #D9AE48 (Highlights #FFE6A0)     │
│  Burnished Bronze (Locked Silhouettes):#4A3F28 (Muted 45% Opacity)     │
│  Atmospheric Aura (Unlocked Glow):    rgba(217, 174, 72, 0.35) blur-md │
└────────────────────────────────────────────────────────────────────────┘
```

### Component Integration Map

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          PROFILE DASHBOARD VIEW                         │
│                                                                         │
│  [Top Arched Backdrop]                                                  │
│         │                                                               │
│         ▼                                                               │
│  [ProfileAvatar] ───────> Inner Silhouette / User Photo                 │
│         │                 Gold Metallic Ring + Camera Action            │
│         ▼                                                               │
│  [Level & XP Card] ─────> Rosette Emblem (Left) + 3D XP Star (Right)    │
│         │                                                               │
│         ▼                                                               │
│  [Streak Card] ─────────> Burnished Gold Sprig + 3D Medallion Flame     │
│         │                                                               │
│         ▼                                                               │
│  [Activity Grid 2x2] ───> 24K Medallions: Quran, Sadaqah, Adhkar, Salah │
│         │                                                               │
│         ▼                                                               │
│  [Journey Banner] ─────> Architectural Line-Art Sanctuary               │
│         │                                                               │
│         ▼                                                               │
│  [Achievements Shelf] ──> 3D Embossed Badges (Quran, Tasbih, Flame, ...)│
│                           Unlocked: Radiating Gold Glow                 │
│                           Locked: Muted Bronze Silhouette               │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Comprehensive Asset Inventory & Specification

| Asset Name | Target Filename | Format | Dimensions | Purpose & Placement | Art Direction Specification |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Quran Milestone Medal** | `medal_quran_milestone.png` | WebP/PNG | 256x256 (renders 56px) | Achievement Badge: Quran completion & reading hours | 3D embossed circular antique 24K gold medal with open Holy Quran engraving, subtle arabesque rim, transparent bg. |
| **Adhkar Milestone Medal** | `medal_adhkar_milestone.png` | WebP/PNG | 256x256 (renders 56px) | Achievement Badge: Morning/Evening Adhkar & Tasbih | 3D antique gold medal featuring ornate 33-bead tasbih loop and crescent finial, soft relief shadows. |
| **Consistency Streak Medal**| `medal_streak_milestone.png` | WebP/PNG | 256x256 (renders 56px) | Achievement Badge: Multi-day devotion streak | 3D gold medal with stylized inner spiritual flame motif in brushed gold with micro-faceted sunburst border. |
| **Saved Content / Wird Medal**| `medal_saved_milestone.png` | WebP/PNG | 256x256 (renders 56px) | Achievement Badge: Khatmah bookmarks & Daily Wird | 3D gold medal with ornate bookmark ribbon and radiant star medallion, dark ambient occlusion. |
| **Beneficial Action Medal** | `medal_charity_milestone.png` | WebP/PNG | 256x256 (renders 56px) | Achievement Badge: Sadaqah & Community impact | 3D gold medal displaying cupped palms offering golden seeds/grain with delicate floral vine relief. |
| **Locked Achievement State** | `medal_locked_silhouette.png` | WebP/PNG | 256x256 (renders 56px) | All locked badges in shelf and modal | Heavy burnished dark bronze medallion silhouette, subtle bevel, engraved padlock glyph, zero glow. |
| **Level Rosette Emblem** | `emblem_level_rosette_3d.png` | WebP/PNG | 256x256 (renders 52px) | LevelProgressCard & ProfileDashboardView | Multi-tiered 12-point Islamic rosette in deep gold, centered star with level numeral window, crisp edges. |
| **3D XP Star** | `icon_xp_star_3d.png` | WebP/PNG | 256x256 (renders 42px) | Level & XP summary card | Dimensional faceted 5-point star in luminous 24K gold with soft ambient glow and micro drop-shadow. |
| **Journey with Athar Banner** | `journey_sanctuary_lineart.webp`| WebP | 800x340 (renders 16:9 banner) | "رحلتك مع أثر" Journey Banner | Fine architectural golden line-art of prophetic mosque domes and minarets on velvet dark night sky. |
| **Profile Empty State Art** | `profile_empty_sanctuary.webp` | WebP | 600x400 (renders card) | Brand-new profile zero-state | Elegant golden mihrab arch line-art with peaceful lantern silhouette and subtle geometric gradient. |

---

## 4. Technical Architecture & Integration Strategy

### Generation & Implementation Phases

1. **Batch Image Generation Turn (`generate_image`)**:
   - In accordance with the `image-generation` skill rules, all required visual raster assets will be emitted in a single parallel batch turn:
     - `generate_image` for `medal_quran_milestone` (1:1)
     - `generate_image` for `medal_adhkar_milestone` (1:1)
     - `generate_image` for `medal_streak_milestone` (1:1)
     - `generate_image` for `medal_charity_milestone` (1:1)
     - `generate_image` for `medal_locked_silhouette` (1:1)
     - `generate_image` for `journey_sanctuary_lineart` (16:9)
2. **Component Integration Turn**:
   - Update `AchievementBadge.tsx` and `AchievementDetailModal.tsx` to bind the new 3D embossed medal assets with glowing unlocked radial gradients and muted bronze locked states.
   - Update `JourneyBanner.tsx` with the new atmospheric architectural line-art asset.
   - Add accessible labels, `referrerPolicy="no-referrer"`, and responsive picture scaling.
3. **Automated Verification**:
   - Run `npm run test:gamification` to guarantee badge IDs, visual states, and achievement criteria remain 100% verified.
   - Run `lint_applet` and `compile_applet`.

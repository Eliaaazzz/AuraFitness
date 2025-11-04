Title: Migrate LoadingSpinner to Material ActivityIndicator (MD3)
Date: 2025-10-31
Owner: Mobile

Summary
- Replaced our custom reanimated LoadingSpinner with react-native-paper ActivityIndicator to achieve full Material (MD3) consistency, reduce custom animation code, and rely on platform/theme-aware defaults.

Motivation
- Align UI components with Material design (react-native-paper) per project direction.
- Reduce maintenance and animation edge cases by removing custom spinner logic.
- Ensure consistent theming, accessibility roles, and performance behavior across platforms.

Scope
- Mobile app only; component API preserved (size, color) to avoid touching callers.

Changes
- Updated component implementation:
  - File: fitness-mvp/src/components/LoadingSpinner.tsx
  - Removed react-native-reanimated dependency for spinner animation.
  - Implemented wrapper around Paper ActivityIndicator.
  - Kept existing API: size: 'small' | 'medium' | 'large' mapped to px (16/24/32), optional color.
- No changes required for usage sites:
  - fitness-mvp/src/components/CameraView.tsx (processing overlay)
  - fitness-mvp/src/components/LoadingState.tsx
  - fitness-mvp/src/screens/DesignSystemScreen.tsx

Compatibility & Accessibility
- ActivityIndicator exposes accessibilityRole="progressbar" and respects theme contrast.
- Using numeric size mapping preserves visual density similar to previous spinner.

Testing
- Ran existing mobile test suites (unit tests): 5 suites, 23 tests passed.
- Manual sanity (dev): verify spinner shows in camera processing overlay and LoadingState.

Risks & Mitigations
- Visual differences vs custom spinner (stroke style). Mitigation: use MD3 standard across the app.
- If any caller relied on exact container sizing, our wrapper centers the spinner and preserves typical bounds.

Follow-ups (Optional)
- Replace any remaining ad-hoc spinners with ActivityIndicator directly where appropriate.
- Consider exposing variants (primary/secondary surface color) via theme for dark/light modes.


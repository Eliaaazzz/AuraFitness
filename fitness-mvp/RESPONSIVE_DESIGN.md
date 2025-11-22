# Responsive Design Guide

This guide explains how to use the responsive design system in the FitnessMVP app to create layouts that work seamlessly across mobile phones, tablets, and desktop browsers.

## Overview

The app is built with React Native and Expo, which means it runs natively on iOS and Android, and also works in web browsers. The responsive design system ensures your UI adapts beautifully across all these platforms and screen sizes.

## Breakpoints

The responsive system uses these breakpoints:

```typescript
{
  mobile: 0,      // 0-639px (phones in portrait)
  tablet: 640,    // 640-1023px (large phones landscape, small tablets)
  desktop: 1024,  // 1024-1439px (tablets landscape, small desktops)
  wide: 1440,     // 1440px+ (large desktops)
}
```

## Core Hooks

### `useResponsive()`

The main hook that provides all responsive information:

```typescript
import { useResponsive } from '@/utils';

function MyComponent() {
  const {
    width,           // Current window width
    height,          // Current window height
    deviceType,      // 'mobile' | 'tablet' | 'desktop' | 'wide'
    orientation,     // 'portrait' | 'landscape'
    isSmallMobile,   // true if width < 375px
    isMobile,        // true if mobile device
    isTablet,        // true if tablet size
    isDesktop,       // true if desktop or wide
    isWide,          // true if 1440px+
    isPortrait,      // true if portrait orientation
    isLandscape,     // true if landscape orientation
    isWeb,           // true if running on web
    isNative,        // true if running on native iOS/Android
  } = useResponsive();

  return (
    <View style={{ padding: isMobile ? 16 : 32 }}>
      {isDesktop ? <DesktopLayout /> : <MobileLayout />}
    </View>
  );
}
```

### `useResponsiveValue()`

Returns different values based on device type:

```typescript
import { useResponsiveValue } from '@/utils';

function MyComponent() {
  const padding = useResponsiveValue({
    mobile: 16,
    tablet: 24,
    desktop: 32,
    wide: 48,
  });

  const columns = useResponsiveValue({
    mobile: 1,
    tablet: 2,
    desktop: 3,
  }); // Returns mobile value if tablet/desktop not specified

  return <View style={{ padding }} />;
}
```

### `useResponsiveColumns()`

Helper for grid layouts:

```typescript
import { useResponsiveColumns } from '@/utils';

function RecipeGrid() {
  const columns = useResponsiveColumns();
  // Returns: 1 on mobile, 2 on tablet, 3 on desktop, 4 on wide

  const customColumns = useResponsiveColumns({
    mobile: 1,
    tablet: 3,
    desktop: 4,
    wide: 5,
  });

  return <ResponsiveGrid columns={customColumns}>{/* ... */}</ResponsiveGrid>;
}
```

### Other Useful Hooks

```typescript
// Responsive spacing (multiplies base value by device-specific scale)
const spacing = useResponsiveSpacing(16);
// Returns: 16 on mobile, 20 on tablet, 24 on desktop, 28 on wide

// Responsive font size
const fontSize = useResponsiveFontSize(14);
// Returns: 14 on mobile, 15.4 on tablet, 16.1 on desktop, 16.8 on wide

// Container max width (prevents content from becoming too wide)
const maxWidth = useContainerMaxWidth();
// Returns: undefined on mobile/tablet, 1200 on desktop, 1440 on wide

// Responsive padding helper
const padding = useResponsivePadding();
// Returns: 16 on mobile, 24 on tablet, 32 on desktop, 48 on wide

// Check if touch device
const isTouch = useIsTouchDevice();
// Returns: true on native, checks for touch support on web
```

## Components

### `<Container>`

Enhanced container with responsive padding and max-width constraints:

```typescript
import { Container } from '@/components';

function MyScreen() {
  return (
    <Container>
      {/* Content automatically gets responsive padding and max-width */}
    </Container>
  );
}

// Disable centering or responsive padding if needed
<Container centered={false} responsivePadding={false}>
  {/* ... */}
</Container>
```

### `<ResponsiveGrid>`

Grid layout that adapts columns based on screen size:

```typescript
import { ResponsiveGrid } from '@/components';

function RecipeList({ recipes }) {
  return (
    <ResponsiveGrid
      columns={{
        mobile: 1,
        tablet: 2,
        desktop: 3,
        wide: 4,
      }}
      gap={16}
    >
      {recipes.map((recipe) => (
        <RecipeCard key={recipe.id} item={recipe} />
      ))}
    </ResponsiveGrid>
  );
}

// Use default columns (1, 2, 3, 4)
<ResponsiveGrid>
  {items.map((item) => (
    <Card key={item.id}>{item.title}</Card>
  ))}
</ResponsiveGrid>
```

### `<ResponsiveRender>`

Conditionally render different components based on device type:

```typescript
import { ResponsiveRender } from '@/utils';

function Navigation() {
  return (
    <ResponsiveRender
      mobile={<BottomTabNavigation />}
      desktop={<SidebarNavigation />}
    />
  );
}

// Falls back to previous size if not specified
<ResponsiveRender
  mobile={<MobileView />}
  tablet={<TabletView />}
  // Desktop and wide will render TabletView
/>
```

## Examples

### Responsive Card Component

```typescript
import { useResponsive, useResponsiveValue } from '@/utils';
import { Card } from '@/components';

function ProductCard({ product }) {
  const { isDesktop } = useResponsive();

  const imageHeight = useResponsiveValue({
    mobile: 200,
    tablet: 240,
    desktop: 280,
    wide: 320,
  });

  return (
    <Card>
      <Image
        source={{ uri: product.image }}
        style={{ width: '100%', height: imageHeight }}
      />
      <View style={{ flexDirection: isDesktop ? 'row' : 'column' }}>
        <Text>{product.title}</Text>
        <Text>{product.price}</Text>
      </View>
    </Card>
  );
}
```

### Responsive List/Grid Screen

```typescript
import { useResponsive } from '@/utils';
import { ResponsiveGrid, Container } from '@/components';

function ProductsScreen({ products }) {
  const { isMobile } = useResponsive();

  // On mobile, use FlatList for better performance
  // On desktop/tablet, use grid for better layout
  if (isMobile) {
    return (
      <Container>
        <FlatList
          data={products}
          renderItem={({ item }) => <ProductCard product={item} />}
        />
      </Container>
    );
  }

  return (
    <Container>
      <ResponsiveGrid>
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </ResponsiveGrid>
    </Container>
  );
}
```

### Responsive Spacing and Layout

```typescript
import { useResponsivePadding, useResponsive } from '@/utils';

function SettingsScreen() {
  const padding = useResponsivePadding();
  const { isDesktop } = useResponsive();

  return (
    <View
      style={{
        padding,
        flexDirection: isDesktop ? 'row' : 'column',
        gap: padding,
      }}
    >
      <SettingsSidebar />
      <SettingsContent />
    </View>
  );
}
```

### Creating Responsive Styles

```typescript
import { createResponsiveStyles, useResponsive } from '@/utils';

const getStyles = createResponsiveStyles((r) => ({
  container: {
    padding: r.isMobile ? 16 : 32,
    flexDirection: r.isDesktop ? 'row' : 'column',
    maxWidth: r.isDesktop ? 1200 : undefined,
  },
  text: {
    fontSize: r.isMobile ? 14 : r.isTablet ? 16 : 18,
  },
}));

function MyComponent() {
  const responsive = useResponsive();
  const styles = getStyles(responsive);

  return <View style={styles.container}>{/* ... */}</View>;
}
```

## Web-Specific Features

### PWA Support

The app includes Progressive Web App support via:

- `/web/manifest.json` - App manifest for installation
- `/web/index.html` - Custom HTML with meta tags
- Service worker registration for offline support

### Viewport Configuration

The viewport is configured in `web/index.html`:

```html
<meta
  name="viewport"
  content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes, viewport-fit=cover"
/>
```

### App Configuration

Web-specific settings in `app.json`:

```json
{
  "web": {
    "bundler": "metro",
    "output": "single",
    "meta": {
      "viewport": "width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes"
    }
  }
}
```

## Running on Web

To test your responsive design on web:

```bash
# Start the web development server
npm run web
# or
npx expo start --web

# Build for web production
npx expo export:web
```

The app will open in your browser where you can:
- Resize the window to test different breakpoints
- Use browser DevTools to simulate mobile devices
- Test touch vs mouse interactions

## Best Practices

### 1. Mobile-First Approach

Always design for mobile first, then enhance for larger screens:

```typescript
// Good
const padding = useResponsiveValue({
  mobile: 16,
  tablet: 24,
  desktop: 32,
});

// Less ideal (missing mobile)
const padding = useResponsiveValue({
  tablet: 24,
  desktop: 32,
  // Falls back to tablet value on mobile
});
```

### 2. Performance Considerations

- Use `FlatList` on mobile for long lists (better performance)
- Consider using `ResponsiveGrid` only on tablet/desktop
- Lazy load images with appropriate sizes per breakpoint

### 3. Touch-Friendly Design

- Maintain minimum 44x44 touch targets on mobile
- Use hover states only on non-touch devices
- Test gesture navigation on all breakpoints

### 4. Content Strategy

```typescript
const { isMobile, isDesktop } = useResponsive();

return (
  <View>
    <Text numberOfLines={isMobile ? 2 : undefined}>
      {isMobile ? product.shortDescription : product.fullDescription}
    </Text>
  </View>
);
```

### 5. Testing

Test on multiple devices and breakpoints:

- Mobile: iPhone SE (375px), iPhone Pro (390px)
- Tablet: iPad (768px), iPad Pro (1024px)
- Desktop: Small (1280px), Medium (1440px), Large (1920px+)

## Common Patterns

### Responsive Image Heights

```typescript
const imageHeight = useResponsiveValue({
  mobile: 200,
  tablet: 240,
  desktop: 280,
  wide: 320,
});

<Image style={{ height: imageHeight }} />;
```

### Adaptive Navigation

```typescript
const { isDesktop } = useResponsive();

// Tab bar height adapts to screen size
const tabBarHeight = isDesktop ? 70 : isTablet ? 65 : 60;
```

### Centered Desktop Layout

```typescript
const maxWidth = useContainerMaxWidth();

<View style={{ maxWidth, alignSelf: 'center', width: '100%' }}>
  {/* Content is centered on desktop */}
</View>
```

### Responsive Typography

```typescript
const fontSize = useResponsiveFontSize(16);
const lineHeight = fontSize * 1.5;

<Text style={{ fontSize, lineHeight }}>{content}</Text>
```

## Troubleshooting

### Component not updating on resize

Make sure you're using hooks inside the component, not in StyleSheet.create:

```typescript
// ❌ Wrong - computed once
const styles = StyleSheet.create({
  container: {
    padding: useResponsivePadding(), // Error: hooks can't be used here
  },
});

// ✅ Correct - computed on each render
function MyComponent() {
  const padding = useResponsivePadding();

  return <View style={{ padding }}>{/* ... */}</View>;
}
```

### Web styles not applying

Check that you're testing on the correct breakpoint. Use browser DevTools to inspect the actual window width.

### Grid items not sizing correctly

Ensure parent container has a defined width:

```typescript
<View style={{ flex: 1 }}>
  <ResponsiveGrid>{/* ... */}</ResponsiveGrid>
</View>
```

## Resources

- [React Native Web Docs](https://necolas.github.io/react-native-web/)
- [Expo Web Docs](https://docs.expo.dev/workflow/web/)
- [Material Design Responsive Layout](https://m3.material.io/foundations/layout/applying-layout/window-size-classes)

## Migration Guide

To convert an existing component to be responsive:

1. Import responsive hooks:

```typescript
import { useResponsive, useResponsiveValue } from '@/utils';
```

2. Replace fixed values:

```typescript
// Before
<View style={{ padding: 16 }}>

// After
const padding = useResponsivePadding();
<View style={{ padding }}>
```

3. Add conditional layouts:

```typescript
const { isDesktop } = useResponsive();

<View style={{ flexDirection: isDesktop ? 'row' : 'column' }}>
```

4. Update containers:

```typescript
// Before
<View style={{ flex: 1 }}>

// After
<Container>
```

5. Use responsive grids for card lists:

```typescript
// Before
<FlatList data={items} ... />

// After (for desktop)
<ResponsiveGrid>
  {items.map(item => <Card key={item.id} />)}
</ResponsiveGrid>
```

---

## Summary

The responsive design system provides:

- ✅ Automatic adaptation to mobile, tablet, and desktop
- ✅ Easy-to-use hooks for responsive values
- ✅ Pre-built responsive components
- ✅ PWA support for installable web app
- ✅ Performance optimization per device type
- ✅ Touch and mouse input handling

Use these tools to create a consistent, beautiful experience across all devices!

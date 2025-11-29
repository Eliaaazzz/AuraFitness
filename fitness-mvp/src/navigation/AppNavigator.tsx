# Switch to Node 18 or 20 (if you have nvm)
nvm use 18

# From repo root
cd fitness-mvp
rm -rf node_modules
npm install
npx expo export:web --output-dir web-dist

# Package and upload
cd ..
tar -czf frontend-web-deploy-fixed.tar.gz -C fitness-mvp/web-dist .
scp -i Elialiuuuu.pem frontend-web-deploy-fixed.tar.gz ec2-user@3.104.117.222:/home/ec2-user/import React from 'react';
import { Platform, View } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useColorScheme } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';

import { CaptureScreen } from '@/screens/CaptureScreen';
import { WorkoutsScreen } from '@/screens/WorkoutsScreen';
import { RecipesScreen } from '@/screens/RecipesScreen';
import { ResultsScreen } from '@/screens/ResultsScreen';
import { DesignSystemScreen } from '@/screens/DesignSystemScreen';
import { MealPlanScreen } from '@/screens/MealPlanScreen';
import { CommunityScreen } from '@/screens/CommunityScreen';
import { GoalsScreen } from '@/screens/GoalsScreen';
import { BRAND_COLORS, TAB_ICON_SIZE, useResponsive } from '@/utils';

const Tab = createBottomTabNavigator();

const tabBarBackground = () => (
  <View
    style={{
      backgroundColor: BRAND_COLORS.surface,
      flex: 1,
      borderTopWidth: 0,
    }}
  />
);

const LightNavigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: BRAND_COLORS.primary,
    background: '#FFFFFF',
    card: '#FFFFFF',
    text: '#0F172A',
    border: '#E2E8F0',
    notification: BRAND_COLORS.secondary,
  },
};

const DarkNavigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: BRAND_COLORS.primary,
    background: BRAND_COLORS.background,
    card: BRAND_COLORS.surface,
    text: BRAND_COLORS.textPrimary,
    border: 'rgba(255,255,255,0.1)',
    notification: BRAND_COLORS.secondary,
  },
};

export const AppNavigator = () => {
  const colorScheme = useColorScheme();
  const { isDesktop, isTablet, isMobile, isWeb } = useResponsive();

  // Calculate responsive tab bar dimensions
  const tabBarHeight = isDesktop ? 70 : isTablet ? 65 : Platform.select({ ios: 60, android: 56 });
  const tabBarPaddingBottom = isDesktop ? 16 : isTablet ? 12 : Platform.select({ ios: 12, android: 8 });
  const tabBarPaddingTop = isDesktop ? 12 : 8;

  return (
    <NavigationContainer theme={colorScheme === 'dark' ? DarkNavigationTheme : LightNavigationTheme}>
      <Tab.Navigator
        initialRouteName="Capture"
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: BRAND_COLORS.primary,
          tabBarInactiveTintColor: BRAND_COLORS.tabInactive,
          tabBarHideOnKeyboard: true,
          // Show label text on desktop/tablet for better UX
          tabBarLabelStyle: {
            fontSize: isDesktop ? 13 : isTablet ? 12 : 11,
            fontWeight: '600',
          },
          tabBarStyle: {
            height: tabBarHeight,
            paddingBottom: tabBarPaddingBottom,
            paddingTop: tabBarPaddingTop,
            paddingHorizontal: isDesktop ? 32 : isTablet ? 16 : 0,
            backgroundColor: BRAND_COLORS.surface,
            borderTopWidth: 0,
            elevation: 10,
            shadowColor: '#000',
            shadowOpacity: 0.1,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: -2 },
            // Add max-width constraint on desktop for centered tab bar
            ...(isDesktop && isWeb && {
              alignSelf: 'center',
              width: '100%',
              maxWidth: 1200,
            }),
          },
          tabBarBackground,
          tabBarIcon: ({ color, focused }) => {
            switch (route.name) {
              case 'Capture':
                return (
                  <Feather
                    name="camera"
                    size={focused ? TAB_ICON_SIZE.focused : TAB_ICON_SIZE.default}
                    color={color}
                  />
                );
              case 'Workouts':
                return (
                  <MaterialCommunityIcons
                    name={focused ? 'dumbbell' : 'dumbbell'}
                    size={focused ? TAB_ICON_SIZE.focused : TAB_ICON_SIZE.default}
                    color={color}
                  />
                );
              case 'Recipes':
                return (
                  <Feather
                    name="coffee"
                    size={focused ? TAB_ICON_SIZE.focused : TAB_ICON_SIZE.default}
                    color={color}
                  />
                );
              case 'Community':
                return (
                  <MaterialCommunityIcons
                    name={focused ? 'trophy' : 'trophy-outline'}
                    size={focused ? TAB_ICON_SIZE.focused : TAB_ICON_SIZE.default}
                    color={color}
                  />
                );
              case 'MealPlan':
                return (
                  <MaterialCommunityIcons
                    name={focused ? 'food-apple' : 'food-apple-outline'}
                    size={focused ? TAB_ICON_SIZE.focused : TAB_ICON_SIZE.default}
                    color={color}
                  />
                );
              case 'Goals':
                return (
                  <MaterialCommunityIcons
                    name={focused ? 'target' : 'target-variant'}
                    size={focused ? TAB_ICON_SIZE.focused : TAB_ICON_SIZE.default}
                    color={color}
                  />
                );
              case 'DesignSystem':
                return (
                  <Feather
                    name="tool"
                    size={focused ? TAB_ICON_SIZE.focused : TAB_ICON_SIZE.default}
                    color={color}
                  />
                );
              case 'Results':
                return (
                  <Feather
                    name="list"
                    size={focused ? TAB_ICON_SIZE.focused : TAB_ICON_SIZE.default}
                    color={color}
                  />
                );
              default:
                return null;
            }
          },
        })}
      >
        <Tab.Screen name="Capture" component={CaptureScreen} options={{ title: 'Capture' }} />
        <Tab.Screen name="Community" component={CommunityScreen} options={{ title: 'Community' }} />
        <Tab.Screen name="Workouts" component={WorkoutsScreen} options={{ title: 'Workouts' }} />
        <Tab.Screen name="MealPlan" component={MealPlanScreen} options={{ title: 'Meal Plan' }} />
        <Tab.Screen name="Recipes" component={RecipesScreen} options={{ title: 'Recipes' }} />
        <Tab.Screen name="Goals" component={GoalsScreen} options={{ title: 'Goals' }} />
        {__DEV__ && (
          <Tab.Screen name="DesignSystem" component={DesignSystemScreen} options={{ title: 'Design' }} />
        )}
        <Tab.Screen
          name="Results"
          component={ResultsScreen}
          options={{
            title: 'Results',
            // Hide from the tab bar but keep routable for navigation
            tabBarButton: () => null,
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
};





import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { MD3DarkTheme as PaperDarkTheme, MD3LightTheme as PaperLightTheme, Provider as PaperProvider } from 'react-native-paper';

import { AppNavigator } from '@/navigation/AppNavigator';
import { BRAND_COLORS } from '@/utils';
import { queryClient } from '@/services';
import { SnackbarProvider } from '@/components';

const App = () => {
  const colorScheme = useColorScheme();
  const barStyle = colorScheme === 'dark' ? 'light' : 'dark';

  const paperTheme = colorScheme === 'dark' ? PaperDarkTheme : PaperLightTheme;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: BRAND_COLORS.background }}>
      <SafeAreaProvider>
        <PaperProvider theme={paperTheme}>
          <QueryClientProvider client={queryClient}>
            <SnackbarProvider>
              <StatusBar style={barStyle} />
              <AppNavigator />
            </SnackbarProvider>
          </QueryClientProvider>
        </PaperProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;

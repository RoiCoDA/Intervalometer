import { Stack } from "expo-router";
import { useEffect } from "react";
import { I18nManager } from "react-native";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";

export default function RootLayout() {
  
  useEffect(() => {
    // Keeping the app LTR only, no confusion when device language is set to RTL
    if (I18nManager.isRTL) {
      I18nManager.allowRTL(false);
      I18nManager.forceRTL(false);
    }
    // Match system bars to the app's dark background
    SystemUI.setBackgroundColorAsync('#1a1a1a');
  }, []);

  return (
    <>
    <StatusBar style="light" />
    <Stack
      screenOptions={{
        
        headerStyle: { backgroundColor: '#1a1a1a' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
        headerShadowVisible: false, 
      }}
    > 
      <Stack.Screen 
        name="index" 
        options={{ title: 'Intervalometer' }} 
      />
      
      
      <Stack.Screen 
        name='create-procedure' 
        options={{ 
          title: 'Editor',
          headerStyle: { backgroundColor: '#37474F' }, 
        }}
      />
      
  
      <Stack.Screen 
        name='run-procedure' 
        options={{ 
          title: 'Run Procedure',
        }}
      />
    </Stack>
    </>
  );
}
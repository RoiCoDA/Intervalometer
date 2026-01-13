import { Stack } from "expo-router";

export default function RootLayout() {
  return <Stack
    screenOptions={{
      headerStyle: {backgroundColor: '#f4511e'},
      headerTintColor: '#fff',
      headerTitleStyle: { fontWeight: 'bold'},
    }}
  > 
  <Stack.Screen name="index" options={{ title: 'Intervalometer'}}/>
  <Stack.Screen name='create-procedure' options={{ title: 'Create Procedure'}}/>
  <Stack.Screen name='run-procedure' options={{title: 'Run Procedure'}}/>
  </Stack>;
}

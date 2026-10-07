import { Redirect, Stack, useSegments } from 'expo-router';

import { useAuth } from '@/lib/auth';

export default function RootLayout() {
  const { session } = useAuth();
  const segments = useSegments();

  const path = segments?.[0];
  const inAuthGroup = path === 'login' || path === 'register';
  const inTabsGroup = path === '(tabs)';

  return (
    <Stack initialRouteName="login" screenOptions={{ headerShown: false }}>
      {!session && inTabsGroup && <Redirect href="/login" />}
      {session && inAuthGroup && <Redirect href="/(tabs)" />}
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}

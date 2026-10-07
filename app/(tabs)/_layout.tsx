import { Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Platform, StyleSheet } from 'react-native';

import { COLORS } from '@/constants/colors';

const tabs = [
  { name: 'index', label: 'Home', icon: 'home', focusedIcon: 'home-sharp' },
  { name: 'scan', label: 'Scan', icon: 'qr-code-outline', focusedIcon: 'qr-code' },
  { name: 'history', label: 'History', icon: 'time-outline', focusedIcon: 'time' },
  { name: 'teacher', label: 'Teacher', icon: 'clipboard-outline', focusedIcon: 'clipboard' },
  { name: 'profile', label: 'Profile', icon: 'person-outline', focusedIcon: 'person' },
] as const;

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: COLORS.background,
          borderBottomColor: COLORS.border,
          borderBottomWidth: 1,
        },
        headerShadowVisible: false,
        headerTintColor: COLORS.textPrimary,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.label,
        tabBarItemStyle: styles.item,
      }}
    >
      {tabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.label,
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? tab.focusedIcon : tab.icon}
                color={color}
                size={23}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.card,
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
    height: Platform.OS === 'ios' ? 82 : 72,
    paddingBottom: Platform.OS === 'ios' ? 10 : 0,
    paddingTop: 8,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
});
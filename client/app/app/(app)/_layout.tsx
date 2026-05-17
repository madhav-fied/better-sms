import { useEffect } from 'react';
import { Tabs, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/auth';
import { useParentChildStore } from '../../store/parentChild';
import { getMe } from '../../lib/api/auth';
import { getMyChildren } from '../../lib/api/parent';
import { useRole } from '../../hooks/useRole';
import { Role } from '../../types/auth';

interface TabDef {
  name: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  roles: Role[];
}

const ALL_TABS: TabDef[] = [
  { name: 'dashboard/index', title: 'Home', icon: 'home-outline', roles: ['superadmin', 'admin', 'teacher', 'staff', 'student', 'parent'] },
  { name: 'attendance/index', title: 'Attendance', icon: 'checkmark-circle-outline', roles: ['admin', 'teacher', 'staff', 'student', 'parent'] },
  { name: 'homework/index', title: 'Homework', icon: 'book-outline', roles: ['teacher', 'student', 'parent'] },
  { name: 'notices/index', title: 'Notices', icon: 'notifications-outline', roles: ['superadmin', 'admin', 'teacher', 'staff', 'student', 'parent'] },
  { name: 'concerns/index', title: 'Concerns', icon: 'chatbubble-outline', roles: ['admin', 'teacher', 'parent'] },
  { name: 'leaves/index', title: 'Leaves', icon: 'calendar-outline', roles: ['admin', 'teacher', 'staff', 'student'] },
  { name: 'results/index', title: 'Results', icon: 'trophy-outline', roles: ['teacher', 'student', 'parent'] },
  { name: 'settings/index', title: 'Settings', icon: 'person-outline', roles: ['superadmin', 'admin', 'teacher', 'staff', 'student', 'parent'] },
];

export default function AppLayout() {
  const { token, setSession, clearSession } = useAuthStore();
  const { role } = useRole();
  const { setChildren } = useParentChildStore();

  useEffect(() => {
    if (!token) { router.replace('/(auth)/login'); return; }
    getMe()
      .then((res) => {
        const d = res.data;
        setSession({
          token: token!,
          role: d.role,
          schoolId: d.school_id,
          userId: d.id,
          entityId: d.entity_id,
          expiresAt: d.expires_at,
        });
        if (d.role === 'parent') {
          getMyChildren(d.id)
            .then((r) => setChildren(r.data ?? []))
            .catch(() => {});
        }
      })
      .catch(() => { clearSession(); router.replace('/(auth)/login'); });
  }, []);

  const tabs = ALL_TABS.filter((t) => role && t.roles.includes(role));

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#4f46e5',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: { borderTopColor: '#e5e7eb' },
        headerStyle: { backgroundColor: '#fff' },
        headerTintColor: '#111827',
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      {ALL_TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name={tab.icon} size={size} color={color} />
            ),
            href: tabs.find((t) => t.name === tab.name) ? undefined : null,
          }}
        />
      ))}
    </Tabs>
  );
}

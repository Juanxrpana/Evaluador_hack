import { Redirect } from 'expo-router';

import { useSession } from '@/lib/session';

export default function Index() {
  const { user } = useSession();
  return <Redirect href={user ? '/(tabs)' : '/(auth)/sign-in'} />;
}

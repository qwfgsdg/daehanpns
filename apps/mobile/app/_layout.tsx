import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#2563eb',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: '대한P&S',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="register"
        options={{
          title: '회원가입',
        }}
      />
      <Stack.Screen
        name="login"
        options={{
          title: '로그인',
        }}
      />
    </Stack>
  );
}

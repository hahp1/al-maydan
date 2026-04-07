import { useState } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  StatusBar, Alert, ActivityIndicator,
} from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from './firebaseConfig';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen({ onLogin, onGuest }) {
  const [loadingGoogle, setLoadingGoogle] = useState(false);

  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: 'YOUR_ANDROID_CLIENT_ID',
    webClientId: 'YOUR_WEB_CLIENT_ID',
  });

  const handleGoogle = async () => {
    setLoadingGoogle(true);
    try {
      const result = await promptAsync();
      if (result?.type === 'success') {
        const { id_token } = result.params;
        const credential = GoogleAuthProvider.credential(id_token);
        const userCredential = await signInWithCredential(auth, credential);
        const user = userCredential.user;
        onLogin({
          name: user.displayName || 'مستخدم',
          email: user.email,
          photo: user.photoURL,
        });
      }
    } catch (e) {
      Alert.alert('خطأ', 'فشل تسجيل الدخول بـ Google');
    } finally {
      setLoadingGoogle(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <Text style={styles.title}>الميدان</Text>
      <Text style={styles.subtitle}>لعبة المعرفة والتحدي</Text>

      <TouchableOpacity
        style={styles.googleBtn}
        onPress={handleGoogle}
        disabled={loadingGoogle || !request}
      >
        {loadingGoogle ? (
          <ActivityIndicator color="#0d0d2b" />
        ) : (
          <Text style={styles.googleText}>تسجيل الدخول بـ Google</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.guestBtn} onPress={onGuest}>
        <Text style={styles.guestText}>دخول كضيف</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d2b',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#f5c518',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#aaa',
    marginBottom: 60,
  },
  googleBtn: {
    backgroundColor: '#f5c518',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 12,
    marginBottom: 16,
    width: '100%',
    alignItems: 'center',
  },
  googleText: {
    color: '#0d0d2b',
    fontSize: 16,
    fontWeight: 'bold',
  },
  guestBtn: {
    borderWidth: 1,
    borderColor: '#f5c518',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  guestText: {
    color: '#f5c518',
    fontSize: 16,
  },
});
/**
 * ErrorBoundary.js
 * ════════════════════════════════════════════════════════════
 * يمسك أي خطأ JS غير متوقع في أي شاشة
 * بدله: شاشة بيضاء ميتة
 * معاه: رسالة واضحة + زر إعادة المحاولة
 *
 * الاستخدام في App.js:
 *   import ErrorBoundary from './ErrorBoundary';
 *   <ErrorBoundary>
 *     <MainApp />
 *   </ErrorBoundary>
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // في production يمكن إرسالها لـ Crashlytics/Sentry هنا
    console.warn('[ErrorBoundary]', error?.message, info?.componentStack?.slice(0, 200));
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#07071f" />
        <Text style={styles.emoji}>⚡</Text>
        <Text style={styles.title}>حدث خطأ غير متوقع</Text>
        <Text style={styles.subtitle}>
          {this.state.error?.message
            ? `${this.state.error.message.slice(0, 80)}...`
            : 'يرجى المحاولة مرة أخرى'}
        </Text>
        <TouchableOpacity style={styles.btn} onPress={this.handleReset} activeOpacity={0.8}>
          <Text style={styles.btnText}>إعادة المحاولة ↺</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#07071f',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  emoji:    { fontSize: 56 },
  title:    { fontSize: 22, fontWeight: '900', color: '#f0f0ff', textAlign: 'center' },
  subtitle: { fontSize: 13, color: '#6060a0', textAlign: 'center', lineHeight: 20 },
  btn: {
    marginTop: 8,
    backgroundColor: '#f5c518',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 16,
  },
  btnText: { fontSize: 16, fontWeight: '800', color: '#07071f' },
});

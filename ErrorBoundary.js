/**
 * ErrorBoundary.js
 * ════════════════════════════════════════════════════════════
 * يمسك أي خطأ JS غير متوقع في أي شاشة
 * بدله: شاشة بيضاء ميتة
 * معاه: رسالة كاملة + مكان الخطأ + زر إعادة المحاولة
 *
 * في DEV:  يعرض الرسالة + اسم الـ component + أول سطر من الـ stack
 * في PROD: يعرض الرسالة الكاملة فقط (بدون stack للمستخدم)
 */

import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, ScrollView,
} from 'react-native';

// ── مساعد: استخرج أول سطر مفيد من الـ stack ──
function parseStack(stack) {
  if (!stack) return null;
  const lines = stack.split('\n').filter(l => l.trim());
  // ابحث عن أول سطر يحتوي على اسم ملف (مو node_modules)
  const useful = lines.find(l =>
    l.includes('.js') &&
    !l.includes('node_modules') &&
    !l.includes('ErrorBoundary')
  );
  return useful?.trim() || lines[1]?.trim() || null;
}

// ── مساعد: استخرج اسم الـ component من componentStack ──
function parseComponent(componentStack) {
  if (!componentStack) return null;
  const match = componentStack.match(/^\s*in (\w+)/m);
  return match ? match[1] : null;
}

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // حفظ info للعرض
    this.setState({ info });
    // log كامل للـ console — مفيد جداً في dev
    console.error('[ErrorBoundary] ══════════════════');
    console.error('[ErrorBoundary] MESSAGE:', error?.message);
    console.error('[ErrorBoundary] STACK:\n',  error?.stack);
    console.error('[ErrorBoundary] COMPONENT TREE:\n', info?.componentStack);
    console.error('[ErrorBoundary] ══════════════════');
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, info: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const { error, info } = this.state;
    const message   = error?.message  || 'خطأ غير معروف';
    const component = parseComponent(info?.componentStack);
    const stackLine = parseStack(error?.stack);
    const isDev     = typeof __DEV__ !== 'undefined' && __DEV__;

    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#07071f" />

        <Text style={styles.emoji}>⚡</Text>
        <Text style={styles.title}>حدث خطأ غير متوقع</Text>

        {/* رسالة الخطأ — كاملة دائماً */}
        <View style={styles.msgBox}>
          <Text style={styles.msgText} selectable>
            {message}
          </Text>
        </View>

        {/* في DEV فقط: مكان الخطأ */}
        {isDev && (
          <ScrollView style={styles.devBox} contentContainerStyle={{ gap: 6 }}>
            {component && (
              <Text style={styles.devLabel}>
                📦 <Text style={styles.devValue}>{component}</Text>
              </Text>
            )}
            {stackLine && (
              <Text style={styles.devLabel} selectable>
                📍 <Text style={styles.devValue}>{stackLine}</Text>
              </Text>
            )}
            {info?.componentStack && (
              <Text style={styles.devStack} selectable>
                {info.componentStack.trim().slice(0, 400)}
              </Text>
            )}
          </ScrollView>
        )}

        <TouchableOpacity
          style={styles.btn}
          onPress={this.handleReset}
          activeOpacity={0.8}
        >
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
    padding: 28,
    gap: 14,
  },
  emoji: { fontSize: 52 },
  title: { fontSize: 20, fontWeight: '900', color: '#f0f0ff', textAlign: 'center' },

  // صندوق الرسالة — كاملة قابلة للنسخ
  msgBox: {
    backgroundColor: '#12122e',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a2a5a',
    padding: 14,
    width: '100%',
  },
  msgText: {
    fontSize: 13,
    color: '#e0b0ff',
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: 'monospace',
  },

  // قسم DEV فقط
  devBox: {
    maxHeight: 180,
    width: '100%',
    backgroundColor: '#0a0a20',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1a1a40',
    padding: 10,
  },
  devLabel: { fontSize: 11, color: '#8080c0', lineHeight: 18 },
  devValue: { color: '#60c0ff', fontWeight: '700' },
  devStack: { fontSize: 9, color: '#4040a0', lineHeight: 14, marginTop: 4 },

  // زر
  btn: {
    backgroundColor: '#f5c518',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 4,
  },
  btnText: { fontSize: 16, fontWeight: '800', color: '#07071f' },
});

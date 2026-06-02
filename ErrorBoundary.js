/**
 * ErrorBoundary.js
 * ════════════════════════════════════════════════════════════
 * DEV/Preview : رسالة كاملة + component tree + stack + قابل للنسخ
 * Production  : رسالة الخطأ فقط (بدون تفاصيل تقنية للمستخدم)
 */

import React from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, StatusBar, Platform,
} from 'react-native';

// ── استخرج أسطر stack مفيدة (بدون node_modules) ──
function parseStack(stack) {
  if (!stack) return [];
  return stack
    .split('\n')
    .map(l => l.trim())
    .filter(l =>
      l.length > 0 &&
      !l.includes('node_modules') &&
      !l.includes('ErrorBoundary') &&
      !l.startsWith('at Object') // Hermes internal
    )
    .slice(0, 6); // أول 6 أسطر مفيدة
}

// ── استخرج شجرة الـ components (أول 8 مستويات) ──
function parseComponentTree(componentStack) {
  if (!componentStack) return [];
  return componentStack
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.startsWith('in '))
    .map(l => l.replace('in ', '').trim())
    .slice(0, 8);
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
    this.setState({ info });
    // Log كامل — مهم لـ Metro console
    console.error('\n[ErrorBoundary] ══════════════════════════════');
    console.error('[ErrorBoundary] TYPE   :', error?.name);
    console.error('[ErrorBoundary] MESSAGE:', error?.message);
    console.error('[ErrorBoundary] STACK  :\n', error?.stack);
    console.error('[ErrorBoundary] TREE   :\n', info?.componentStack);
    console.error('[ErrorBoundary] ══════════════════════════════\n');
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, info: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const { error, info } = this.state;

    const errorName    = error?.name    || 'Error';
    const errorMessage = error?.message || 'خطأ غير معروف';
    const stackLines   = parseStack(error?.stack);
    const tree         = parseComponentTree(info?.componentStack);

    // DEV = preview build أو debug
    const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : false;

    return (
      <View style={s.root}>
        <StatusBar barStyle="light-content" backgroundColor="#07071f" />

        {/* ── Header ── */}
        <Text style={s.emoji}>⚡</Text>
        <Text style={s.title}>حدث خطأ غير متوقع</Text>

        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ── نوع الخطأ + الرسالة — دائماً ── */}
          <View style={s.block}>
            <Text style={s.blockLabel}>🔴  {errorName}</Text>
            <Text style={s.errorMsg} selectable>{errorMessage}</Text>
          </View>

          {/* ── Stack trace — في DEV فقط ── */}
          {isDev && stackLines.length > 0 && (
            <View style={s.block}>
              <Text style={s.blockLabel}>📍  Stack Trace</Text>
              {stackLines.map((line, i) => (
                <Text key={i} style={s.stackLine} selectable>
                  {line}
                </Text>
              ))}
            </View>
          )}

          {/* ── Component Tree — في DEV فقط ── */}
          {isDev && tree.length > 0 && (
            <View style={s.block}>
              <Text style={s.blockLabel}>📦  Component Tree</Text>
              {tree.map((comp, i) => (
                <Text key={i} style={s.treeItem} selectable>
                  {'  '.repeat(i)}
                  <Text style={s.treeArrow}>{i > 0 ? '↳ ' : ''}</Text>
                  <Text style={[s.treeComp, i === 0 && s.treeCompFirst]}>
                    {comp}
                  </Text>
                </Text>
              ))}
            </View>
          )}

          {/* ── تلميح DEV ── */}
          {isDev && (
            <Text style={s.hint}>
              💡 انسخ الرسالة أعلاه وأرسلها للمطور
            </Text>
          )}
        </ScrollView>

        {/* ── زر إعادة المحاولة ── */}
        <TouchableOpacity
          style={s.btn}
          onPress={this.handleReset}
          activeOpacity={0.8}
        >
          <Text style={s.btnText}>إعادة المحاولة ↺</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#07071f',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
    gap: 12,
  },

  emoji: { fontSize: 48 },
  title: {
    fontSize: 20, fontWeight: '900',
    color: '#f0f0ff', textAlign: 'center',
  },

  scroll: { width: '100%', maxHeight: 420 },
  scrollContent: { gap: 10, paddingBottom: 8 },

  // ── بلوك معلومات ──
  block: {
    backgroundColor: '#0d0d25',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e1e48',
    padding: 12,
    gap: 4,
  },
  blockLabel: {
    fontSize: 11, fontWeight: '800',
    color: '#6060a0', marginBottom: 4,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },

  // رسالة الخطأ
  errorMsg: {
    fontSize: 14, color: '#e0b0ff',
    lineHeight: 22, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },

  // stack trace
  stackLine: {
    fontSize: 10, color: '#5080c0',
    lineHeight: 16, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },

  // component tree
  treeItem: { fontSize: 11, lineHeight: 18 },
  treeArrow: { color: '#3040a0' },
  treeComp: { color: '#60c0ff', fontWeight: '600' },
  treeCompFirst: { color: '#ff6060', fontWeight: '900' }, // أول component = المسبب

  hint: {
    fontSize: 11,
    textAlign: 'center',
    color: '#404080',
    marginTop: 4,
  },

  // زر
  btn: {
    backgroundColor: '#f5c518',
    paddingHorizontal: 36,
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 4,
    width: '100%',
    alignItems: 'center',
  },
  btnText: { fontSize: 16, fontWeight: '900', color: '#07071f' },
});

/**
 * ErrorBoundary.js
 * ════════════════════════════════════════════════════════════
 *  يعرض الخطأ على الشاشة بدل الإغلاق الصامت — مهم جداً للأجهزة
 *  التي تُبنى عليها preview بلا logcat.
 *
 *  ✅ يعرض التفاصيل الكاملة دائماً (Stack + Tree + Message)
 *     — حتى في بناء preview/production (لا يعتمد على __DEV__).
 *  ✅ زر "نسخ التقرير" — ينسخ كل شيء كنص واحد جاهز للإرسال.
 *  ✅ يلتقط أخطاء JS العالمية (خارج render) عبر ErrorUtils
 *     — يكشف أخطاء لا يراها componentDidCatch.
 *  ✅ يعرض سياق الخطأ (المنصة / الوقت).
 *
 *  ملاحظة: هذا يلتقط أخطاء JavaScript فقط. الأخطاء native
 *  (مثل react-native-svg أو asset مفقود) تُغلق التطبيق على
 *  مستوى أعمق ولا يمكن لـ JS التقاطها.
 */

import React from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, StatusBar, Platform,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';

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
    .slice(0, 10); // أول 10 أسطر مفيدة
}

// ── استخرج شجرة الـ components ──
function parseComponentTree(componentStack) {
  if (!componentStack) return [];
  return componentStack
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.startsWith('in '))
    .map(l => l.replace('in ', '').trim())
    .slice(0, 12);
}

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      info: null,
      source: 'render', // 'render' | 'global'
      copied: false,
    };
    this._prevGlobalHandler = null;
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error, source: 'render' };
  }

  componentDidCatch(error, info) {
    this.setState({ info });
  }

  // ── التقاط أخطاء JS العالمية خارج شجرة render ──
  componentDidMount() {
    if (typeof global !== 'undefined' && global.ErrorUtils) {
      this._prevGlobalHandler = global.ErrorUtils.getGlobalHandler
        ? global.ErrorUtils.getGlobalHandler()
        : null;

      global.ErrorUtils.setGlobalHandler((error, isFatal) => {
        // اعرض الخطأ على الشاشة بدل الإغلاق
        try {
          this.setState({
            hasError: true,
            error,
            info: null,
            source: 'global',
            copied: false,
          });
        } catch (_) {}

        // استدعِ المعالج الأصلي (لتسجيل/سلوك افتراضي) لكن دون السماح بإغلاق فوري
        if (this._prevGlobalHandler && !isFatal) {
          try { this._prevGlobalHandler(error, isFatal); } catch (_) {}
        }
      });
    }
  }

  componentWillUnmount() {
    // أعد المعالج الأصلي
    if (
      typeof global !== 'undefined' &&
      global.ErrorUtils &&
      this._prevGlobalHandler
    ) {
      try { global.ErrorUtils.setGlobalHandler(this._prevGlobalHandler); } catch (_) {}
    }
  }

  // ── بناء نص التقرير الكامل ──
  buildReport = () => {
    const { error, info, source } = this.state;
    const lines = [];
    lines.push('═══ ARENA ERROR REPORT ═══');
    lines.push('SOURCE  : ' + (source === 'global' ? 'Global JS handler' : 'React render'));
    lines.push('PLATFORM: ' + Platform.OS + ' ' + Platform.Version);
    lines.push('TIME    : ' + new Date().toISOString());
    lines.push('TYPE    : ' + (error?.name || 'Error'));
    lines.push('MESSAGE : ' + (error?.message || 'unknown'));
    lines.push('');
    lines.push('── STACK ──');
    parseStack(error?.stack).forEach(l => lines.push(l));
    if (info?.componentStack) {
      lines.push('');
      lines.push('── COMPONENT TREE ──');
      parseComponentTree(info.componentStack).forEach((c, i) =>
        lines.push('  '.repeat(i) + (i > 0 ? '↳ ' : '') + c)
      );
    }
    lines.push('═══════════════════════════');
    return lines.join('\n');
  };

  handleCopy = async () => {
    try {
      await Clipboard.setStringAsync(this.buildReport());
      this.setState({ copied: true });
      setTimeout(() => {
        try { this.setState({ copied: false }); } catch (_) {}
      }, 2000);
    } catch (_) {}
  };

  handleReset = () => {
    this.setState({
      hasError: false, error: null, info: null,
      source: 'render', copied: false,
    });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const { error, info, source, copied } = this.state;

    const errorName    = error?.name    || 'Error';
    const errorMessage = error?.message || 'خطأ غير معروف';
    const stackLines   = parseStack(error?.stack);
    const tree         = parseComponentTree(info?.componentStack);

    return (
      <View style={s.root}>
        <StatusBar barStyle="light-content" backgroundColor="#07071f" />

        {/* ── Header ── */}
        <Text style={s.emoji}>⚡</Text>
        <Text style={s.title}>حدث خطأ غير متوقع</Text>
        <Text style={s.sourceTag}>
          {source === 'global' ? 'مصدر: خطأ JS عام' : 'مصدر: عرض React'}
          {'  ·  '}
          {Platform.OS} {String(Platform.Version)}
        </Text>

        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ── نوع الخطأ + الرسالة ── */}
          <View style={s.block}>
            <Text style={s.blockLabel}>🔴  {errorName}</Text>
            <Text style={s.errorMsg} selectable>{errorMessage}</Text>
          </View>

          {/* ── Stack trace — دائماً ── */}
          {stackLines.length > 0 && (
            <View style={s.block}>
              <Text style={s.blockLabel}>📍  Stack Trace</Text>
              {stackLines.map((line, i) => (
                <Text key={i} style={s.stackLine} selectable>
                  {line}
                </Text>
              ))}
            </View>
          )}

          {/* ── Component Tree — دائماً ── */}
          {tree.length > 0 && (
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

          <Text style={s.hint}>
            💡 اضغط "نسخ التقرير" ثم ألصقه وأرسله
          </Text>
        </ScrollView>

        {/* ── الأزرار ── */}
        <View style={s.btnRow}>
          <TouchableOpacity
            style={[s.btn, s.btnCopy]}
            onPress={this.handleCopy}
            activeOpacity={0.8}
          >
            <Text style={s.btnCopyText}>
              {copied ? 'تم النسخ ✓' : 'نسخ التقرير ⧉'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.btn, s.btnRetry]}
            onPress={this.handleReset}
            activeOpacity={0.8}
          >
            <Text style={s.btnRetryText}>إعادة المحاولة ↺</Text>
          </TouchableOpacity>
        </View>
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
    gap: 10,
  },

  emoji: { fontSize: 48 },
  title: {
    fontSize: 20, fontWeight: '900',
    color: '#f0f0ff', textAlign: 'center',
  },
  sourceTag: {
    fontSize: 11, color: '#6060a0',
    textAlign: 'center', fontWeight: '700',
  },

  scroll: { width: '100%', maxHeight: 400 },
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

  // ── الأزرار ──
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginTop: 4,
  },
  btn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnCopy: {
    backgroundColor: '#1e1e48',
    borderWidth: 1,
    borderColor: '#3040a0',
  },
  btnCopyText: { fontSize: 15, fontWeight: '800', color: '#a0c0ff' },

  btnRetry: { backgroundColor: '#f5c518' },
  btnRetryText: { fontSize: 15, fontWeight: '900', color: '#07071f' },
});

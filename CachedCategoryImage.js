/**
 * CachedCategoryImage.js
 * ════════════════════════════════════════════════════════════
 * مكوّن موحّد لعرض صورة غلاف الفئة مع:
 *  - disk + memory cache تلقائي (expo-image)
 *  - fallback للـ emoji إذا لم تكن هناك صورة
 *  - placeholder أثناء التحميل
 *
 * الاستخدام:
 *  <CachedCategoryImage
 *    imageUrl={cat.imageUrl}
 *    emoji={cat.emoji}
 *    size={64}
 *    style={...}
 *  />
 */

import { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image as ExpoImage } from 'expo-image';

// blurhash بسيط كـ placeholder أثناء تحميل الصورة
const BLURHASH = 'L6Pj0^jE.AyE_3t7t7R**0o#DgR4';

const CachedCategoryImage = memo(function CachedCategoryImage({
  imageUrl,
  emoji = '📁',
  size  = 64,
  style,
}) {
  if (imageUrl) {
    return (
      <ExpoImage
        source={{ uri: imageUrl }}
        style={[{ width: size, height: size, borderRadius: size * 0.18 }, style]}
        placeholder={BLURHASH}
        contentFit="cover"
        transition={200}
        cachePolicy="disk"   // يحفظ على الـ disk — يبقى بين جلسات التطبيق
      />
    );
  }

  // Fallback: emoji في مربع ملوّن
  return (
    <View style={[
      styles.emojiFallback,
      { width: size, height: size, borderRadius: size * 0.18 },
      style,
    ]}>
      <Text style={{ fontSize: size * 0.52 }}>{emoji}</Text>
    </View>
  );
});

export default CachedCategoryImage;

const styles = StyleSheet.create({
  emojiFallback: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems:      'center',
    justifyContent:  'center',
  },
});

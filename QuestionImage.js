/**
 * QuestionImage.js — مكوّن موحّد لعرض صورة السؤال
 * ════════════════════════════════════════════════════════════
 *  يُستخدم في: QuestionScreen (كلاسيك) · SoloGameScreen · OnlineGameScreen
 *
 *  • يعرض الصورة في إطار أنيق بحجم بارز (مناسب لأسئلة الشعارات/الصور)
 *  • مؤشّر تحميل أثناء الجلب
 *  • رسالة احتياطية عند فشل التحميل
 *  • disk cache عبر expo-image — تعمل أوفلاين بعد أول تحميل
 *  • onError إجباري (متطلّب على كل Image بمصدر uri)
 */

import { memo, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Image as ExpoImage } from 'expo-image';

const QuestionImage = memo(function QuestionImage({ imageUrl, theme, height = 200 }) {
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);

  if (!imageUrl) return null;

  return (
    <View style={[
      styles.wrapper,
      { height, backgroundColor: theme.bgCard, borderColor: theme.borderCard },
    ]}>
      {loading && !error && (
        <ActivityIndicator
          style={StyleSheet.absoluteFill}
          color={theme.accent}
          size="large"
        />
      )}
      {error ? (
        <Text style={[styles.errorText, { color: theme.textMuted }]}>📷 تعذّر تحميل الصورة</Text>
      ) : (
        <ExpoImage
          source={{ uri: imageUrl }}
          style={styles.image}
          contentFit="contain"
          cachePolicy="disk"
          transition={200}
          onLoad={() => setLoading(false)}
          onError={() => { setLoading(false); setError(true); }}
        />
      )}
    </View>
  );
});

export default QuestionImage;

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
  },
});

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function App() {
  return (
    <View style={s.root}>
      <Text style={s.text}>✅ يعمل</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex:1, backgroundColor:'#07071f', alignItems:'center', justifyContent:'center' },
  text: { fontSize:32, color:'#f5c518', fontWeight:'900' },
});

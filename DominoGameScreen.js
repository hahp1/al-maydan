/**
 * DominoGameScreen.js
 * ════════════════════════════════════════════════
 *  ✅ شاشة اختيار: عشوائي | إنشاء بكود | انضمام بكود
 *  ✅ عشوائي: بوتات بعد 45 ثانية إذا لم يكتمل 4 لاعبين
 *  ✅ صديق: كود 6 أحرف قابل للنسخ والمشاركة
 *  ✅ Firebase Firestore — مزامنة لحظية للحركات
 *  ✅ اللوجيك المحلي (tiles, board, bot) محفوظ كما هو
 *  ✅ 4 لاعبين: أنت (seat 0) + 3 آخرون أو بوتات
 *
 *  Firestore: domino_rooms/{roomId}
 *  {
 *    status: 'lobby' | 'playing' | 'finished'
 *    mode:   'random' | 'friend'
 *    friendCode: string (friend mode only)
 *    players: [{ uid, name, seat, isBot }]  — ترتيب ثابت بعد البدء
 *    hands:   [[tile,…], [tile,…], [tile,…], [tile,…]]  — كل لاعب يرى يده فقط
 *    board:   [[a,b], …]
 *    current: 0-3  (seat index)
 *    scores:  { red: N, blue: N }
 *    round:   N
 *    passBits: [bool,bool,bool,bool]
 *    lastMove: { seat, tileIdx, toRight } | null
 *    roundOver: bool
 *    gameOver:  bool
 *    hostUid: string
 *    createdAt, lastUpdate
 *  }
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar,
  Dimensions, PanResponder, Animated, Platform, Share,
  Alert, ActivityIndicator, TextInput, ScrollView,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { db } from './firebaseConfig';
import {
  doc, setDoc, updateDoc, onSnapshot, getDoc,
  collection, query, where, getDocs, limit,
} from 'firebase/firestore';
import { useTheme } from './ThemeContext';
import ExitButton from './ExitButton';
import { useLanguage } from './I18n';
import { WebScreenButton, GameInfoButton } from './WebRoomService';
import { playSound } from './SoundService';
import { ThemedButton, ThemedCard } from './ThemedComponents';
import CrystalTable from './CrystalTable';

const { width: SW, height: SH } = Dimensions.get('window');

/* ═══════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════ */
const TILE_W   = 28;
const TILE_H   = 16;
const DTILE_W  = 16;
const DTILE_H  = 28;
const TILE_GAP = 1;
const BOARD_MARGIN_H = 62;
const HAND_TILE_W = 44;
const HAND_TILE_H = 76;
const TURN_DURATION = 25;
const BOT_WAIT_MS   = 45000; // 45 ثانية

const PIPS = {
  0: [],
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

const BOT_NAMES  = ['ساره 🤖', 'فيصل 🤖', 'علي 🤖'];
const BOT_EMOJIS = ['🤖', '🤖', '🤖'];
const BOT_BG     = ['#7f8c8d', '#7f8c8d', '#7f8c8d'];

/* ═══════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════ */
function buildDeck() {
  const d = [];
  for (let a = 0; a <= 6; a++) for (let b = a; b <= 6; b++) d.push([a, b]);
  return d;
}
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function sumHand(hand) { return hand.reduce((s, t) => s + t[0] + t[1], 0); }
function boardEnds(board) {
  if (!board.length) return { left: -1, right: -1 };
  return { left: board[0][0], right: board[board.length - 1][1] };
}
function canPlayTile(tile, board) {
  if (!board.length) return true;
  const { left, right } = boardEnds(board);
  return tile[0] === left || tile[1] === left || tile[0] === right || tile[1] === right;
}
function placeTileOnBoard(board, tile, toRight) {
  const newBoard = [...board];
  const { left, right } = boardEnds(board);
  const tp = [...tile];
  if (!board.length) { newBoard.push(tp); }
  else if (toRight) {
    if      (tp[0] === right) newBoard.push(tp);
    else if (tp[1] === right) newBoard.push([tp[1], tp[0]]);
    else if (tp[0] === left)  newBoard.unshift([tp[1], tp[0]]);
    else                      newBoard.unshift(tp);
  } else {
    if      (tp[1] === left)  newBoard.unshift(tp);
    else if (tp[0] === left)  newBoard.unshift([tp[1], tp[0]]);
    else if (tp[1] === right) newBoard.push([tp[1], tp[0]]);
    else                      newBoard.push(tp);
  }
  return newBoard;
}
function bestPlayableTile(hand, board) {
  const { left, right } = boardEnds(board);
  let best = null, bestSum = -1;
  hand.forEach((t, i) => {
    if (!canPlayTile(t, board)) return;
    const s = t[0] + t[1];
    if (s > bestSum) {
      bestSum = s;
      best = { idx: i, toRight: (t[0] === right || t[1] === right) };
    }
  });
  return best;
}
function genCode() { return Math.random().toString(36).substring(2, 8).toUpperCase(); }

/* ═══════════════════════════════════════════════
   PIP GRID
═══════════════════════════════════════════════ */
function PipGrid({ value, isDouble, size = 'board' }) {
  const positions = PIPS[value] || [];
  const dotPct = size === 'hand' ? '55%' : '52%';
  const padPct = size === 'hand' ? '8%'  : '10%';
  return (
    <View style={{ flex: 1, padding: padPct }}>
      <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap' }}>
        {Array.from({ length: 9 }).map((_, i) => (
          <View key={i} style={{ width: '33.33%', height: '33.33%', alignItems: 'center', justifyContent: 'center' }}>
            {positions.includes(i) && (
              <View style={{ width: dotPct, aspectRatio: 1, borderRadius: 999,
                backgroundColor: isDouble ? '#a82020' : '#1c1c2e' }} />
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

/* ═══════════════════════════════════════════════
   BOARD TILE
═══════════════════════════════════════════════ */
function BoardTile({ a, b, style }) {
  const isDouble = a === b;
  return (
    <View style={[{ backgroundColor: '#f9f5ed', borderRadius: 3, borderWidth: 1.2, borderColor: '#c4aa80',
      overflow: 'hidden', flexDirection: isDouble ? 'column' : 'row',
      shadowColor: '#000', shadowOffset: { width: 1, height: 2 }, shadowOpacity: 0.32, shadowRadius: 2, elevation: 3,
    }, style]}>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '50%',
        backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 3 }} pointerEvents="none" />
      <PipGrid value={a} isDouble={isDouble} size="board" />
      <View style={isDouble
        ? { height: 1.2, backgroundColor: 'rgba(0,0,0,0.14)', marginHorizontal: '10%' }
        : { width:  1.2, backgroundColor: 'rgba(0,0,0,0.14)', marginVertical: '10%' }} />
      <PipGrid value={b} isDouble={isDouble} size="board" />
    </View>
  );
}

/* ═══════════════════════════════════════════════
   HAND TILE
═══════════════════════════════════════════════ */
function HandTile({ a, b, selected, unplayable }) {
  const isDouble = a === b;
  return (
    <View style={{
      width: HAND_TILE_W, height: HAND_TILE_H,
      backgroundColor: '#f9f5ed', borderRadius: 7,
      borderWidth: selected ? 2 : 1.5,
      borderColor: selected ? '#f5c842' : '#c4aa80',
      overflow: 'hidden', flexDirection: 'column',
      opacity: unplayable ? 0.35 : 1,
      shadowColor: selected ? '#f5c842' : '#000',
      shadowOffset: { width: 0, height: selected ? 4 : 2 },
      shadowOpacity: selected ? 0.5 : 0.3, shadowRadius: selected ? 8 : 3,
      elevation: selected ? 8 : 3,
      transform: [{ translateY: selected ? -10 : 0 }],
    }}>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '50%',
        backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 6 }} pointerEvents="none" />
      <PipGrid value={a} isDouble={isDouble} size="hand" />
      <View style={{ height: 1.5, backgroundColor: '#c4aa80', marginHorizontal: 4 }} />
      <PipGrid value={b} isDouble={isDouble} size="hand" />
    </View>
  );
}

/* ═══════════════════════════════════════════════
   FACE DOWN STACK
═══════════════════════════════════════════════ */
function FaceDownStack({ count, direction }) {
  const n = Math.min(count, 5);
  return (
    <View style={{ flexDirection: direction === 'horizontal' ? 'row' : 'column', gap: 2, alignItems: 'center' }}>
      {Array.from({ length: n }).map((_, i) => (
        <View key={i} style={{
          width: direction === 'horizontal' ? HAND_TILE_W * 0.6 : HAND_TILE_H * 0.4,
          height: direction === 'horizontal' ? HAND_TILE_H * 0.6 : HAND_TILE_W * 0.6,
          backgroundColor: '#2c3e50', borderRadius: 4,
          borderWidth: 1, borderColor: '#7f8c8d',
        }} />
      ))}
      {count > 5 && (
        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, marginLeft: 2 }}>+{count - 5}</Text>
      )}
    </View>
  );
}

/* ═══════════════════════════════════════════════
   PLAYER LABEL
═══════════════════════════════════════════════ */
function PlayerLabel({ name, emoji, bg, isActive, timerPct, showTimer, side }) {
  const isLeft  = side === 'left';
  const isRight = side === 'right';
  return (
    <View style={{ alignItems: isRight ? 'flex-end' : isLeft ? 'flex-start' : 'center', gap: 4 }}>
      <View style={{ flexDirection: isLeft ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
        <View style={[styles.avatar, {
          backgroundColor: bg || '#555',
          borderColor: isActive ? '#f5c842' : 'rgba(255,255,255,0.15)',
          borderWidth: isActive ? 2.5 : 2,
          shadowColor: isActive ? '#f5c842' : '#000',
          shadowOpacity: isActive ? 0.5 : 0.2, shadowRadius: isActive ? 8 : 3, elevation: isActive ? 6 : 2,
        }]}>
          <Text style={{ fontSize: 16 }}>{emoji || '🎮'}</Text>
        </View>
        <View style={[styles.nameTag, isActive && styles.nameTagActive]}>
          <Text style={[styles.nameText, side === 'bottom' && styles.nameTextMe]} numberOfLines={1}>{name}</Text>
        </View>
      </View>
      {showTimer && (
        <View style={[styles.timerBar, { alignSelf: side === 'bottom' ? 'center' : undefined }]}>
          <View style={[styles.timerFill, {
            width: `${timerPct}%`,
            backgroundColor: timerPct > 50 ? '#2ecc71' : timerPct > 22 ? '#f39c12' : '#e74c3c',
          }]} />
        </View>
      )}
    </View>
  );
}

/* ═══════════════════════════════════════════════
   PASS BUBBLE
═══════════════════════════════════════════════ */
function PassBubble({ visible, style }) {
  if (!visible) return null;
  return (
    <View style={[{ backgroundColor: 'rgba(231,76,60,0.9)', paddingHorizontal: 12, paddingVertical: 4,
      borderRadius: 10, position: 'absolute' }, style]}>
      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12, letterSpacing: 1 }}>PASS</Text>
    </View>
  );
}

/* ═══════════════════════════════════════════════
   RESULT SCREEN
═══════════════════════════════════════════════ */
function ResultScreen({ scores, playerNames, visible, onNewGame, onExit }) {
  if (!visible) return null;
  const redWon = scores.red >= 151;
  return (
    <View style={styles.resultOverlay}>
      <Text style={{ fontSize: 52 }}>🏆</Text>
      <Text style={styles.resultTitle}>
        {redWon ? `فاز ${playerNames[0]} & ${playerNames[1]}!` : `فاز ${playerNames[2]} & ${playerNames[3]}!`}
      </Text>
      <View style={{ flexDirection: 'row', gap: 14 }}>
        {[
          { label: `${playerNames[0]} & ${playerNames[1]}`, pts: scores.red,  won: redWon  },
          { label: `${playerNames[2]} & ${playerNames[3]}`, pts: scores.blue, won: !redWon },
        ].map((team, i) => (
          <View key={i} style={[styles.resultCard, team.won && styles.resultCardWin]}>
            {team.won && <View style={styles.winBadge}><Text style={{ fontSize: 9, fontWeight: '900', color: '#1a1a1a' }}>🏆 الفائز</Text></View>}
            <Text style={{ fontSize: 10, color: team.won ? 'rgba(245,200,66,0.85)' : 'rgba(255,255,255,0.55)', marginBottom: 3 }}>{team.label}</Text>
            <Text style={{ fontSize: 30, fontWeight: '900', color: team.won ? '#f5c842' : '#fff' }}>
              {team.pts}<Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: '400' }}> نقطة</Text>
            </Text>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
        <TouchableOpacity onPress={onExit}    style={styles.resBtnSec}><Text style={{ color: 'rgba(255,255,255,0.8)', fontWeight: '700' }}>🚪 خروج</Text></TouchableOpacity>
        <TouchableOpacity onPress={onNewGame} style={styles.resBtnPri}><Text style={{ color: '#1a1a1a', fontWeight: '900' }}>▶ جولة جديدة</Text></TouchableOpacity>
      </View>
    </View>
  );
}

/* ═══════════════════════════════════════════════
   BOARD LAYOUT
═══════════════════════════════════════════════ */
function computeBoardLayout(board, areaW, areaH) {
  if (!board.length) return [];
  const minX = BOARD_MARGIN_H, maxX = areaW - BOARD_MARGIN_H;
  const centerY = Math.floor(areaH * 0.42), rowStep = DTILE_H + 8;
  const positions = [];
  let x = minX, y = centerY, dir = 1, row = 0;
  let rowW = 0;
  const firstRowTiles = [];
  for (let i = 0; i < board.length; i++) {
    const tw = board[i][0] === board[i][1] ? DTILE_W : TILE_W;
    if (rowW + tw + TILE_GAP > maxX - minX) break;
    firstRowTiles.push(i); rowW += tw + TILE_GAP;
  }
  if (firstRowTiles.length === board.length) x = minX + Math.floor((maxX - minX - rowW) / 2);
  for (let i = 0; i < board.length; i++) {
    const t = board[i], isD = t[0] === t[1];
    const tw = isD ? DTILE_W : TILE_W, th = isD ? DTILE_H : TILE_H;
    if (dir === 1 && x + tw > maxX)  { row++; y = centerY + row * rowStep; dir = -1; x = maxX - tw; }
    else if (dir === -1 && x < minX) { row++; y = centerY + row * rowStep; dir =  1; x = minX; }
    positions.push({ x, y: y - Math.floor(th / 2), w: tw, h: th, a: t[0], b: t[1], isDouble: isD });
    x += dir * (tw + TILE_GAP);
  }
  return positions;
}

/* ═══════════════════════════════════════════════
   LOBBY SCREEN
═══════════════════════════════════════════════ */
function LobbyScreen({ theme, players, friendCode, isHost, isFriend, isRTL, onBack, onStart, canStart }) {
  const handleCopy = () => { Clipboard.setStringAsync(friendCode); Alert.alert('✓ تم النسخ', friendCode); };
  const handleShare = async () => {
    try { await Share.share({ message: `انضم إليّ في لعبة الدومينو على Arena!\nكود الغرفة: ${friendCode}` }); } catch (_) {}
  };

  return (
    <View style={[styles.container, { backgroundColor: 'transparent' }]}>
      <StatusBar barStyle={theme.statusBar} />
      <ExitButton onPress={onBack} />

      <ScrollView contentContainerStyle={{ paddingTop: 60, paddingHorizontal: 24, gap: 16, paddingBottom: 40 }}>
        <View style={{ alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 48 }}>🁣</Text>
          <Text style={{ color: theme.textPrimary, fontSize: 22, fontWeight: '900' }}>صالة الانتظار</Text>
          <Text style={{ color: theme.textSecondary, fontSize: 13 }}>دومينو — 4 لاعبين فريقان</Text>
        </View>

        {/* كود الغرفة */}
        {isFriend && friendCode && (
          <View style={{ gap: 10 }}>
            <Text style={{ color: theme.textSecondary, fontSize: 13, textAlign: 'center' }}>كود الغرفة</Text>
            <TouchableOpacity onPress={handleCopy} style={[styles.codeBox, { borderColor: theme.accentBorder || '#f5c84260' }]}>
              <Text style={{ fontSize: 32, fontWeight: '900', letterSpacing: 6, color: theme.accent || '#f5c842' }}>{friendCode}</Text>
              <Text style={{ color: theme.textMuted, fontSize: 12 }}>📋 اضغط للنسخ</Text>
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <ThemedButton onPress={handleCopy}  label="📋 نسخ"    variant="secondary" size="small" style={{ flex: 1 }} />
              <ThemedButton onPress={handleShare} label="📤 مشاركة" variant="primary"   size="small" style={{ flex: 1 }} />
            </View>
          </View>
        )}

        {/* قائمة اللاعبين */}
        <View style={[styles.playerListCard, { backgroundColor: theme.bgCard || 'rgba(255,255,255,0.06)', borderColor: theme.border || 'rgba(255,255,255,0.1)' }]}>
          <Text style={{ color: theme.textSecondary, fontSize: 13, fontWeight: '700', marginBottom: 10 }}>
            اللاعبون ({players.length} / 4)
          </Text>
          {[0, 1, 2, 3].map(seat => {
            const p = players.find(p => p.seat === seat);
            const teams = ['🔴 فريق أحمر', '🔴 فريق أحمر', '🔵 فريق أزرق', '🔵 فريق أزرق'];
            return (
              <View key={seat} style={[styles.lobbyPlayerRow, { borderBottomColor: theme.divider || 'rgba(255,255,255,0.07)' }]}>
                <View style={[styles.lobbyAvatar, { backgroundColor: theme.bgElevated || 'rgba(255,255,255,0.08)' }]}>
                  <Text style={{ fontSize: 16 }}>{p ? (p.isBot ? '🤖' : '👤') : '⏳'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: p ? theme.textPrimary : theme.textMuted, fontWeight: p ? '700' : '400' }}>
                    {p ? p.name : 'في انتظار لاعب...'}
                  </Text>
                  <Text style={{ color: theme.textMuted, fontSize: 11 }}>{teams[seat]}</Text>
                </View>
                {p && p.isHost && (
                  <View style={[styles.crownBadge]}><Text style={{ fontSize: 10, color: '#f5c842', fontWeight: '700' }}>👑 منشئ</Text></View>
                )}
              </View>
            );
          })}
        </View>

        {/* زر البدء */}
        {isHost && (
          <ThemedButton
            onPress={onStart}
            disabled={!canStart}
            variant={canStart ? 'primary' : 'secondary'}
            size="large"
            label={canStart ? 'بدء اللعبة ▶' : `في انتظار لاعبين... (${players.length}/4)`}
          />
        )}
        {!isHost && (
          <Text style={{ color: theme.textMuted, textAlign: 'center', fontSize: 13 }}>
            في انتظار المنشئ لبدء اللعبة...
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

/* ═══════════════════════════════════════════════
   MODE SELECT SCREEN
═══════════════════════════════════════════════ */
function ModeSelectScreen({ theme, isRTL, onBack, onSelect, joinCode, setJoinCode, joinErr }) {
  return (
    <View style={[styles.container, { backgroundColor: 'transparent', paddingTop: 56 }]}>
      <StatusBar barStyle={theme.statusBar} />
      <ExitButton onPress={onBack} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, gap: 14, paddingBottom: 40 }}>
        <View style={{ alignItems: 'center', paddingVertical: 12, gap: 6 }}>
          <Text style={{ fontSize: 48 }}>🁣</Text>
          <Text style={{ color: theme.textPrimary, fontSize: 22, fontWeight: '900' }}>دومينو</Text>
          <Text style={{ color: theme.textSecondary, fontSize: 13 }}>4 لاعبين — فريقان — حتى 151 نقطة</Text>
        </View>

        {/* عشوائي */}
        <ThemedCard onPress={() => onSelect('random')} radius={18} padding={18} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={[styles.optIcon, { backgroundColor: 'rgba(245,200,66,0.15)' }]}><Text style={{ fontSize: 24 }}>🌐</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.textPrimary, fontSize: 15, fontWeight: '800' }}>لعب عشوائي</Text>
            <Text style={{ color: theme.textSecondary, fontSize: 12 }}>ابحث عن منافسين — بوتات بعد 45 ثانية</Text>
          </View>
          <Text style={{ color: theme.textMuted, fontSize: 18, fontWeight: '700' }}>←</Text>
        </ThemedCard>

        {/* إنشاء بكود */}
        <ThemedCard onPress={() => onSelect('create')} radius={18} padding={18} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={[styles.optIcon, { backgroundColor: 'rgba(16,185,129,0.15)' }]}><Text style={{ fontSize: 24 }}>🔗</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.textPrimary, fontSize: 15, fontWeight: '800' }}>إنشاء غرفة مع أصدقاء</Text>
            <Text style={{ color: theme.textSecondary, fontSize: 12 }}>احصل على كود وشاركه مع أصدقائك</Text>
          </View>
          <Text style={{ color: theme.textMuted, fontSize: 18, fontWeight: '700' }}>←</Text>
        </ThemedCard>

        {/* انضمام بكود */}
        <ThemedCard radius={18} padding={18} style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View style={[styles.optIcon, { backgroundColor: 'rgba(245,158,11,0.15)' }]}><Text style={{ fontSize: 24 }}>🔑</Text></View>
            <Text style={{ color: theme.textPrimary, fontSize: 15, fontWeight: '800' }}>انضم بكود</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput
              style={[styles.codeInput, {
                backgroundColor: theme.bgInput || theme.bgElevated,
                color: theme.textPrimary,
                borderColor: joinErr ? '#ef4444' : theme.border,
                flex: 1,
              }]}
              placeholder="أدخل الكود..."
              placeholderTextColor={theme.textMuted}
              value={joinCode}
              onChangeText={t => setJoinCode(t.toUpperCase())}
              maxLength={8}
              autoCapitalize="characters"
              textAlign="center"
              returnKeyType="go"
              onSubmitEditing={() => joinCode.trim().length >= 4 && onSelect('join', joinCode.trim())}
            />
            <ThemedButton
              onPress={() => joinCode.trim().length >= 4 && onSelect('join', joinCode.trim())}
              label="انضم"
              variant="primary"
              size="small"
            />
          </View>
          {!!joinErr && <Text style={{ color: '#ef4444', fontSize: 12, textAlign: 'right' }}>{joinErr}</Text>}
        </ThemedCard>
      </ScrollView>
    </View>
  );
}

/* ═══════════════════════════════════════════════
   MAIN SCREEN
═══════════════════════════════════════════════ */
export default function DominoGameScreen({ onBack, currentUser, onGameEnd, onGameReady }) {
  const { theme, themeId } = useTheme();
  const { lang } = useLanguage();
  const isRTL = lang === 'ar';

  const myUid  = currentUser?.uid  || `guest_${Math.random().toString(36).slice(2, 10)}`;
  const myName = currentUser?.name || 'لاعب';

  // ── Phase ──
  const [appScreen, setAppScreen] = useState('modeSelect'); // modeSelect | lobby | game
  const [gameMode,  setGameMode]  = useState(null);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [joinErr,       setJoinErr]       = useState('');

  // ── Firebase ──
  const [roomId,    setRoomId]    = useState(null);
  const [roomData,  setRoomData]  = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [fbError,   setFbError]   = useState(null);
  const [friendCode, setFriendCode] = useState(null);
  const [isHost,    setIsHost]    = useState(false);
  const [mySeat,    setMySeat]    = useState(0);

  const unsubRef      = useRef(null);
  const botTimerRef   = useRef(null);
  const roomIdRef     = useRef(null);
  const gameReadyRef  = useRef(false);

  // ── Game state (mirrors Firestore) ──
  const [hands,      setHands]      = useState([[], [], [], []]);
  const [board,      setBoard]      = useState([]);
  const [current,    setCurrent]    = useState(0);
  const [scores,     setScores]     = useState({ red: 0, blue: 0 });
  const [roundNum,   setRoundNum]   = useState(1);
  const [gameOver,   setGameOver]   = useState(false);
  const [roundOver,  setRoundOver]  = useState(false);
  const [passBubble, setPassBubble] = useState([false, false, false, false]);

  // ── UI ──
  const [selectedIdx,  setSelectedIdx]  = useState(null);
  const [dragging,     setDragging]     = useState(false);
  const [dragPos,      setDragPos]      = useState({ x: 0, y: 0 });
  const [dragTileIdx,  setDragTileIdx]  = useState(null);
  const [timerPct,     setTimerPct]     = useState(100);
  const [boardArea,    setBoardArea]    = useState({ x: 0, y: 0, width: SW, height: 400 });

  const timerRef        = useRef(null);
  const timerPctRef     = useRef(100);
  const currentRef      = useRef(0);
  const handsRef        = useRef([[], [], [], []]);
  const boardRef        = useRef([]);
  const roundOverRef    = useRef(false);
  const gameOverRef     = useRef(false);
  const boardAreaRef    = useRef({ x: 0, y: 0, width: SW, height: 400 });
  const dragTileIdxRef  = useRef(null);
  const mySeatRef       = useRef(0);

  // ── Player info (resolved after room data) ──
  const [playerInfo, setPlayerInfo] = useState([
    { name: myName,  emoji: '😎', bg: '#fa709a', team: 'red'  },
    { name: 'ساره',  emoji: '👩',  bg: '#f093fb', team: 'red'  },
    { name: 'فيصل', emoji: '👨',  bg: '#43e97b', team: 'blue' },
    { name: 'علي',  emoji: '🧔',  bg: '#4facfe', team: 'blue' },
  ]);

  const teamBg = ['#fa709a', '#f093fb', '#43e97b', '#4facfe'];

  // ── Cleanup ──
  useEffect(() => () => {
    unsubRef.current?.();
    clearTimeout(botTimerRef.current);
    clearInterval(timerRef.current);
  }, []);

  // ── Sync refs ──
  useEffect(() => { currentRef.current  = current;  }, [current]);
  useEffect(() => { handsRef.current    = hands;    }, [hands]);
  useEffect(() => { boardRef.current    = board;    }, [board]);
  useEffect(() => { roundOverRef.current = roundOver; }, [roundOver]);
  useEffect(() => { gameOverRef.current  = gameOver;  }, [gameOver]);
  useEffect(() => { dragTileIdxRef.current = dragTileIdx; }, [dragTileIdx]);
  useEffect(() => { mySeatRef.current = mySeat; }, [mySeat]);

  // ══════════════════════════════════════════════
  //  Firebase helpers
  // ══════════════════════════════════════════════
  const listenRoom = useCallback((rId) => {
    unsubRef.current?.();
    unsubRef.current = onSnapshot(doc(db, 'domino_rooms', rId), snap => {
      if (!snap.exists()) return;
      setRoomData(snap.data());
    });
  }, []);

  const fbUpdate = useCallback(async (updates) => {
    const rId = roomIdRef.current;
    if (!rId) return;
    await updateDoc(doc(db, 'domino_rooms', rId), { ...updates, lastUpdate: Date.now() }).catch(console.error);
  }, []);

  // ── Sync roomData → local game state ──
  useEffect(() => {
    if (!roomData) return;
    const ms = mySeatRef.current;

    if (roomData.status === 'playing' && appScreen !== 'game') {
      setAppScreen('game');
      if (!gameReadyRef.current) { gameReadyRef.current = true; onGameReady?.(); }
    }

    if (roomData.hands) {
      setHands(roomData.hands);
      handsRef.current = roomData.hands;
    }
    if (roomData.board !== undefined) {
      setBoard(roomData.board);
      boardRef.current = roomData.board;
    }
    if (roomData.current !== undefined) {
      setCurrent(roomData.current);
      currentRef.current = roomData.current;
    }
    if (roomData.scores)   setScores(roomData.scores);
    if (roomData.round)    setRoundNum(roomData.round);
    if (roomData.roundOver !== undefined) { setRoundOver(roomData.roundOver); roundOverRef.current = roomData.roundOver; }
    if (roomData.gameOver  !== undefined) { setGameOver(roomData.gameOver);   gameOverRef.current  = roomData.gameOver; }
    if (roomData.passBits) {
      setPassBubble(roomData.passBits);
      setTimeout(() => setPassBubble([false,false,false,false]), 1800);
    }

    // Update playerInfo from room players
    if (roomData.players) {
      const pArr = [...roomData.players];
      // rotate so mySeat is index 0 for display (seat 0 = bottom)
      const rotated = pArr.map((_, i) => pArr[(i + ms) % 4]);
      setPlayerInfo(rotated.map((p, i) => ({
        name:  p ? p.name  : '?',
        emoji: p ? (p.isBot ? '🤖' : '👤') : '⏳',
        bg:    teamBg[i],
        team:  i < 2 ? 'red' : 'blue',
      })));
    }

    // Schedule bot moves if I am host
    if (roomData.status === 'playing' && roomData.isHost === myUid) {
      const cur = roomData.current;
      const players = roomData.players || [];
      const curPlayer = players[cur];
      if (curPlayer?.isBot) {
        const delay = 800 + Math.random() * 1000;
        setTimeout(() => botMove(cur, roomData.hands[cur], roomData.board), delay);
      }
    }

    // Timer for my turn
    if (roomData.status === 'playing') {
      const ms2 = mySeatRef.current;
      if (roomData.current === ms2 && !roomData.roundOver && !roomData.gameOver) {
        startTimer(100);
      } else {
        clearInterval(timerRef.current);
        setTimerPct(100);
      }
    }
  }, [roomData]);

  // ══════════════════════════════════════════════
  //  Mode Selection → Firebase
  // ══════════════════════════════════════════════
  const handleModeSelect = async (mode, code = null) => {
    setJoinErr('');
    if (mode === 'join' && (!code || code.length < 4)) { setJoinErr('أدخل الكود كاملاً'); return; }
    setGameMode(mode);
    setLoading(true);
    try {
      if (mode === 'random')  await startRandom();
      if (mode === 'create')  await startCreate();
      if (mode === 'join')    await startJoin(code);
    } catch (e) {
      setFbError(e.message || 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  const startRandom = async () => {
    // ابحث عن غرفة waiting عشوائية
    const q = query(collection(db, 'domino_rooms'), where('mode','==','random'), where('status','==','lobby'), limit(1));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const rId = snap.docs[0].id;
      const data = snap.docs[0].data();
      const players = data.players || [];
      if (players.length < 4) {
        const seat = players.length;
        const newPlayers = [...players, { uid: myUid, name: myName, seat, isBot: false, isHost: false }];
        await updateDoc(doc(db, 'domino_rooms', rId), { players: newPlayers, lastUpdate: Date.now() });
        roomIdRef.current = rId;
        setRoomId(rId); setMySeat(seat); mySeatRef.current = seat;
        setIsHost(false);
        listenRoom(rId);
        setAppScreen('lobby');
        return;
      }
    }
    // أنشئ غرفة جديدة
    const rId = `domino_rnd_${Date.now()}_${myUid.slice(0,8)}`;
    const players = [{ uid: myUid, name: myName, seat: 0, isBot: false, isHost: true }];
    await setDoc(doc(db, 'domino_rooms', rId), {
      id: rId, mode: 'random', status: 'lobby',
      players, hands: [[],[],[],[]], board: [], current: 0,
      scores: { red: 0, blue: 0 }, round: 1,
      roundOver: false, gameOver: false, passBits: [false,false,false,false],
      isHost: myUid, hostUid: myUid,
      createdAt: Date.now(), lastUpdate: Date.now(),
    });
    roomIdRef.current = rId;
    setRoomId(rId); setMySeat(0); setIsHost(true);
    listenRoom(rId);
    setAppScreen('lobby');

    // بوت بعد 45 ثانية
    botTimerRef.current = setTimeout(() => fillWithBots(rId), BOT_WAIT_MS);
  };

  const fillWithBots = async (rId) => {
    try {
      const snap = await getDoc(doc(db, 'domino_rooms', rId));
      if (!snap.exists() || snap.data().status !== 'lobby') return;
      const players = [...(snap.data().players || [])];
      while (players.length < 4) {
        const botIdx = players.length - 1;
        players.push({ uid: `bot_${botIdx}`, name: BOT_NAMES[botIdx], seat: players.length, isBot: true, isHost: false });
      }
      await updateDoc(doc(db, 'domino_rooms', rId), { players, lastUpdate: Date.now() });
      // Host يبدأ اللعبة تلقائياً
      await startGame(rId, players);
    } catch (e) { console.error('fillWithBots:', e); }
  };

  const startCreate = async () => {
    const code = genCode();
    const rId  = `domino_fr_${code}`;
    const players = [{ uid: myUid, name: myName, seat: 0, isBot: false, isHost: true }];
    await setDoc(doc(db, 'domino_rooms', rId), {
      id: rId, mode: 'friend', friendCode: code, status: 'lobby',
      players, hands: [[],[],[],[]], board: [], current: 0,
      scores: { red: 0, blue: 0 }, round: 1,
      roundOver: false, gameOver: false, passBits: [false,false,false,false],
      isHost: myUid, hostUid: myUid,
      createdAt: Date.now(), lastUpdate: Date.now(),
    });
    roomIdRef.current = rId;
    setRoomId(rId); setFriendCode(code); setMySeat(0); setIsHost(true);
    listenRoom(rId);
    setAppScreen('lobby');
  };

  const startJoin = async (code) => {
    const normCode = code.trim().toUpperCase();
    const q = query(collection(db, 'domino_rooms'), where('friendCode','==',normCode), where('status','==','lobby'), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) { setJoinErr('لم يتم العثور على الغرفة'); throw new Error('not found'); }
    const rId = snap.docs[0].id;
    const data = snap.docs[0].data();
    const players = data.players || [];
    if (players.length >= 4) { setJoinErr('الغرفة ممتلئة'); throw new Error('full'); }
    if (players.find(p => p.uid === myUid)) { setJoinErr('أنت بالفعل في الغرفة'); throw new Error('dup'); }
    const seat = players.length;
    const newPlayers = [...players, { uid: myUid, name: myName, seat, isBot: false, isHost: false }];
    await updateDoc(doc(db, 'domino_rooms', rId), { players: newPlayers, lastUpdate: Date.now() });
    roomIdRef.current = rId;
    setRoomId(rId); setMySeat(seat); mySeatRef.current = seat;
    setIsHost(false); setFriendCode(data.friendCode);
    listenRoom(rId);
    setAppScreen('lobby');
  };

  // ══════════════════════════════════════════════
  //  Start Game (host only)
  // ══════════════════════════════════════════════
  const startGame = async (rId, players) => {
    const deck = shuffle(buildDeck());
    const newHands = [deck.slice(0,7), deck.slice(7,14), deck.slice(14,21), deck.slice(21,28)];
    let starter = 0;
    for (let i = 0; i < 4; i++) {
      if (newHands[i].some(t => t[0] === 6 && t[1] === 6)) { starter = i; break; }
    }
    await updateDoc(doc(db, 'domino_rooms', rId || roomIdRef.current), {
      status: 'playing', hands: newHands, board: [], current: starter,
      scores: { red: 0, blue: 0 }, round: 1,
      roundOver: false, gameOver: false, passBits: [false,false,false,false],
      lastUpdate: Date.now(),
    });
  };

  const handleStartGame = () => startGame(roomIdRef.current, roomData?.players || []);

  // ══════════════════════════════════════════════
  //  Bot move (host executes)
  // ══════════════════════════════════════════════
  const botMove = useCallback((seat, hand, board) => {
    if (!hand || roundOverRef.current || gameOverRef.current) return;
    if (!hand.some(t => canPlayTile(t, board))) {
      executePass(seat, hand, board);
      return;
    }
    const best = bestPlayableTile(hand, board);
    if (best) executePlace(seat, best.idx, best.toRight, hand, board);
  }, []);

  // ══════════════════════════════════════════════
  //  Game actions → Firebase
  // ══════════════════════════════════════════════
  const executePlace = useCallback(async (seat, tileIdx, toRight, currentHands, currentBoard) => {
    if (roundOverRef.current || gameOverRef.current) return;
    const newBoard = placeTileOnBoard(currentBoard, currentHands[seat][tileIdx], toRight);
    const newHands = currentHands.map((h, i) => i === seat ? h.filter((_,j) => j !== tileIdx) : [...h]);
    const next = (seat + 1) % 4;

    if (newHands[seat].length === 0) {
      // دومينو
      await resolveRoundEnd(seat, 'domino', newHands, newBoard);
      return;
    }

    await fbUpdate({ hands: newHands, board: newBoard, current: next, lastMove: { seat, tileIdx, toRight } });
  }, [fbUpdate]);

  const executePass = useCallback(async (seat, hand, board) => {
    if (roundOverRef.current || gameOverRef.current) return;
    const next = (seat + 1) % 4;
    const allBlocked = hand.every((_, si) =>
      !(roomData?.hands?.[si] || []).some(t => canPlayTile(t, board))
    );
    if (allBlocked) { await resolveRoundEnd(-1, 'blocked', roomData?.hands || [], board); return; }

    const newBits = [false,false,false,false]; newBits[seat] = true;
    await fbUpdate({ current: next, passBits: newBits });
  }, [fbUpdate, roomData]);

  const resolveRoundEnd = useCallback(async (winnerId, reason, finalHands, finalBoard) => {
    const currentScores = roomData?.scores || { red: 0, blue: 0 };
    let newScores = { ...currentScores };
    if (reason === 'domino') {
      const isRed = [0,1].includes(winnerId);
      const oppSum = isRed ? sumHand(finalHands[2]) + sumHand(finalHands[3])
                           : sumHand(finalHands[0]) + sumHand(finalHands[1]);
      if (isRed) newScores.red  += oppSum;
      else       newScores.blue += oppSum;
    } else {
      const redSum  = sumHand(finalHands[0]) + sumHand(finalHands[1]);
      const blueSum = sumHand(finalHands[2]) + sumHand(finalHands[3]);
      if (redSum < blueSum) newScores.red  += blueSum;
      else if (blueSum < redSum) newScores.blue += redSum;
    }

    if (newScores.red >= 151 || newScores.blue >= 151) {
      await fbUpdate({ scores: newScores, gameOver: true, roundOver: true, status: 'finished' });
      if (onGameEnd) onGameEnd(newScores.red >= 151 && mySeatRef.current < 2);
    } else {
      // جولة جديدة بعد 1.4 ثانية (host يوزع)
      await fbUpdate({ scores: newScores, roundOver: true });
      setTimeout(async () => {
        const deck = shuffle(buildDeck());
        const nH = [deck.slice(0,7), deck.slice(7,14), deck.slice(14,21), deck.slice(21,28)];
        let starter = winnerId >= 0 ? winnerId : 0;
        const rnd = (roomData?.round || 1) + 1;
        await fbUpdate({ hands: nH, board: [], current: starter, round: rnd,
          roundOver: false, gameOver: false, passBits: [false,false,false,false] });
      }, 1400);
    }
  }, [fbUpdate, roomData, onGameEnd]);

  // ══════════════════════════════════════════════
  //  Human move
  // ══════════════════════════════════════════════
  const humanPlay = (tileIdx, toRight) => {
    if (current !== mySeat || roundOverRef.current || gameOverRef.current) return;
    const tile = handsRef.current[mySeat][tileIdx];
    if (!tile || !canPlayTile(tile, boardRef.current)) return;
    playSound('card_play');
    clearInterval(timerRef.current);
    executePlace(mySeat, tileIdx, toRight, handsRef.current, boardRef.current);
  };

  const humanPass = () => {
    if (current !== mySeat || roundOverRef.current || gameOverRef.current) return;
    if (handsRef.current[mySeat].some(t => canPlayTile(t, boardRef.current))) return;
    executePass(mySeat, handsRef.current[mySeat], boardRef.current);
  };

  // ══════════════════════════════════════════════
  //  Timer (local, for my turn)
  // ══════════════════════════════════════════════
  function startTimer(startPct) {
    if (timerRef.current) clearInterval(timerRef.current);
    timerPctRef.current = startPct;
    setTimerPct(startPct);
    timerRef.current = setInterval(() => {
      if (roundOverRef.current || gameOverRef.current) { clearInterval(timerRef.current); return; }
      if (currentRef.current !== mySeatRef.current) { clearInterval(timerRef.current); return; }
      timerPctRef.current = Math.max(0, timerPctRef.current - (100 / TURN_DURATION / 2.5));
      setTimerPct(Math.round(timerPctRef.current));
      if (timerPctRef.current <= 0) {
        clearInterval(timerRef.current);
        const h = handsRef.current[mySeatRef.current];
        const b = boardRef.current;
        if (h.some(t => canPlayTile(t, b))) {
          const best = bestPlayableTile(h, b);
          if (best) executePlace(mySeatRef.current, best.idx, best.toRight, handsRef.current, boardRef.current);
        } else {
          executePass(mySeatRef.current, h, b);
        }
      }
    }, 400);
  }

  // ══════════════════════════════════════════════
  //  Drag handlers
  // ══════════════════════════════════════════════
  function createPanResponder(tileIdx) {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 4 || Math.abs(gs.dx) > 4,
      onPanResponderGrant: (e) => {
        const tile = handsRef.current[mySeatRef.current]?.[tileIdx];
        if (!tile || !canPlayTile(tile, boardRef.current)) return;
        dragTileIdxRef.current = tileIdx;
        setDragTileIdx(tileIdx); setDragPos({ x: e.nativeEvent.pageX, y: e.nativeEvent.pageY });
        setDragging(true); setSelectedIdx(tileIdx);
      },
      onPanResponderMove: (e) => setDragPos({ x: e.nativeEvent.pageX, y: e.nativeEvent.pageY }),
      onPanResponderRelease: (e) => {
        setDragging(false);
        const px = e.nativeEvent.pageX, py = e.nativeEvent.pageY;
        const ba = boardAreaRef.current;
        const curIdx = dragTileIdxRef.current;
        const onBoard = px > ba.x && px < ba.x + ba.width && py > ba.y && py < ba.y + ba.height;
        if (onBoard && curIdx !== null) humanPlay(curIdx, px > ba.x + ba.width / 2);
        dragTileIdxRef.current = null;
        setDragTileIdx(null); setDragging(false);
      },
      onPanResponderTerminate: () => {
        setDragging(false); dragTileIdxRef.current = null; setDragTileIdx(null);
      },
    });
  }
  const panResponders = useRef(Array.from({ length: 7 }, (_, i) => createPanResponder(i)));
  useEffect(() => {
    panResponders.current = Array.from({ length: 7 }, (_, i) => createPanResponder(i));
  }, [hands, board, current, roundOver, gameOver, dragTileIdx, mySeat]);

  function onBoardLayout(e) {
    const { x, y, width, height } = e.nativeEvent.layout;
    setBoardArea({ x, y, width, height }); boardAreaRef.current = { x, y, width, height };
  }

  // ══════════════════════════════════════════════
  //  RENDER — Mode Select
  // ══════════════════════════════════════════════
  if (appScreen === 'modeSelect') {
    return (
      <ModeSelectScreen
        theme={theme} isRTL={isRTL} onBack={onBack}
        onSelect={handleModeSelect}
        joinCode={joinCodeInput} setJoinCode={setJoinCodeInput} joinErr={joinErr}
      />
    );
  }

  // ══════════════════════════════════════════════
  //  RENDER — Loading
  // ══════════════════════════════════════════════
  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center' }]}>
        <StatusBar barStyle={theme.statusBar} />
        <ActivityIndicator size="large" color={theme.accent || '#f5c842'} />
        <Text style={{ color: theme.textPrimary, marginTop: 12, fontSize: 14 }}>جاري الاتصال...</Text>
      </View>
    );
  }

  // ══════════════════════════════════════════════
  //  RENDER — Lobby
  // ══════════════════════════════════════════════
  if (appScreen === 'lobby') {
    const lobbyPlayers = roomData?.players || [];
    const canStart = lobbyPlayers.length === 4;
    return (
      <LobbyScreen
        theme={theme}
        players={lobbyPlayers}
        friendCode={friendCode}
        isHost={isHost}
        isFriend={gameMode === 'create' || gameMode === 'join'}
        isRTL={isRTL}
        onBack={onBack}
        onStart={handleStartGame}
        canStart={canStart}
      />
    );
  }

  // ══════════════════════════════════════════════
  //  RENDER — Game
  // ══════════════════════════════════════════════
  if (fbError) {
    return (
      <View style={[styles.container, { backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center' }]}>
        <StatusBar barStyle={theme.statusBar} />
        <Text style={{ color: '#ef4444', fontSize: 14 }}>❌ {fbError}</Text>
        <ThemedButton onPress={onBack} label="رجوع" variant="ghost" size="medium" style={{ marginTop: 16 }} />
      </View>
    );
  }

  const myHand = hands[mySeat] || [];
  const isMyTurn = current === mySeat && !roundOver && !gameOver;
  const canPass  = isMyTurn && !myHand.some(t => canPlayTile(t, board));
  const boardPositions = computeBoardLayout(board, boardArea.width || SW - 16, boardArea.height || 400);

  return (
    <View style={[styles.container, { backgroundColor: 'transparent' }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* ── HEADER ── */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <ExitButton onPress={onBack} />
          <GameInfoButton gameType="domino" lang={lang} />
          <WebScreenButton
            playerUid={myUid} playerName={playerInfo[0]?.name || ''}
            gameType="domino" gameRoomId={roomId || ''}
            getPublicData={() => ({ scores, round: roundNum })} themeName={themeId || 'dark'}
          />
        </View>
        <View style={styles.scores}>
          <View style={[styles.scoreCard, { borderColor: 'rgba(231,76,60,0.3)' }]}>
            <View style={[styles.teamDot, { backgroundColor: '#e74c3c' }]} />
            <View>
              <Text style={styles.teamNames}>{playerInfo[0]?.name} & {playerInfo[1]?.name}</Text>
              <Text style={styles.teamPts}>{scores.red} <Text style={styles.teamPtsOf}>/ 151</Text></Text>
            </View>
          </View>
          <Text style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12 }}>·</Text>
          <View style={[styles.scoreCard, { borderColor: 'rgba(52,152,219,0.3)' }]}>
            <View style={[styles.teamDot, { backgroundColor: '#3498db' }]} />
            <View>
              <Text style={styles.teamNames}>{playerInfo[2]?.name} & {playerInfo[3]?.name}</Text>
              <Text style={styles.teamPts}>{scores.blue} <Text style={styles.teamPtsOf}>/ 151</Text></Text>
            </View>
          </View>
        </View>
        <View style={{ width: 34 }} />
      </View>

      {/* ── ROUND BADGE ── */}
      <View style={styles.roundBadge}>
        <Text style={styles.roundText}>الجولة {roundNum} · دور: {playerInfo[current]?.name}</Text>
      </View>

      {/* ── GAME AREA ── */}
      <View style={styles.gameArea} onLayout={onBoardLayout}>
        <View style={styles.playerTop}>
          <PlayerLabel name={playerInfo[1]?.name} emoji={playerInfo[1]?.emoji} bg={playerInfo[1]?.bg} isActive={current===1} side="top" />
          <FaceDownStack count={hands[1]?.length || 0} direction="horizontal" />
          <PassBubble visible={passBubble[1]} style={{ top: -28, alignSelf: 'center' }} />
        </View>
        <View style={styles.playerLeft}>
          <PlayerLabel name={playerInfo[2]?.name} emoji={playerInfo[2]?.emoji} bg={playerInfo[2]?.bg} isActive={current===2} side="left" />
          <FaceDownStack count={hands[2]?.length || 0} direction="vertical" />
          <PassBubble visible={passBubble[2]} style={{ bottom: -28, alignSelf: 'center' }} />
        </View>
        <View style={styles.playerRight}>
          <PlayerLabel name={playerInfo[3]?.name} emoji={playerInfo[3]?.emoji} bg={playerInfo[3]?.bg} isActive={current===3} side="right" />
          <FaceDownStack count={hands[3]?.length || 0} direction="vertical" />
          <PassBubble visible={passBubble[3]} style={{ bottom: -28, alignSelf: 'center' }} />
        </View>

        <CrystalTable style={styles.crystalTable} />

        {boardPositions.map((pos, i) => (
          <BoardTile key={i} a={pos.a} b={pos.b} style={{ position: 'absolute', left: pos.x, top: pos.y, width: pos.w, height: pos.h }} />
        ))}

        <View style={styles.playerBottom}>
          {isMyTurn && <Text style={styles.turnArrow}>▲ دورك</Text>}
          <PlayerLabel name={playerInfo[0]?.name} emoji={playerInfo[0]?.emoji} bg={playerInfo[0]?.bg}
            isActive={current===mySeat} timerPct={timerPct} showTimer={current===mySeat} side="bottom" />
          <PassBubble visible={passBubble[0]} style={{ top: -28, alignSelf: 'center' }} />
        </View>
      </View>

      {/* ── MY HAND ── */}
      <View style={styles.handSection}>
        <Text style={styles.handLabel}>بطاقاتي</Text>
        <View style={styles.handRow}>
          {myHand.map((tile, idx) => {
            const playable = canPlayTile(tile, board);
            const pr = panResponders.current[idx];
            return (
              <View key={idx} {...(pr ? pr.panHandlers : {})}>
                <HandTile a={tile[0]} b={tile[1]} selected={selectedIdx === idx} unplayable={!playable || !isMyTurn} />
              </View>
            );
          })}
        </View>
        {canPass && (
          <TouchableOpacity onPress={humanPass} style={[styles.passBtn, { backgroundColor: '#e74c3c' }]}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>تمرير ⏭</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── DRAG GHOST ── */}
      {dragging && dragTileIdx !== null && myHand[dragTileIdx] && (
        <View pointerEvents="none" style={[styles.dragGhost, { left: dragPos.x - HAND_TILE_W / 2, top: dragPos.y - HAND_TILE_H / 2 }]}>
          <HandTile a={myHand[dragTileIdx][0]} b={myHand[dragTileIdx][1]} selected={false} unplayable={false} />
        </View>
      )}

      {/* ── RESULT ── */}
      <ResultScreen
        scores={scores} playerNames={playerInfo.map(p => p?.name || '?')}
        visible={gameOver}
        onNewGame={() => { setGameOver(false); gameOverRef.current = false; if (isHost) startGame(roomIdRef.current, roomData?.players || []); }}
        onExit={onBack}
      />
    </View>
  );
}

/* ═══════════════════════════════════════════════
   STYLES
═══════════════════════════════════════════════ */
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 52 : 36,
    paddingHorizontal: 14, paddingBottom: 8, gap: 8, zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.38)',
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  scores: { flex: 1, flexDirection: 'row', justifyContent: 'center', gap: 6, alignItems: 'center' },
  scoreCard: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(0,0,0,0.42)',
    borderWidth: 1, borderRadius: 18, paddingVertical: 5, paddingHorizontal: 10, justifyContent: 'center' },
  teamDot: { width: 7, height: 7, borderRadius: 4 },
  teamNames: { fontSize: 9, color: 'rgba(255,255,255,0.6)' },
  teamPts: { fontSize: 16, fontWeight: '900', color: '#fff', lineHeight: 18 },
  teamPtsOf: { fontSize: 8, color: 'rgba(255,255,255,0.35)', fontWeight: '400' },
  roundBadge: { alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.38)', borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)', borderRadius: 10, paddingVertical: 3, paddingHorizontal: 12, marginBottom: 2, zIndex: 10 },
  roundText: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
  gameArea: { flex: 1, position: 'relative', marginHorizontal: 4 },
  playerTop:    { position: 'absolute', top: 6,  left: 0, right: 0, alignItems: 'center', zIndex: 5 },
  playerBottom: { position: 'absolute', bottom: 6, left: 0, right: 0, alignItems: 'center', zIndex: 5 },
  playerLeft:   { position: 'absolute', top: '30%', left: 4, zIndex: 5, alignItems: 'flex-start', gap: 4 },
  playerRight:  { position: 'absolute', top: '30%', right: 4, zIndex: 5, alignItems: 'flex-end', gap: 4 },
  crystalTable: { ...StyleSheet.absoluteFillObject, zIndex: 0 },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  nameTag: { backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 },
  nameTagActive: { backgroundColor: 'rgba(245,200,66,0.18)', borderWidth: 1, borderColor: 'rgba(245,200,66,0.3)' },
  nameText: { color: 'rgba(255,255,255,0.75)', fontSize: 10, fontWeight: '600' },
  nameTextMe: { color: '#f5c842', fontWeight: '800', fontSize: 11 },
  timerBar: { width: 70, height: 4, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 2, overflow: 'hidden' },
  timerFill: { height: '100%', borderRadius: 2 },
  turnArrow: { color: '#f5c842', fontSize: 11, fontWeight: '800', marginBottom: 2 },
  handSection: { paddingVertical: 8, paddingHorizontal: 10, backgroundColor: 'rgba(0,0,0,0.35)',
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', alignItems: 'center', gap: 6 },
  handLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10, letterSpacing: 1 },
  handRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 5 },
  passBtn: { paddingHorizontal: 20, paddingVertical: 6, borderRadius: 10, marginTop: 4 },
  dragGhost: { position: 'absolute', zIndex: 99, opacity: 0.85 },
  // Lobby
  codeBox: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 2,
    borderRadius: 16, paddingVertical: 16, paddingHorizontal: 20, gap: 4 },
  playerListCard: { borderRadius: 16, borderWidth: 1, padding: 14 },
  lobbyPlayerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10,
    borderBottomWidth: 1 },
  lobbyAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  crownBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8,
    backgroundColor: 'rgba(245,200,66,0.15)', borderWidth: 1, borderColor: 'rgba(245,200,66,0.3)' },
  // Mode select
  optIcon: { width: 50, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  codeInput: { height: 42, borderRadius: 10, borderWidth: 1.5, paddingHorizontal: 12,
    fontSize: 16, fontWeight: '800', letterSpacing: 3 },
  onlineDot: { position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: 5,
    backgroundColor: '#2ecc71', borderWidth: 2, borderColor: 'rgba(0,0,0,0.5)' },
  // Results
  resultOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.88)',
    alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 24, zIndex: 100 },
  resultTitle: { fontSize: 20, fontWeight: '900', color: '#fff', textAlign: 'center' },
  resultCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 14, padding: 14,
    alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', position: 'relative', overflow: 'hidden' },
  resultCardWin: { backgroundColor: 'rgba(245,200,66,0.12)', borderColor: 'rgba(245,200,66,0.3)' },
  winBadge: { position: 'absolute', top: 6, right: 6, backgroundColor: '#f5c842',
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  resBtnSec: { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  resBtnPri: { flex: 1, backgroundColor: '#f5c842', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
});

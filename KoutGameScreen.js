import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar, Animated, Platform, Modal,
  useWindowDimensions} from 'react-native';
import { useTheme } from './ThemeContext';
import ExitButton from './ExitButton';
import { useLanguage } from './I18n';
import { useOnlineGame } from './useOnlineGame';
import { WebScreenButton, GameInfoButton } from './WebRoomService';
import { playSound } from './SoundService';
import { ThemedButton, ThemedCard, ThemedPill, ThemedRow } from './ThemedComponents';
import OnlineRoomSetup, { OnlineWaitingLobby } from './OnlineRoomSetup';
import CrystalTable from './CrystalTable';


/* ═══════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════ */
const CARD_W   = 48;  // hand card width
const CARD_H   = 68;  // hand card height
const CARD_OVERLAP = -22; // negative margin = overlap
const TRICK_W  = 52;
const TRICK_H  = 72;
const TURN_SEC = 15;

const SUITS = { spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣' };
const SUIT_COLOR = { spades: '#1a1a2a', hearts: '#c0392b', diamonds: '#c0392b', clubs: '#1a1a2a' };
const SUIT_NAME_AR = { spades: 'بستوني', hearts: 'قلوب', diamonds: 'ديامونا', clubs: 'شومة' };

/* ═══════════════════════════════════════════════
   DECK BUILDER  (4-player: red 6-A, black 7-A + joker + maker = 36)
═══════════════════════════════════════════════ */
function buildDeck4() {
  const deck = [];
  // Red suits: 6-A (9 ranks each = 18 cards)
  ['hearts', 'diamonds'].forEach(suit => {
    ['6','7','8','9','10','J','Q','K','A'].forEach((rank, i) => {
      deck.push({ suit, rank, value: i + 6, isHokm: false });
    });
  });
  // Black suits: 7-A (8 ranks each = 16 cards)
  ['spades', 'clubs'].forEach(suit => {
    ['7','8','9','10','J','Q','K','A'].forEach((rank, i) => {
      deck.push({ suit, rank, value: i + 7, isHokm: false });
    });
  });
  // Joker (red) = value 100, Maker (black) = value 99
  deck.push({ suit: 'joker', rank: 'JOKER', value: 100, isHokm: false });
  deck.push({ suit: 'maker', rank: 'MAKER', value: 99,  isHokm: false });
  return deck; // 36 cards
}

function buildDeck6() {
  const deck = [];
  ['spades','hearts','diamonds','clubs'].forEach(suit => {
    ['5','6','7','8','9','10','J','Q','K','A'].forEach((rank, i) => {
      deck.push({ suit, rank, value: i + 5, isHokm: false });
    });
  });
  deck.push({ suit: 'joker', rank: 'JOKER', value: 100, isHokm: false });
  deck.push({ suit: 'maker', rank: 'MAKER', value: 99,  isHokm: false });
  return deck; // 42 cards
}

function shuffleDeck(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ═══════════════════════════════════════════════
   CARD STRENGTH (after hokm is set)
   Red Joker > A-of-hokm > Black Joker (Maker) > rest of hokm > others
═══════════════════════════════════════════════ */
function cardStrength(card, hokm, ledSuit) {
  if (card.suit === 'joker') return 1000;
  if (card.suit === hokm && card.rank === 'A') return 999;
  if (card.suit === 'maker') return 998;
  if (card.suit === hokm) return 100 + card.value;
  if (card.suit === ledSuit) return card.value;
  return 0; // can't win
}

function determineTrickWinner(trick, hokm) {
  if (!trick || trick.length === 0) return null;
  const ledSuit = trick[0].card.suit === 'joker' ? hokm : trick[0].card.suit;
  let best = trick[0];
  for (let i = 1; i < trick.length; i++) {
    if (cardStrength(trick[i].card, hokm, ledSuit) > cardStrength(best.card, hokm, ledSuit)) {
      best = trick[i];
    }
  }
  return best.uid;
}

/* ═══════════════════════════════════════════════
   SORT HAND: most-count suit left, alternating color, joker/maker rightmost
═══════════════════════════════════════════════ */
function sortHand(hand) {
  const jokers = hand.filter(c => c.suit === 'joker' || c.suit === 'maker')
    .sort((a, b) => b.value - a.value);
  const normal = hand.filter(c => c.suit !== 'joker' && c.suit !== 'maker');

  // count per suit
  const counts = {};
  ['spades','hearts','diamonds','clubs'].forEach(s => {
    counts[s] = normal.filter(c => c.suit === s).length;
  });

  // sort suits: most cards first, alternating color (black, red, black, red)
  const blacks = ['spades','clubs'].sort((a,b) => counts[b] - counts[a]);
  const reds   = ['hearts','diamonds'].sort((a,b) => counts[b] - counts[a]);

  // interleave: dominant black, dominant red, other black, other red
  const suitOrder = [blacks[0], reds[0], blacks[1], reds[1]]
    .filter(s => counts[s] > 0);

  const sorted = [];
  suitOrder.forEach(s => {
    sorted.push(...normal.filter(c => c.suit === s).sort((a,b) => b.value - a.value));
  });
  return [...sorted, ...jokers];
}

/* ═══════════════════════════════════════════════
   FORBIDDEN BID (mulzoom last player)
   If all 3 others passed → last player must bid, forced min=5 (M/ملزوم)
   Otherwise: must bid higher than current max bid
═══════════════════════════════════════════════ */
function getForbiddenBid(bids, playerCount, isLastBidder, allOthersPassedOrZero) {
  return null; // logic handled in bidding modal
}

/* ═══════════════════════════════════════════════
   FACE-DOWN STACK (overlapping like real cards)
   direction: 'horizontal' (top) | 'vertical-left' | 'vertical-right'
═══════════════════════════════════════════════ */
function FaceDownStack({ count, direction = 'horizontal' }) {
  const isH = direction === 'horizontal';
  // card back small size
  const cW = isH ? 26 : 38;
  const cH = isH ? 38 : 26;
  const overlap = isH ? -10 : -11;
  const containerStyle = {
    flexDirection: isH ? 'row' : 'column',
    alignItems: 'center',
  };

  return (
    <View style={containerStyle}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={{
          width: cW, height: cH,
          backgroundColor: '#0f2848',
          borderRadius: 4,
          borderWidth: 1.5,
          borderColor: 'rgba(255,255,255,0.15)',
          marginLeft: isH && i > 0 ? overlap : 0,
          marginTop: !isH && i > 0 ? overlap : 0,
          shadowColor: '#000',
          shadowOffset: { width: 1, height: 1 },
          shadowOpacity: 0.4, shadowRadius: 2, elevation: 2,
          overflow: 'hidden',
        }}>
          <View style={{
            position: 'absolute', inset: 3,
            borderRadius: 2, borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.08)',
          }} />
        </View>
      ))}
    </View>
  );
}

/* ═══════════════════════════════════════════════
   PLAYER LABEL — identical to Domino style
   (avatar + online dot + name tag, timer below)
   side: 'top' | 'left' | 'right' | 'bottom'
═══════════════════════════════════════════════ */
function PlayerLabel({ styles, name, isActive, timerPct, showTimer, isBot, side = 'top' }) {
  const isLeft  = side === 'left';
  const isRight = side === 'right';

  const avatarEl = (
    <View style={{ position: 'relative' }}>
      <View style={[styles.avatar, {
        borderColor: isActive ? '#f5c842' : 'rgba(255,255,255,0.15)',
        borderWidth: isActive ? 2.5 : 2,
        shadowColor: isActive ? '#f5c842' : '#000',
        shadowOpacity: isActive ? 0.55 : 0.2,
        shadowRadius: isActive ? 8 : 3,
        elevation: isActive ? 6 : 2,
      }]}>
        <Text style={{ fontSize: 16 }}>{isBot ? '🤖' : '👤'}</Text>
      </View>
      <View style={styles.onlineDot} />
    </View>
  );

  const nameEl = (
    <View style={[styles.nameTag, isActive && styles.nameTagActive]}>
      <Text style={styles.nameText} numberOfLines={1}>{name}</Text>
    </View>
  );

  return (
    <View style={{
      alignItems: isRight ? 'flex-end' : isLeft ? 'flex-start' : 'center',
      gap: 4,
    }}>
      <View style={{
        flexDirection: 'row',
        alignItems: 'center', gap: 6,
      }}>
        {avatarEl}
        {nameEl}
      </View>
      {showTimer && (
        <View style={[styles.timerBar]}>
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
   PLAYING CARD COMPONENT (face-up)
═══════════════════════════════════════════════ */
function PlayingCard({ card, selected, disabled, winning, style, width = CARD_W, height = CARD_H, onPress }) {
  if (!card) return null;

  const isJoker = card.suit === 'joker';
  const isMaker = card.suit === 'maker';
  const isSpecial = isJoker || isMaker;
  const color = isSpecial ? (isJoker ? '#c9922a' : '#333') : SUIT_COLOR[card.suit];
  const suitChar = isSpecial ? '' : SUITS[card.suit];
  const fontSize = width < 44 ? 10 : 12;
  const suitBig  = width < 44 ? 16 : 22;

  return (
    <TouchableOpacity
      activeOpacity={disabled ? 1 : 0.85}
      onPress={disabled ? undefined : onPress}
      style={[{
        width, height,
        backgroundColor: isJoker ? '#fff8e6' : isMaker ? '#f0f0f0' : '#f8f2e4',
        borderRadius: 7,
        borderWidth: selected ? 2.5 : winning ? 2.5 : 1.5,
        borderColor: selected ? '#f59e0b' : winning ? '#4ade80' : (card.isHokm ? '#c9922a' : '#d5cbb8'),
        alignItems: 'center', justifyContent: 'center',
        opacity: disabled ? 0.28 : 1,
        shadowColor: selected ? '#f59e0b' : winning ? '#4ade80' : '#000',
        shadowOffset: { width: 0, height: selected ? 5 : 2 },
        shadowOpacity: selected ? 0.6 : 0.35,
        shadowRadius: selected ? 8 : 3,
        elevation: selected ? 10 : 3,
        transform: [{ translateY: selected ? -14 : 0 }],
        overflow: 'hidden',
      }, style]}>

      {/* corner top-left */}
      <View style={{ position: 'absolute', top: 3, left: 4, alignItems: 'center' }}>
        <Text style={{ fontSize, fontWeight: '900', color, lineHeight: fontSize + 1, fontFamily: 'Georgia' }}>
          {isSpecial ? (isJoker ? '🃏' : '🂿') : card.rank}
        </Text>
        {!isSpecial && (
          <Text style={{ fontSize: fontSize - 1, color, lineHeight: fontSize }}>{suitChar}</Text>
        )}
      </View>

      {/* center big suit */}
      {!isSpecial && (
        <Text style={{ fontSize: suitBig, color, lineHeight: suitBig + 2 }}>{suitChar}</Text>
      )}
      {isSpecial && (
        <Text style={{ fontSize: suitBig - 4, color }}>{isJoker ? '🃏' : '🂿'}</Text>
      )}

      {/* corner bottom-right (rotated) */}
      <View style={{
        position: 'absolute', bottom: 3, right: 4,
        alignItems: 'center', transform: [{ rotate: '180deg' }],
      }}>
        <Text style={{ fontSize, fontWeight: '900', color, lineHeight: fontSize + 1, fontFamily: 'Georgia' }}>
          {isSpecial ? '' : card.rank}
        </Text>
        {!isSpecial && (
          <Text style={{ fontSize: fontSize - 1, color, lineHeight: fontSize }}>{suitChar}</Text>
        )}
      </View>

      {/* gold shimmer for hokm */}
      {card.isHokm && !isSpecial && (
        <View style={{
          position: 'absolute', inset: 0, borderRadius: 7,
          borderWidth: 1.5, borderColor: 'rgba(201,146,42,0.5)',
          backgroundColor: 'rgba(201,146,42,0.04)',
        }} pointerEvents="none" />
      )}
    </TouchableOpacity>
  );
}

/* ═══════════════════════════════════════════════
   LAMAS DOTS TRACK
   bid: number, teamATricks, teamBTricks, maxTricks
   teamA = bidding team (side=left), teamB = defending (side=right)
   target dot at position = bid from teamA side
═══════════════════════════════════════════════ */
function LamasDots({ bid, teamATricks, teamBTricks, maxTricks = 9 }) {
  const dots = Array.from({ length: maxTricks });
  // teamA (blue) fills from left (index 0..bid-1), target dot at bid-1
  // teamB (red) fills from right (index maxTricks-1 downward), target at maxTricks-bid (from left = bid tricks needed to defeat)
  const targetAIdx = bid > 0 ? bid - 1 : Math.floor(maxTricks / 2);
  // red team needs (maxTricks - bid + 1) tricks to win (defeat bidder)
  // their target dot = index (maxTricks - bid) from left = bid tricks short of defeat
  const targetBIdx = bid > 0 ? maxTricks - bid : Math.floor(maxTricks / 2);

  return (
    <View style={{ alignItems: 'center', gap: 2 }}>
      <View style={{ flexDirection: 'row', gap: 3, alignItems: 'center' }}>
        {dots.map((_, i) => {
          const isTargetA = i === targetAIdx;
          const isTargetB = i === targetBIdx;
          const isTarget  = isTargetA || isTargetB;
          // blue fills left-to-right from 0
          const filledA  = i < teamATricks;
          // red fills right-to-left from maxTricks-1
          const filledB  = i >= (maxTricks - teamBTricks);
          return (
            <View key={i} style={{
              width: isTarget ? 9 : 7,
              height: isTarget ? 9 : 7,
              borderRadius: 99,
              backgroundColor: isTarget
                ? '#fff'
                : filledA ? '#3b9eff'
                : filledB ? '#ff7043'
                : 'rgba(255,255,255,0.18)',
              shadowColor: isTarget ? '#fff' : 'transparent',
              shadowOpacity: isTarget ? 0.7 : 0,
              shadowRadius: isTarget ? 4 : 0,
              elevation: isTarget ? 3 : 0,
            }} />
          );
        })}
      </View>
    </View>
  );
}

/* ═══════════════════════════════════════════════
   BID MODAL
═══════════════════════════════════════════════ */
function BidModal({ styles, visible, currentHighBid, isMalzoom, timerPct, onBid, onPass }) {
  const options = [null, 5, 6, 7, 8, 9]; // null = pass/hand

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.bidOverlay}>
        <View style={[styles.bidModal, { backgroundColor: theme.bgElevated }]}>
          <Text style={styles.bidTitle}>🤝 اختر مزايدتك</Text>
          {currentHighBid > 0 && (
            <Text style={styles.bidSub}>المزايدة الحالية: {currentHighBid} · يجب أن تزايد بأعلى أو تمرّر</Text>
          )}
          {isMalzoom && (
            <Text style={[styles.bidSub, { color: '#ef4444' }]}>ملزوم — يجب أن تختار حكماً (M أو رقم)</Text>
          )}
          {/* timer bar */}
          <View style={styles.bidTimerWrap}>
            <View style={[styles.bidTimerFill, {
              width: `${timerPct}%`,
              backgroundColor: timerPct > 50 ? '#4ade80' : timerPct > 22 ? '#f59e0b' : '#ef4444',
            }]} />
          </View>
          <View style={styles.bidGrid}>
            {/* Pass / Hand icon */}
            {!isMalzoom && (
              <TouchableOpacity style={styles.bidBtn} onPress={onPass}>
                <Text style={{ fontSize: 26 }}>✋</Text>
                <Text style={styles.bidBtnLabel}>تمرير</Text>
              </TouchableOpacity>
            )}
            {[5, 6, 7, 8, 9].map(n => {
              const disabled = !isMalzoom && currentHighBid >= n;
              const isMLabel = isMalzoom && n === 5;
              return (
                <TouchableOpacity
                  key={n}
                  style={[styles.bidBtn, disabled && styles.bidBtnDisabled]}
                  onPress={disabled ? undefined : () => onBid(n, isMalzoom && n === 5)}
                  disabled={disabled}
                >
                  <Text style={[styles.bidBtnNum, disabled && { opacity: 0.3 }]}>
                    {isMLabel ? 'M' : n}
                  </Text>
                  {n === 9 && <Text style={styles.bidBtnLabel}>بوان</Text>}
                  {isMLabel && <Text style={[styles.bidBtnLabel, { color: '#ef4444' }]}>ملزوم</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

/* ═══════════════════════════════════════════════
   HOKM CHOOSE MODAL
═══════════════════════════════════════════════ */
function HokmModal({ styles, visible, hand, timerPct, onChoose }) {
  const [sel, setSel] = useState(null);
  const suitsList = ['spades', 'hearts', 'diamonds', 'clubs'];

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.bidOverlay}>
        <View style={[styles.bidModal, { backgroundColor: theme.bgElevated }]}>
          <Text style={styles.bidTitle}>اختر الحكم (الكوز)</Text>
          <Text style={styles.bidSub}>فزت بالمزايدة — اختر الرمز الأقوى</Text>
          <View style={styles.bidTimerWrap}>
            <View style={[styles.bidTimerFill, {
              width: `${timerPct}%`,
              backgroundColor: timerPct > 50 ? '#4ade80' : timerPct > 22 ? '#f59e0b' : '#ef4444',
            }]} />
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginBottom: 16 }}>
            {suitsList.map(s => (
              <TouchableOpacity
                key={s}
                style={[styles.hokmSuit, sel === s && styles.hokmSuitSel]}
                onPress={() => setSel(s)}
              >
                <Text style={{ fontSize: 30, color: SUIT_COLOR[s] }}>{SUITS[s]}</Text>
                <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: '700', marginTop: 2 }}>
                  {SUIT_NAME_AR[s]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={[styles.bidConfirm, !sel && { opacity: 0.4 }]}
            onPress={sel ? () => onChoose(sel) : undefined}
            disabled={!sel}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>✓ تأكيد الحكم</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

/* ═══════════════════════════════════════════════
   ROUND RESULT MODAL
═══════════════════════════════════════════════ */
function RoundResultModal({ styles, visible, teamA, teamB, bid, hokmSuit, isMalzoom, onNext }) {
  if (!visible) return null;
  const teamAWon = teamA.tricks >= bid;
  const pts = teamAWon ? bid : isMalzoom ? bid : bid * 2;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.bidOverlay}>
        <View style={[styles.bidModal, { backgroundColor: theme.bgElevated, paddingVertical: 26 }]}>
          <Text style={styles.bidTitle}>انتهت الجولة!</Text>
          {/* Team A */}
          <View style={[styles.resultCard, { borderColor: '#3b9eff33' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#3b9eff' }} />
              <Text style={{ color: '#fff', fontWeight: '700', flex: 1 }}>{teamA.name}</Text>
              <Text style={{ color: '#3b9eff', fontWeight: '900', fontSize: 13 }}>
                {bid} {SUITS[hokmSuit]} حكم
              </Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
              <View style={{ alignItems: 'center' }}>
                <Text style={styles.resLbl}>المزايدة</Text>
                <Text style={styles.resVal}>{bid}</Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={styles.resLbl}>الرميات</Text>
                <Text style={styles.resVal}>{teamA.tricks}</Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={styles.resLbl}>النتيجة</Text>
                <Text style={[styles.resVal, { color: teamAWon ? '#4ade80' : '#f87171' }]}>
                  {teamAWon ? `+${bid}` : '+0'}
                </Text>
              </View>
            </View>
          </View>
          {/* Team B */}
          <View style={[styles.resultCard, { borderColor: '#ff704333', marginTop: 10 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#ff7043' }} />
              <Text style={{ color: '#fff', fontWeight: '700' }}>{teamB.name}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
              <View style={{ alignItems: 'center' }}>
                <Text style={styles.resLbl}>الرميات</Text>
                <Text style={styles.resVal}>{teamB.tricks}</Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={styles.resLbl}>النتيجة</Text>
                <Text style={[styles.resVal, { color: teamAWon ? '#888' : '#4ade80' }]}>
                  {teamAWon ? '+0' : `+${pts}`}
                </Text>
              </View>
            </View>
          </View>
          {/* Totals */}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 14, justifyContent: 'center' }}>
            {[
              { name: teamA.name, total: teamA.total, color: '#3b9eff' },
              { name: teamB.name, total: teamB.total, color: '#ff7043' },
            ].map((t, i) => (
              <View key={i} style={[styles.totalChip, { borderColor: t.color + '44' }]}>
                <Text style={{ fontSize: 9, color: t.color, fontWeight: '600', marginBottom: 2 }}>{t.name}</Text>
                <Text style={{ fontSize: 22, fontWeight: '900', color: '#fff' }}>{t.total}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity style={[styles.bidConfirm, { marginTop: 16, backgroundColor: '#16a34a' }]} onPress={onNext}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>▶ الجولة التالية</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

/* ═══════════════════════════════════════════════
   GAME OVER MODAL
═══════════════════════════════════════════════ */
function GameOverModal({ styles, visible, teamA, teamB, onNewGame, onExit }) {
  if (!visible) return null;
  const aWon = teamA.total >= teamB.total;
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.bidOverlay}>
        <View style={[styles.bidModal, { backgroundColor: theme.bgElevated, paddingVertical: 28, alignItems: "center" }]}>
          <Text style={{ fontSize: 50 }}>🏆</Text>
          <Text style={styles.bidTitle}>
            {aWon ? `فاز ${teamA.name}!` : `فاز ${teamB.name}!`}
          </Text>
          {[
            { ...teamA, color: '#3b9eff' },
            { ...teamB, color: '#ff7043' },
          ].map((t, i) => (
            <View key={i} style={[styles.totalChip, { borderColor: t.color + '44', marginTop: 8, minWidth: 160 }]}>
              <Text style={{ fontSize: 11, color: t.color, fontWeight: '700' }}>{t.name}</Text>
              <Text style={{ fontSize: 28, fontWeight: '900', color: '#fff' }}>{t.total}</Text>
            </View>
          ))}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
            <TouchableOpacity style={styles.outlineBtn} onPress={onExit}>
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontWeight: '700' }}>خروج</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.bidConfirm} onPress={onNewGame}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>▶ جولة جديدة</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/* ═══════════════════════════════════════════════
   MAIN SCREEN
═══════════════════════════════════════════════ */
export default function KoutGameScreen({ onBack, currentUser, onGameEnd, onGameReady }) {
  const { width: W, height: H } = useWindowDimensions();
  const styles = useMemo(() => makeStyles(W, H), [W, H]);
  const { theme, themeId } = useTheme();
  const { lang } = useLanguage();
  // ── اختيار الوضع ──
  const [selectedMode,  setSelectedMode]  = useState(null);
  const [joinCodeInput, setJoinCodeInput] = useState(null);
  const isRTL = lang === 'ar';

  const handleModeSelect = (mode, code = null) => {
    setJoinCodeInput(code);
    setSelectedMode(mode);
  };

  const { roomId, isPlayer1, roomData, loading, error, friendCode, updateRoom, endGame, leaveRoom } =
    useOnlineGame('kout', currentUser, onGameReady, selectedMode, joinCodeInput);

  /* ── Local game state (mirrors Firestore) ── */
  const [phase, setPhase] = useState('waiting'); // waiting|lobby|bidding|hokmChoice|playing|roundEnd|gameOver
  const [players, setPlayers] = useState([]);
  const [myHand, setMyHand] = useState([]);
  const [currentTrick, setCurrentTrick] = useState([]); // [{uid, card}]
  const [trickWinner, setTrickWinner] = useState(null); // uid
  const [hokm, setHokm] = useState(null); // suit string
  const [bids, setBids] = useState({}); // { uid: number | 'pass' }
  const [currentBidder, setCurrentBidder] = useState(null); // uid
  const [highBid, setHighBid] = useState(0);
  const [highBidder, setHighBidder] = useState(null);
  const [isMalzoom, setIsMalzoom] = useState(false);
  const [teamScores, setTeamScores] = useState({ a: 0, b: 0 }); // cumulative
  const [teamTricks, setTeamTricks] = useState({ a: 0, b: 0 }); // this round
  const [currentLeader, setCurrentLeader] = useState(null); // uid who leads next trick
  const [selectedCard, setSelectedCard] = useState(null);
  const [round, setRound] = useState(1);
  const [showRoundResult, setShowRoundResult] = useState(false);
  const [showGameOver, setShowGameOver] = useState(false);

  /* ── Timer ── */
  const [timerPct, setTimerPct] = useState(100);
  const timerRef = useRef(null);

  const myUid = currentUser?.uid;
  const myName = currentUser?.name || 'أنت';

  /* ── seat helpers ──
     seat 0 = me (bottom), seat 1 = top (partner), seat 2 = left (opponent), seat 3 = right (opponent)
     Team A = seats 0,1 (me + top), Team B = seats 2,3 (left + right)
  ── */
  const myIdx   = players.findIndex(p => p.uid === myUid);
  const seated  = (offset) => players[(myIdx + offset) % players.length];
  const topP    = seated(2); // across from me
  const leftP   = seated(1); // to my left (clockwise)
  const rightP  = seated(3); // to my right

  const isMyTurn = currentLeader === myUid && phase === 'playing';
  const isMyBidTurn = currentBidder === myUid && phase === 'bidding';
  const isMyHokmTurn = highBidder === myUid && phase === 'hokmChoice';

  /* ── Sync from Firestore ── */
  useEffect(() => {
    if (!roomData) return;
    if (roomData.phase) setPhase(roomData.phase);
    if (roomData.players) setPlayers(roomData.players);
    if (roomData.hands?.[myUid]) setMyHand(sortHand(roomData.hands[myUid]));
    if (roomData.currentTrick) setCurrentTrick(roomData.currentTrick);
    if (roomData.hokm) setHokm(roomData.hokm);
    if (roomData.bids) setBids(roomData.bids);
    if (roomData.currentBidder) setCurrentBidder(roomData.currentBidder);
    if (roomData.highBid !== undefined) setHighBid(roomData.highBid);
    if (roomData.highBidder) setHighBidder(roomData.highBidder);
    if (roomData.isMalzoom !== undefined) setIsMalzoom(roomData.isMalzoom);
    if (roomData.teamScores) setTeamScores(roomData.teamScores);
    if (roomData.teamTricks) setTeamTricks(roomData.teamTricks);
    if (roomData.currentLeader) setCurrentLeader(roomData.currentLeader);
    if (roomData.round) setRound(roomData.round);
    if (roomData.phase === 'roundEnd') setShowRoundResult(true);
    if (roomData.phase === 'gameOver') {
      setShowGameOver(true);
      // تسجيل XP — teamA = فريق اللاعب دائماً (seat 0 و 2)
      const sc = roomData.teamScores || { a: 0, b: 0 };
      if (onGameEnd) onGameEnd(sc.a > sc.b);
    }
  }, [roomData]);

  /* ── Timer logic ── */
  const startTimer = useCallback((onTimeout) => {
    clearInterval(timerRef.current);
    let elapsed = 0;
    setTimerPct(100);
    timerRef.current = setInterval(() => {
      elapsed += 100;
      const pct = Math.max(0, 100 - (elapsed / (TURN_SEC * 1000)) * 100);
      setTimerPct(pct);
      if (elapsed >= TURN_SEC * 1000) {
        clearInterval(timerRef.current);
        onTimeout();
      }
    }, 100);
  }, []);

  useEffect(() => {
    if (isMyTurn) {
      startTimer(() => autoPlayCard());
    } else if (isMyBidTurn) {
      startTimer(() => autoPass());
    } else if (isMyHokmTurn) {
      startTimer(() => autoChooseHokm());
    }
    return () => clearInterval(timerRef.current);
  }, [isMyTurn, isMyBidTurn, isMyHokmTurn]);

  /* ── Auto actions ── */
  const autoPlayCard = useCallback(() => {
    const playable = getPlayableCards();
    if (playable.length > 0) {
      const best = playable.reduce((a, b) => b.value > a.value ? b : a);
      handlePlayCard(best);
    }
  }, [myHand, currentTrick, hokm]);

  const autoPass = useCallback(() => {
    handleBid(null, false);
  }, []);

  const autoChooseHokm = useCallback(() => {
    // choose suit with most cards in hand
    const counts = { spades: 0, hearts: 0, diamonds: 0, clubs: 0 };
    myHand.forEach(c => { if (counts[c.suit] !== undefined) counts[c.suit]++; });
    const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
    handleChooseHokm(best);
  }, [myHand]);

  /* ── Get playable cards (follow-suit rule) ── */
  const getPlayableCards = useCallback(() => {
    if (!currentTrick || currentTrick.length === 0) return myHand;
    const ledSuit = currentTrick[0].card.suit;
    if (ledSuit === 'joker' || ledSuit === 'maker') return myHand;
    const sameSuit = myHand.filter(c => c.suit === ledSuit);
    // joker and maker can always be played
    const specials = myHand.filter(c => c.suit === 'joker' || c.suit === 'maker');
    if (sameSuit.length > 0) return [...sameSuit, ...specials];
    return myHand;
  }, [myHand, currentTrick]);

  const isPlayable = (card) => {
    const playable = getPlayableCards();
    return playable.some(c => c.suit === card.suit && c.rank === card.rank);
  };

  /* ── Actions ── */
  const handleBid = async (amount, malzoom = false) => {
    if (!isMyBidTurn) return;
    const newBids = { ...bids, [myUid]: amount ?? 'pass' };
    // figure out next bidder and state
    const bidOrder = players.map(p => p.uid);
    const myBidIdx = bidOrder.indexOf(myUid);
    const nextBidderUid = bidOrder[(myBidIdx + 1) % bidOrder.length];

    // check if bidding is over
    const allBid = Object.keys(newBids).length === players.length;
    const allPassed = Object.values(newBids).every(v => v === 'pass' || v === null);
    const activeBids = Object.entries(newBids).filter(([, v]) => v !== 'pass' && v !== null);
    const newHighBid = amount ?? highBid;
    const newHighBidder = amount ? myUid : highBidder;

    if (allBid) {
      if (allPassed) {
        // malzoom — last bidder forced
        await updateRoom({
          bids: newBids, highBid: 5, highBidder: myUid, isMalzoom: true,
          phase: 'hokmChoice', currentBidder: null,
        });
      } else {
        await updateRoom({
          bids: newBids, highBid: newHighBid, highBidder: newHighBidder,
          isMalzoom: malzoom,
          phase: 'hokmChoice', currentBidder: null,
        });
      }
    } else {
      await updateRoom({
        bids: newBids, currentBidder: nextBidderUid,
        highBid: newHighBid, highBidder: newHighBidder,
      });
    }
  };

  const handleChooseHokm = async (suit) => {
    if (!isMyHokmTurn) return;
    // mark hokm cards in all hands — update Firestore
    await updateRoom({
      hokm: suit, phase: 'playing',
      currentLeader: highBidder,
    });
  };

  const handlePlayCard = async (card) => {
    if (!isMyTurn) return;
    if (!isPlayable(card)) return;
    playSound('card_play');
    clearInterval(timerRef.current);
    const newHand = myHand.filter(c => !(c.suit === card.suit && c.rank === card.rank));
    const newTrick = [...currentTrick, { uid: myUid, card }];

    if (newTrick.length < players.length) {
      // not all played yet
      const playerOrder = players.map(p => p.uid);
      const myPos = playerOrder.indexOf(myUid);
      const nextLeader = playerOrder[(myPos + 1) % playerOrder.length];
      await updateRoom({
        [`hands.${myUid}`]: newHand,
        currentTrick: newTrick,
        currentLeader: nextLeader,
      });
    } else {
      // trick complete — determine winner
      const winnerUid = determineTrickWinner(newTrick, hokm);
      // update team tricks
      const winnerIdx = players.findIndex(p => p.uid === winnerUid);
      const winnerSeat = (winnerIdx - myIdx + players.length) % players.length;
      const winTeam = (winnerSeat === 0 || winnerSeat === 2) ? 'a' : 'b'; // seat 0=me, 2=top = team A
      const newTeamTricks = { ...teamTricks, [winTeam]: (teamTricks[winTeam] || 0) + 1 };

      const totalTricks = 9; // 36 ورقة ÷ 4 لاعبين
      const tricksPlayed = newTeamTricks.a + newTeamTricks.b;
      const tricksLeft   = totalTricks - tricksPlayed;

      // تحديد فريق المزايد
      const bidderIdx  = players.findIndex(p => p.uid === highBidder);
      const bidderSeat = (bidderIdx - myIdx + players.length) % players.length;
      const bidTeam    = (bidderSeat === 0 || bidderSeat === 2) ? 'a' : 'b';

      const bidTeamTricks = newTeamTricks[bidTeam];

      // حالة 1: اكتملت كل الحيل
      const allTricksDone   = tricksPlayed === totalTricks;
      // حالة 2: فريق المزايد وصل للبيد مبكراً
      const bidderReachedBid = bidTeamTricks >= highBid;
      // حالة 3: الفريق الآخر جمع ما يكفي لإسقاط المزايد حتى لو كسب كل الباقي
      const bidderCannotWin  = bidTeamTricks + tricksLeft < highBid;

      const roundDone = allTricksDone || bidderReachedBid || bidderCannotWin;

      await updateRoom({
        [`hands.${myUid}`]: newHand,
        currentTrick: newTrick,
        trickWinner: winnerUid,
        teamTricks: newTeamTricks,
        currentLeader: winnerUid,
        phase: roundDone ? 'roundEnd' : 'playing',
      });
    }
    setSelectedCard(null);
  };

  const handleNextRound = async () => {
    // calculate scores
    const bidNum = highBid;

    // تحديد فريق المزايد بناءً على highBidder
    const bidderIdx  = players.findIndex(p => p.uid === highBidder);
    const bidderSeat = (bidderIdx - myIdx + players.length) % players.length;
    const bidTeam    = (bidderSeat === 0 || bidderSeat === 2) ? 'a' : 'b';
    const otherTeam  = bidTeam === 'a' ? 'b' : 'a';

    const bidTeamTricks = teamTricks[bidTeam];
    const bidTeamWon    = bidTeamTricks >= bidNum;

    // المزايد فاز → يكسب bidNum، خسر → الآخر يكسب bidNum×2 (أو bidNum إن ملزوم)
    const ptsForWinner = bidNum;
    const ptsForLoser  = isMalzoom ? bidNum : bidNum * 2;

    const newScores = {
      [bidTeam]:   teamScores[bidTeam]   + (bidTeamWon ? ptsForWinner : 0),
      [otherTeam]: teamScores[otherTeam] + (bidTeamWon ? 0 : ptsForLoser),
    };

    const gameOver = newScores.a >= 51 || newScores.b >= 51;

    if (gameOver) {
      await updateRoom({ teamScores: newScores, phase: 'gameOver' });
      return;
    }

    // next round
    const newLeader = players[(round) % players.length]?.uid;
    await updateRoom({
      teamScores: newScores,
      teamTricks: { a: 0, b: 0 },
      bids: {}, highBid: 0, highBidder: null, hokm: null, isMalzoom: false,
      currentTrick: [], trickWinner: null,
      currentLeader: null, currentBidder: newLeader,
      round: round + 1, phase: 'bidding',
    });
    setShowRoundResult(false);
  };

  /* ── LOBBY: player1 deals when game starts ── */
  useEffect(() => {
    if (isPlayer1 && roomData?.phase === 'lobby' && roomData?.players?.length >= 2) {
      const deck = shuffleDeck(buildDeck4());
      const N = roomData.players.length;
      const hands = {};
      roomData.players.forEach((p, i) => {
        hands[p.uid] = sortHand(deck.slice(i * 9, (i + 1) * 9));
      });
      const firstBidder = roomData.players[0]?.uid;
      updateRoom({
        hands, phase: 'bidding',
        currentBidder: firstBidder, highBid: 0, highBidder: null,
        bids: {}, currentTrick: [], teamTricks: { a: 0, b: 0 },
        teamScores: roomData.teamScores || { a: 0, b: 0 },
        hokm: null, trickWinner: null, round: 1,
      });
    }
  }, [roomData?.phase, roomData?.players?.length]);

  /* ── Team names ── */
  const teamAName = `${myName} و${topP?.name || '…'}`;
  const teamBName = `${leftP?.name || '…'} و${rightP?.name || '…'}`;

  /* ── Trick cards: each rendered horizontally, no player label ── */
  // Map uid → seat position to know rotation
  const uidToSeat = (uid) => {
    const idx = players.findIndex(p => p.uid === uid);
    if (idx < 0) return 0;
    return (idx - myIdx + players.length) % players.length;
    // 0=me(bottom), 1=left, 2=top, 3=right (clockwise from me)
  };

  const trickRotations = { 0: '0deg', 1: '90deg', 2: '180deg', 3: '-90deg' };

  /* ── error / loading ── */
  // ── شاشة اختيار الوضع ──
  if (!selectedMode) {
    return (
      <OnlineRoomSetup
        gameEmoji="🂡"
        gameTitleAr="كوت"
        gameTitleEn="Kout"
        descAr="لعبة الكوت — 4 لاعبين فريقان"
        descEn="Kout card game — 4 players 2 teams"
        onBack={onBack}
        onSelect={handleModeSelect}
      />
    );
  }

  if (selectedMode === 'create' && loading) {
    return (
      <OnlineWaitingLobby
        friendCode={friendCode}
        isFriend={true}
        isRTL={isRTL}
        theme={theme}
        gameEmoji="🂡"
        gameLabel="كوت بو ٦"
        currentUser={currentUser}
        onCancel={() => { leaveRoom?.(); onBack(); }}
      />
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center' }]}>
        <StatusBar barStyle={theme.statusBar} />
        <Text style={{ color: '#ef4444', fontSize: 14 }}>❌ {error}</Text>
        <TouchableOpacity onPress={onBack} style={[styles.bidConfirm, { marginTop: 16 }]}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>رجوع</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading || !roomId) {
    return (
      <View style={[styles.container, { backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center' }]}>
        <StatusBar barStyle={theme.statusBar} />
        <Text style={{ color: theme.textPrimary, fontSize: 14 }}>جاري الاتصال...</Text>
      </View>
    );
  }

  /* ══════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════ */
  return (
    <View style={[styles.container, { backgroundColor: 'transparent' }]}>
      <StatusBar barStyle={theme.statusBar} backgroundColor="transparent" translucent />

      {/* ══ HEADER ══ */}
      <View style={styles.header}>
        {/* exit + web top-left */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <ExitButton onPress={() => { leaveRoom(); onBack(); }} />
          <GameInfoButton gameType="kout" lang={lang} />
          <WebScreenButton
            playerUid={myUid}
            playerName={myName}
            gameType="kout"
            gameRoomId={roomId || ''}
            getPublicData={() => ({ teamScores, round })}
            themeName={themeId || 'dark'}
          />
        </View>

        {/* score track center */}
        <View style={styles.scoreTrack}>
          <View style={{ alignItems: 'flex-end', minWidth: 50 }}>
            <Text style={[styles.teamPts, { color: '#3b9eff' }]}>{teamScores.a}</Text>
            <Text style={[styles.teamName, { color: '#3b9eff' }]} numberOfLines={1}>{teamAName}</Text>
          </View>

          <View style={{ alignItems: 'center', gap: 3, paddingHorizontal: 8 }}>
            <LamasDots
              bid={highBid || 0}
              teamATricks={teamTricks.a}
              teamBTricks={teamTricks.b}
              maxTricks={9}
            />
            {hokm && (
              <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>
                {highBid} {SUITS[hokm]} حكم
              </Text>
            )}
          </View>

          <View style={{ alignItems: 'flex-start', minWidth: 50 }}>
            <Text style={[styles.teamPts, { color: '#ff7043' }]}>{teamScores.b}</Text>
            <Text style={[styles.teamName, { color: '#ff7043' }]} numberOfLines={1}>{teamBName}</Text>
          </View>
        </View>

        <View style={{ width: 34 }} />
      </View>

      {/* ══ GAME AREA ══ */}
      <View style={styles.gameArea}>

        {/* ── TOP PLAYER (seat 2 = across) ── */}
        {topP && (
          <View style={styles.playerTop}>
            {hokm && highBidder === topP.uid && (
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 4,
                backgroundColor: 'rgba(201,146,42,0.2)',
                borderWidth: 1, borderColor: 'rgba(201,146,42,0.6)',
                borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3,
                marginBottom: 2,
              }}>
                <Text style={{ fontSize: 14, color: SUIT_COLOR[hokm] }}>{SUITS[hokm]}</Text>
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#f5c842' }}>{highBid}</Text>
                <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.55)', fontWeight: '600' }}>حكم</Text>
              </View>
            )}
            <PlayerLabel styles={styles}              name={topP.name}
              isActive={currentLeader === topP.uid || currentBidder === topP.uid}
              showTimer={currentLeader === topP.uid || currentBidder === topP.uid}
              timerPct={timerPct}
              isBot={topP.isBot}
              side="top"
            />
            <View style={{ transform: [{ rotate: '180deg' }] }}>
              <FaceDownStack
                count={Math.min(topP.cardCount ?? 9, 9)}
                direction="horizontal"
              />
            </View>
          </View>
        )}

        {/* ── LEFT PLAYER (seat 1) ── */}
        {leftP && (
          <View style={styles.playerLeft}>
            {hokm && highBidder === leftP.uid && (
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 4,
                backgroundColor: 'rgba(201,146,42,0.2)',
                borderWidth: 1, borderColor: 'rgba(201,146,42,0.6)',
                borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3,
                marginBottom: 2,
              }}>
                <Text style={{ fontSize: 14, color: SUIT_COLOR[hokm] }}>{SUITS[hokm]}</Text>
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#f5c842' }}>{highBid}</Text>
                <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.55)', fontWeight: '600' }}>حكم</Text>
              </View>
            )}
            <PlayerLabel styles={styles}              name={leftP.name}
              isActive={currentLeader === leftP.uid || currentBidder === leftP.uid}
              showTimer={currentLeader === leftP.uid || currentBidder === leftP.uid}
              timerPct={timerPct}
              isBot={leftP.isBot}
              side="left"
            />
            <View style={{ transform: [{ rotate: '90deg' }] }}>
              <FaceDownStack
                count={Math.min(leftP.cardCount ?? 9, 9)}
                direction="horizontal"
              />
            </View>
          </View>
        )}

        {/* ── RIGHT PLAYER (seat 3) ── */}
        {rightP && (
          <View style={styles.playerRight}>
            {hokm && highBidder === rightP.uid && (
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 4,
                backgroundColor: 'rgba(201,146,42,0.2)',
                borderWidth: 1, borderColor: 'rgba(201,146,42,0.6)',
                borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3,
                marginBottom: 2,
              }}>
                <Text style={{ fontSize: 14, color: SUIT_COLOR[hokm] }}>{SUITS[hokm]}</Text>
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#f5c842' }}>{highBid}</Text>
                <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.55)', fontWeight: '600' }}>حكم</Text>
              </View>
            )}
            <PlayerLabel styles={styles}              name={rightP.name}
              isActive={currentLeader === rightP.uid || currentBidder === rightP.uid}
              showTimer={currentLeader === rightP.uid || currentBidder === rightP.uid}
              timerPct={timerPct}
              isBot={rightP.isBot}
              side="right"
            />
            <View style={{ transform: [{ rotate: '-90deg' }] }}>
              <FaceDownStack
                count={Math.min(rightP.cardCount ?? 9, 9)}
                direction="horizontal"
              />
            </View>
          </View>
        )}

        {/* ── طاولة اللعب البلورية ── */}
        <CrystalTable style={styles.crystalTable} />

        {/* ── TRICK AREA CENTER ── */}
        {/* All 4 trick cards displayed horizontally (no rotation) arranged in 2x2 grid */}
        <View style={[styles.trickArea, {
          shadowColor: theme.accent || '#f5c518',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.25,
          shadowRadius: 18,
          elevation: 8,
        }]}>
          {/* Trick winner label — above the cards */}
          {trickWinner && (
            <View style={{
              position: 'absolute',
              top: -28,
              left: 0, right: 0,
              alignItems: 'center',
              zIndex: 20,
            }}>
              <View style={{
                backgroundColor: 'rgba(74,222,128,0.22)',
                borderWidth: 1, borderColor: '#4ade80',
                borderRadius: 10,
                paddingHorizontal: 12, paddingVertical: 3,
              }}>
                <Text style={{ color: '#4ade80', fontSize: 11, fontWeight: '800' }}>
                  ✓ {players.find(p => p.uid === trickWinner)?.name || ''} يفوز!
                </Text>
              </View>
            </View>
          )}
          {/* We position cards in the 4 quadrants, all readable (0deg rotation) */}
          {/* Quadrant: top-right=top player, top-left=right player, bottom-right=left player, bottom-left=me */}
          {/* Matches screenshot: top center + left + right + center bottom */}
          {/* Use a radial layout: top, left, right, bottom */}
          {[
            { seat: 2, style: styles.trickTop },    // top player
            { seat: 1, style: styles.trickLeft },   // left player
            { seat: 3, style: styles.trickRight },  // right player
            { seat: 0, style: styles.trickBottom }, // me
          ].map(({ seat, style: pos }) => {
            const entry = currentTrick.find(t => {
              const s = uidToSeat(t.uid);
              return s === seat;
            });
            const isWinner = trickWinner && entry && entry.uid === trickWinner;
            return (
              <View key={seat} style={pos}>
                {entry ? (
                  <PlayingCard
                    card={{ ...entry.card, isHokm: entry.card.suit === hokm }}
                    winning={isWinner}
                    width={TRICK_W}
                    height={TRICK_H}
                  />
                ) : (
                  <View style={styles.trickSlotEmpty} />
                )}
              </View>
            );
          })}
        </View>

      </View>

      {/* ══ MY HAND AREA (bottom) ══ */}
      <View style={styles.handArea}>
        {/* my info row */}
        <View style={styles.myInfoRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ position: 'relative' }}>
              <View style={[styles.avatar, {
                borderColor: isMyTurn ? '#f5c842' : 'rgba(255,255,255,0.2)',
                width: 34, height: 34, borderRadius: 17,
              }]}>
                <Text style={{ fontSize: 14 }}>👤</Text>
              </View>
              <View style={[styles.onlineDot, { borderColor: '#0a2e18' }]} />
            </View>
            <View>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#fff' }}>{myName}</Text>
              <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>
                الفريق: <Text style={{ color: '#3b9eff' }}>أزرق</Text>
              </Text>
            </View>
            {hokm && highBidder === myUid && (
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 4,
                backgroundColor: 'rgba(201,146,42,0.2)',
                borderWidth: 1, borderColor: 'rgba(201,146,42,0.6)',
                borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3,
              }}>
                <Text style={{ fontSize: 14, color: SUIT_COLOR[hokm] }}>{SUITS[hokm]}</Text>
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#f5c842' }}>{highBid}</Text>
                <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.55)', fontWeight: '600' }}>حكم</Text>
              </View>
            )}
          </View>
          {isMyTurn && (
            <Text style={styles.turnInd}>▲ دورك!</Text>
          )}
          {isMyBidTurn && (
            <Text style={styles.turnInd}>🤝 زايد!</Text>
          )}
        </View>

        {/* play button above hand — only when a card is selected */}
        {selectedCard && (
          <TouchableOpacity
            style={styles.playAboveBtn}
            onPress={() => handlePlayCard(selectedCard)}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>▶ العب الورقة</Text>
          </TouchableOpacity>
        )}

        {/* my turn timer */}
        {(isMyTurn || isMyBidTurn || isMyHokmTurn) && (
          <View style={styles.myTimerWrap}>
            <View style={[styles.myTimerFill, {
              width: `${timerPct}%`,
              backgroundColor: timerPct > 50 ? '#4ade80' : timerPct > 22 ? '#f59e0b' : '#ef4444',
            }]} />
          </View>
        )}

        {/* hand cards — overlapping fan */}
        <View style={styles.handRow}>
          {myHand.map((card, i) => {
            const playable = phase === 'playing' && isMyTurn ? isPlayable(card) : true;
            const isSel = selectedCard && selectedCard.suit === card.suit && selectedCard.rank === card.rank;
            return (
              <PlayingCard
                key={`${card.suit}-${card.rank}`}
                card={{ ...card, isHokm: card.suit === hokm }}
                selected={isSel}
                disabled={phase === 'playing' && isMyTurn && !playable}
                style={{
                  marginRight: i < myHand.length - 1 ? CARD_OVERLAP : 0,
                  zIndex: isSel ? 50 : i,
                }}
                onPress={() => {
                  if (phase !== 'playing' || !isMyTurn) return;
                  if (!playable) return;
                  setSelectedCard(isSel ? null : card);
                }}
              />
            );
          })}
        </View>
      </View>

      {/* ══ BID MODAL ══ */}
      <BidModal styles={styles}        visible={isMyBidTurn && phase === 'bidding'}
        currentHighBid={highBid}
        isMalzoom={isMalzoom}
        timerPct={timerPct}
        onBid={handleBid}
        onPass={() => handleBid(null, false)}
      />

      {/* ══ HOKM MODAL ══ */}
      <HokmModal styles={styles}        visible={isMyHokmTurn && phase === 'hokmChoice'}
        hand={myHand}
        timerPct={timerPct}
        onChoose={handleChooseHokm}
      />

      {/* ══ ROUND RESULT ══ */}
      <RoundResultModal styles={styles}        visible={showRoundResult}
        teamA={{ name: teamAName, tricks: teamTricks.a, total: teamScores.a }}
        teamB={{ name: teamBName, tricks: teamTricks.b, total: teamScores.b }}
        bid={highBid}
        hokmSuit={hokm || 'spades'}
        isMalzoom={isMalzoom}
        onNext={handleNextRound}
      />

      {/* ══ GAME OVER ══ */}
      <GameOverModal styles={styles}        visible={showGameOver}
        teamA={{ name: teamAName, total: teamScores.a }}
        teamB={{ name: teamBName, total: teamScores.b }}
        onNewGame={() => { setShowGameOver(false); updateRoom({ phase: 'lobby', teamScores: { a: 0, b: 0 }, round: 1 }); }}
        onExit={() => { leaveRoom(); onBack(); }}
      />
    </View>
  );
}

/* ═══════════════════════════════════════════════
   STYLES
═══════════════════════════════════════════════ */
function makeStyles(W, H) { return StyleSheet.create({
  container: {
    flex: 1,
  },

  /* ── HEADER ── */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 50 : 36,
    paddingHorizontal: 12,
    paddingBottom: 8,
    backgroundColor: 'rgba(0,0,0,0.40)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    zIndex: 50,
  },
  exitBtn: {
    width: 34, height: 34,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  scoreTrack: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  teamPts: {
    fontSize: 20, fontWeight: '900', lineHeight: 22,
  },
  teamName: {
    fontSize: 9, fontWeight: '600', maxWidth: 80,
  },

  /* ── GAME AREA ── */
  gameArea: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },

  /* ── طاولة بلورية ── */
  crystalTable: {
    position: 'absolute',
    top: '22%',
    left: W * 0.08,
    right: W * 0.08,
    height: H * 0.40,
    zIndex: 2,
  },

  /* ── TOP PLAYER ── */
  playerTop: {
    position: 'absolute',
    top: 8,
    left: 0, right: 0,
    alignItems: 'center',
    gap: 6,
    zIndex: 15,
  },

  /* ── LEFT PLAYER ── */
  playerLeft: {
    position: 'absolute',
    left: 6,
    top: '30%',
    alignItems: 'flex-start',
    gap: 6,
    zIndex: 15,
  },

  /* ── RIGHT PLAYER ── */
  playerRight: {
    position: 'absolute',
    right: 6,
    top: '30%',
    alignItems: 'flex-end',
    gap: 6,
    zIndex: 15,
  },

  /* ── TRICK AREA ── */
  trickArea: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 180,
    height: 200,
    marginLeft: -90,
    marginTop: -110,
    zIndex: 5,
  },
  // all cards rendered horizontally (0deg) as requested
  trickTop: {
    position: 'absolute',
    top: 0,
    left: '50%',
    marginLeft: -(TRICK_W / 2),
  },
  trickLeft: {
    position: 'absolute',
    top: '50%',
    left: 0,
    marginTop: -(TRICK_H / 2),
  },
  trickRight: {
    position: 'absolute',
    top: '50%',
    right: 0,
    marginTop: -(TRICK_H / 2),
  },
  trickBottom: {
    position: 'absolute',
    bottom: 0,
    left: '50%',
    marginLeft: -(TRICK_W / 2),
  },
  trickSlotEmpty: {
    width: TRICK_W, height: TRICK_H,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderStyle: 'dashed',
  },

  /* ── MY HAND ── */
  handArea: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.07)',
    paddingTop: 8,
    paddingHorizontal: 8,
    paddingBottom: Platform.OS === 'ios' ? 22 : 12,
    zIndex: 20,
  },
  myInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  myTimerWrap: {
    width: '100%', height: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 2, overflow: 'hidden',
    marginBottom: 6,
  },
  myTimerFill: {
    height: '100%', borderRadius: 2,
  },
  handRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingTop: 4,
    paddingBottom: 2,
    overflow: 'visible',
  },
  playAboveBtn: {
    alignSelf: 'center',
    backgroundColor: '#d97706',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 18,
    marginBottom: 6,
    shadowColor: '#f59e0b',
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  turnInd: {
    fontSize: 11, fontWeight: '700', color: '#4ade80',
  },

  /* ── PLAYER LABEL (shared with Domino style) ── */
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(30,58,90,0.9)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2,
  },
  onlineDot: {
    position: 'absolute', bottom: 1, right: 1,
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: '#2ecc71',
    borderWidth: 2, borderColor: '#091910',
  },
  nameTag: {
    backgroundColor: 'rgba(0,0,0,0.42)',
    paddingHorizontal: 9, paddingVertical: 3,
    borderRadius: 9,
  },
  nameTagActive: {
    backgroundColor: 'rgba(245,200,66,0.18)',
    borderWidth: 1, borderColor: 'rgba(245,200,66,0.3)',
  },
  nameText: {
    fontSize: 11, fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
    maxWidth: 80,
  },
  timerBar: {
    width: 70, height: 4,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 2, overflow: 'hidden',
  },
  timerFill: { height: '100%', borderRadius: 2 },

  /* ── MODALS ── */
  bidOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center', justifyContent: 'center',
  },
  bidModal: {
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.13)',
    borderRadius: 22,
    padding: 20, width: W - 48,
  },
  bidTitle: {
    fontSize: 16, fontWeight: '900', color: '#fff',
    textAlign: 'center', marginBottom: 6,
  },
  bidSub: {
    fontSize: 11, color: 'rgba(255,255,255,0.45)',
    textAlign: 'center', marginBottom: 12,
  },
  bidTimerWrap: {
    width: '100%', height: 3,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2, overflow: 'hidden',
    marginBottom: 16,
  },
  bidTimerFill: { height: '100%', borderRadius: 2 },
  bidGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    justifyContent: 'center', gap: 9,
    marginBottom: 16,
  },
  bidBtn: {
    width: 58, height: 64,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
  },
  bidBtnDisabled: { opacity: 0.3 },
  bidBtnNum: {
    fontSize: 24, fontWeight: '900', color: '#fff', lineHeight: 28,
  },
  bidBtnLabel: {
    fontSize: 8, color: 'rgba(255,255,255,0.5)', fontWeight: '600',
  },
  bidConfirm: {
    backgroundColor: '#d97706',
    borderRadius: 13, paddingVertical: 12,
    alignItems: 'center',
  },
  hokmSuit: {
    width: 120, height: 72,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  hokmSuitSel: {
    borderColor: '#f59e0b',
    backgroundColor: 'rgba(245,158,11,0.12)',
  },
  resultCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderRadius: 14, padding: 12,
  },
  resLbl: { fontSize: 9, color: 'rgba(255,255,255,0.4)', fontWeight: '600', marginBottom: 3 },
  resVal: { fontSize: 18, fontWeight: '900', color: '#fff' },
  totalChip: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderRadius: 12,
    paddingVertical: 10, paddingHorizontal: 18,
    alignItems: 'center',
  },
  outlineBtn: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 13, paddingVertical: 12, paddingHorizontal: 18,
    alignItems: 'center',
  },
});
}

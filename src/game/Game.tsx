import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, Platform, Pressable, StyleSheet, Text, View, type LayoutRectangle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, ClipPath, Defs, G, LinearGradient, Path, Polygon, RadialGradient, Rect, Stop } from 'react-native-svg';
import { BedroomArt, BedroomNight, HIDDEN, SCENE_H, SCENE_W } from '../scenes/bedroom';
import { C, font } from '../theme';
import { Burst, Confetti, FlyItem } from './effects';
import { Tray, type TrayHandle } from './Tray';

type ViewRef = React.ComponentRef<typeof View>;
const ND = Platform.OS !== 'web';
const SPOT_R = 52;
const DWELL = 0.65; // seconds the light must rest on an object
const PIVOT = { x: SCENE_W / 2, y: SCENE_H - 6 };
const TORCH_LEN = 50;
const HINT_AFTER = 12000;
const FILL_MS = 900;
const FINALE_MS = 1600;

type Phase = 'intro' | 'play' | 'done';
type Pt = { x: number; y: number };
type Fly = { key: number; idx: number; from: Pt; to: Pt; toSize: number };

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
const easeOutBack = (t: number) => 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2);
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

function haptic(kind: 'found' | 'done') {
  if (Platform.OS === 'web') return;
  const p = kind === 'done'
    ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  p.catch(() => {});
}

function freshState() {
  return {
    phase: 'intro' as Phase,
    spot: { x: SCENE_W / 2, y: 330 },
    tgt: { x: SCENE_W / 2, y: 330 },
    dwellIdx: -1,
    dwell: 0,
    found: new Set<number>(),
    fillStart: new Map<number, number>(),
    finaleStart: 0,
    finaleCenter: { x: SCENE_W / 2, y: 320 },
    lastActive: 0,
    hintIdx: -1,
    hintStart: 0,
  };
}

type Snap = {
  t: number; spot: Pt; dwellIdx: number; dwell: number; fills: [number, number][];
  finaleStart: number; finaleCenter: Pt; hintIdx: number; hintStart: number;
};
type GameState = ReturnType<typeof freshState>;
const snapOf = (s: GameState, t: number): Snap => ({
  t, spot: { ...s.spot }, dwellIdx: s.dwellIdx, dwell: s.dwell, fills: [...s.fillStart.entries()],
  finaleStart: s.finaleStart, finaleCenter: { ...s.finaleCenter }, hintIdx: s.hintIdx, hintStart: s.hintStart,
});

export default function Game() {
  const insets = useSafeAreaInsets();
  const g = useRef<GameState>(freshState());
  // Render-only copy of the mutable game state, refreshed by the frame loop.
  const [snap, setSnap] = useState<Snap>(() => snapOf(freshState(), 0));
  const [phase, setPhase] = useState<Phase>('intro');
  const [filled, setFilled] = useState<Set<number>>(new Set());
  const [flies, setFlies] = useState<Fly[]>([]);
  const [bursts, setBursts] = useState<{ key: number; at: Pt }[]>([]);
  const [toast, setToast] = useState<{ key: number; text: string } | null>(null);
  const [showFinale, setShowFinale] = useState(false);
  const [area, setArea] = useState<LayoutRectangle | null>(null);
  const [col, setCol] = useState<LayoutRectangle | null>(null);

  const colRef = useRef<ViewRef>(null);
  const sceneRef = useRef<ViewRef>(null);
  const trayRef = useRef<TrayHandle>(null);
  const box = useRef({ x: 0, y: 0, scale: 1, offX: 0, offY: 0 }); // scene origin (window + column coords)
  const keySeq = useRef(0);

  const scale = area ? Math.min((area.width - 24) / SCENE_W, area.height / SCENE_H) : 0;
  useEffect(() => {
    if (!area) return;
    box.current.scale = scale;
    box.current.offX = area.x + (area.width - SCENE_W * scale) / 2;
    box.current.offY = area.y + (area.height - SCENE_H * scale) / 2;
  }, [area, scale]);

  const measure = useCallback(() => {
    sceneRef.current?.measureInWindow((x, y) => {
      box.current.x = x;
      box.current.y = y;
    });
  }, []);

  const aim = useCallback((px: number, py: number) => {
    const s = g.current;
    if (s.phase !== 'play') return;
    const b = box.current;
    s.tgt.x = Math.max(0, Math.min(SCENE_W, (px - b.x) / b.scale));
    s.tgt.y = Math.max(0, Math.min(SCENE_H - 20, (py - b.y) / b.scale));
    s.lastActive = now();
  }, []);

  const pan = useMemo(
    // Handlers only touch refs when a gesture fires, never during render.
    // eslint-disable-next-line react-hooks/refs
    () => PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        measure();
        aim(e.nativeEvent.pageX, e.nativeEvent.pageY);
      },
      onPanResponderMove: (e) => aim(e.nativeEvent.pageX, e.nativeEvent.pageY),
    }),
    [aim, measure],
  );

  // ---- found ----
  const onFound = (idx: number) => {
    const s = g.current;
    const h = HIDDEN[idx];
    s.found.add(idx);
    s.fillStart.set(idx, now());
    s.hintIdx = -1;
    s.lastActive = now();
    haptic('found');
    const k = ++keySeq.current;
    setToast({ key: k, text: h.foundText });
    const b = box.current;
    const from = { x: b.offX + h.x * b.scale, y: b.offY + h.y * b.scale };
    setBursts((b) => [...b, { key: k, at: from }]);
    trayRef.current?.slotCenter(idx, (to) => setFlies((f) => [...f, { key: k, idx, from, to, toSize: to.size }]));
  };

  // Lights come back on once the last object has landed in the tray.
  useEffect(() => {
    if (filled.size !== HIDDEN.length || g.current.phase !== 'play') return;
    const s = g.current;
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => {
      s.phase = 'done';
      s.finaleStart = now();
      s.finaleCenter = { ...s.spot };
      setPhase('done');
      haptic('done');
      timers.push(setTimeout(() => setShowFinale(true), FINALE_MS - 200));
    }, 500));
    return () => timers.forEach(clearTimeout);
  }, [filled]);
  const onFoundRef = useRef(onFound);

  const startHint = () => {
    const s = g.current;
    let best = -1, bd = Infinity;
    HIDDEN.forEach((h, i) => {
      if (s.found.has(i)) return;
      const d = dist(h, s.spot);
      if (d < bd) { bd = d; best = i; }
    });
    s.hintIdx = best;
    s.hintStart = now();
    s.lastActive = now();
  };
  const startHintRef = useRef(startHint);
  useEffect(() => {
    onFoundRef.current = onFound;
    startHintRef.current = startHint;
  });

  // ---- frame loop ----
  useEffect(() => {
    let raf = 0;
    let last = now();
    const tick = () => {
      const t = now();
      const dt = Math.min(0.25, (t - last) / 1000);
      last = t;
      const s = g.current;
      let dirty = false;
      const k = Math.min(1, dt * 11);
      const dx = s.tgt.x - s.spot.x, dy = s.tgt.y - s.spot.y;
      if (Math.abs(dx) + Math.abs(dy) > 0.1) {
        s.spot.x += dx * k;
        s.spot.y += dy * k;
        dirty = true;
      }
      if (s.phase === 'play') {
        const idx = HIDDEN.findIndex((h, i) => !s.found.has(i) && dist(s.spot, h) < h.r);
        if (idx !== s.dwellIdx) { s.dwellIdx = idx; s.dwell = 0; dirty = true; }
        if (idx >= 0) {
          s.dwell += dt;
          dirty = true;
          if (s.dwell >= DWELL) { s.dwellIdx = -1; s.dwell = 0; onFoundRef.current(idx); }
        }
        if (s.hintIdx < 0 && t - s.lastActive > HINT_AFTER) startHintRef.current();
      }
      for (const st of s.fillStart.values()) if (t - st < FILL_MS + 50) dirty = true;
      if (s.finaleStart && t - s.finaleStart < FINALE_MS + 50) dirty = true;
      if (s.hintIdx >= 0) {
        dirty = true;
        if (t - s.hintStart > 3000) s.hintIdx = -1;
      }
      if (dirty) setSnap(snapOf(s, t));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const start = () => {
    const s = g.current;
    s.phase = 'play';
    s.lastActive = now();
    s.tgt = { x: SCENE_W / 2, y: 300 };
    setPhase('play');
    measure();
  };

  const restart = () => {
    g.current = freshState();
    setSnap(snapOf(g.current, 0));
    setFilled(new Set());
    setFlies([]);
    setBursts([]);
    setToast(null);
    setShowFinale(false);
    setPhase('intro');
  };

  // ---- derived drawing values ----
  const s = snap;
  const t = snap.t;
  const sp = s.spot;
  const angle = Math.atan2(sp.y - PIVOT.y, sp.x - PIVOT.x);
  const deg = (angle * 180) / Math.PI;
  const tip = { x: PIVOT.x + Math.cos(angle) * TORCH_LEN, y: PIVOT.y + Math.sin(angle) * TORCH_LEN };
  const bl = Math.hypot(sp.x - tip.x, sp.y - tip.y) || 1;
  const n = { x: -(sp.y - tip.y) / bl, y: (sp.x - tip.x) / bl };
  const cone = [
    [tip.x + n.x * 6, tip.y + n.y * 6], [sp.x + n.x * SPOT_R, sp.y + n.y * SPOT_R],
    [sp.x - n.x * SPOT_R, sp.y - n.y * SPOT_R], [tip.x - n.x * 6, tip.y - n.y * 6],
  ].map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' ');
  const finaleP = s.finaleStart ? Math.min(1, (t - s.finaleStart) / FINALE_MS) : 0;
  const lightsOn = easeInOut(finaleP);
  const playing = phase !== 'intro';
  const dwellH = s.dwellIdx >= 0 ? HIDDEN[s.dwellIdx] : null;
  const dwellP = Math.min(1, s.dwell / DWELL);
  const hintH = s.hintIdx >= 0 ? HIDDEN[s.hintIdx] : null;
  const hintPulse = (Math.sin((t - s.hintStart) / 140) + 1) / 2;

  return (
    <View style={styles.root}>
      <View
        ref={colRef}
        style={[styles.col, { paddingTop: insets.top + 8, paddingBottom: Math.max(insets.bottom, 12) }]}
        onLayout={(e) => setCol(e.nativeEvent.layout)}>
        {/* header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.kicker}>FENER AVI</Text>
            <Text style={styles.title}>Yatak odası</Text>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.counter}>
              <Svg width={18} height={18} viewBox="-10 -10 20 20">
                <Path d="M0 -9 L2.6 -3 L9 -2.6 L4 1.6 L5.6 8.4 L0 4.8 L-5.6 8.4 L-4 1.6 L-9 -2.6 L-2.6 -3 Z" fill={C.yellow} stroke={C.ink} strokeWidth={1.6} strokeLinejoin="round" />
              </Svg>
              <Text style={styles.counterTxt}>{filled.size} / {HIDDEN.length}</Text>
            </View>
            <Pressable accessibilityLabel="İpucu" onPress={() => phase === 'play' && startHint()} style={({ pressed }) => [styles.hintBtn, pressed && { transform: [{ scale: 0.92 }] }]}>
              <Svg width={22} height={22} viewBox="0 0 24 24">
                <Path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.4 1.1 2.2h5c0-.8.4-1.6 1.1-2.2A6 6 0 0 0 12 3Z" fill={C.yellow} stroke={C.ink} strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" />
              </Svg>
            </Pressable>
          </View>
        </View>

        {/* scene */}
        <View style={styles.sceneArea} onLayout={(e) => setArea(e.nativeEvent.layout)}>
          {scale > 0 && (
            <View
              ref={sceneRef}
              onLayout={measure}
              style={[styles.scene, { width: SCENE_W * scale, height: SCENE_H * scale }]}
              {...pan.panHandlers}
              {...(Platform.OS === 'web'
                ? {
                    onPointerEnter: measure,
                    onPointerMove: (e: any) => {
                      if (e.nativeEvent.pointerType === 'mouse') aim(e.nativeEvent.clientX ?? e.nativeEvent.pageX, e.nativeEvent.clientY ?? e.nativeEvent.pageY);
                    },
                  }
                : {})}>
              <Svg width={SCENE_W * scale} height={SCENE_H * scale} viewBox={`0 0 ${SCENE_W} ${SCENE_H}`}>
                <Defs>
                  <ClipPath id="reveal">
                    <Circle cx={sp.x} cy={sp.y} r={playing && !s.finaleStart ? SPOT_R : 0} />
                    {s.fills.map(([i, st]) => {
                      const p = Math.min(1, (t - st) / FILL_MS);
                      return <Circle key={i} cx={HIDDEN[i].x} cy={HIDDEN[i].y} r={Math.max(0, HIDDEN[i].fillR * easeOutBack(p))} />;
                    })}
                    <Circle cx={s.finaleCenter.x} cy={s.finaleCenter.y} r={lightsOn * 820} />
                  </ClipPath>
                  <LinearGradient id="beam" gradientUnits="userSpaceOnUse" x1={tip.x} y1={tip.y} x2={sp.x} y2={sp.y}>
                    <Stop offset="0" stopColor="#fff6cf" stopOpacity={0.75} />
                    <Stop offset="1" stopColor={C.glow} stopOpacity={0.12} />
                  </LinearGradient>
                  <RadialGradient id="spotGlow" cx="50%" cy="50%" r="50%">
                    <Stop offset="0" stopColor="#fff3c2" stopOpacity={0} />
                    <Stop offset="0.72" stopColor="#fff3c2" stopOpacity={0.05} />
                    <Stop offset="0.9" stopColor={C.glow} stopOpacity={0.45} />
                    <Stop offset="1" stopColor={C.glow} stopOpacity={0} />
                  </RadialGradient>
                  <RadialGradient id="tipGlow" cx="50%" cy="50%" r="50%">
                    <Stop offset="0" stopColor="#fffbe6" stopOpacity={1} />
                    <Stop offset="0.45" stopColor={C.glow} stopOpacity={0.6} />
                    <Stop offset="1" stopColor={C.glow} stopOpacity={0} />
                  </RadialGradient>
                </Defs>

                {/* dark room */}
                <BedroomArt />
                <Rect x={0} y={0} width={SCENE_W} height={SCENE_H} fill={C.night} opacity={0.95} />
                <BedroomNight />

                {/* coloured picture, shown through the torch + everything already found */}
                <G clipPath="url(#reveal)">
                  <BedroomArt />
                </G>

                {/* hint */}
                {hintH && (
                  <G opacity={0.35 + hintPulse * 0.65}>
                    <Circle cx={hintH.x} cy={hintH.y} r={hintH.r + 8 + hintPulse * 8} fill="none" stroke={C.glow} strokeWidth={3} strokeDasharray="6 8" />
                    <Path d={`M${hintH.x} ${hintH.y - hintH.r - 26} l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3 Z`} fill={C.glow} />
                  </G>
                )}

                {/* torch beam */}
                {playing && (
                  <G opacity={1 - lightsOn}>
                    <Polygon points={cone} fill="url(#beam)" />
                    <Circle cx={sp.x} cy={sp.y} r={SPOT_R + 6} fill="url(#spotGlow)" />
                    <Circle cx={tip.x} cy={tip.y} r={20} fill="url(#tipGlow)" />
                  </G>
                )}

                {/* dwell progress ring */}
                {dwellH && playing && (
                  <Circle
                    cx={dwellH.x} cy={dwellH.y} r={dwellH.r + 6} fill="none" stroke="#fff" strokeWidth={4} strokeLinecap="round"
                    strokeDasharray={`${(2 * Math.PI * (dwellH.r + 6) * dwellP).toFixed(1)} 999`}
                    transform={`rotate(-90 ${dwellH.x} ${dwellH.y})`}
                  />
                )}

                {/* the torch in the child's hand */}
                <G transform={`translate(${PIVOT.x} ${PIVOT.y}) rotate(${(playing ? deg : -90).toFixed(2)})`} opacity={1 - lightsOn * 0.4}>
                  <Rect x={4} y={-9} width={34} height={18} rx={4} fill={C.ink} stroke={C.ink} strokeWidth={2} />
                  <Rect x={14} y={-9} width={5} height={18} fill={C.yellow} />
                  <Path d="M38 -12 L52 -15 L52 15 L38 12 Z" fill={C.yellow} stroke={C.ink} strokeWidth={2.4} strokeLinejoin="round" />
                  <Circle cx={2} cy={0} r={13} fill="#fde4d3" stroke={C.ink} strokeWidth={2.4} />
                  <Path d="M-2 -8 C4 -10 10 -6 10 0" fill="none" stroke={C.ink} strokeWidth={1.8} strokeLinecap="round" />
                </G>
              </Svg>
            </View>
          )}
        </View>

        <Tray ref={trayRef} items={HIDDEN} filled={filled} container={() => colRef.current} />

        {/* overlays */}
        {toast && <Toast key={toast.key} text={toast.text} bottom={Math.max(insets.bottom, 12) + 104} />}
        {bursts.map((b) => (
          <Burst key={b.key} at={b.at} onDone={() => setBursts((x) => x.filter((y) => y.key !== b.key))} />
        ))}
        {flies.map((f) => (
          <FlyItem
            key={f.key} from={f.from} to={f.to} fromSize={60} toSize={f.toSize} Art={HIDDEN[f.idx].Art}
            onDone={() => {
              setFilled((prev) => new Set(prev).add(f.idx));
              setFlies((x) => x.filter((y) => y.key !== f.key));
            }}
          />
        ))}
        {phase === 'done' && col && <Confetti width={col.width} height={col.height} />}
        {phase === 'intro' && <IntroCard onStart={start} count={HIDDEN.length} />}
        {showFinale && <FinaleCard onAgain={restart} />}
      </View>
    </View>
  );
}

function Toast({ text, bottom }: { text: string; bottom: number }) {
  const v = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    Animated.sequence([
      Animated.spring(v, { toValue: 1, friction: 6, tension: 140, useNativeDriver: ND }),
      Animated.delay(1300),
      Animated.timing(v, { toValue: 0, duration: 260, useNativeDriver: ND }),
    ]).start();
  }, []);
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.toast, {
        bottom, opacity: v,
        transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }, { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }],
      }]}>
      <Text style={styles.toastTxt}>{text}</Text>
    </Animated.View>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  const v = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    Animated.spring(v, { toValue: 1, friction: 7, tension: 90, useNativeDriver: ND }).start();
  }, []);
  return (
    <Animated.View style={[styles.cardScrim, { opacity: v.interpolate({ inputRange: [0, 0.4], outputRange: [0, 1], extrapolate: 'clamp' }) }]}>
      <Animated.View style={[styles.card, { transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }, { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }] }]}>
        {children}
      </Animated.View>
    </Animated.View>
  );
}

function BigButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.btn, pressed && { transform: [{ translateY: 3 }], shadowOpacity: 0 }]}>
      <Text style={styles.btnTxt}>{label}</Text>
    </Pressable>
  );
}

function IntroCard({ onStart, count }: { onStart: () => void; count: number }) {
  const wob = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(wob, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: ND }),
      Animated.timing(wob, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: ND }),
    ])).start();
  }, []);
  return (
    <Card>
      <Animated.View style={{ transform: [{ rotate: wob.interpolate({ inputRange: [0, 1], outputRange: ['-10deg', '10deg'] }) }] }}>
        <Svg width={96} height={96} viewBox="-50 -50 100 100">
          <Circle cx={0} cy={-18} r={26} fill={C.glow} opacity={0.5} />
          <Rect x={-11} y={-10} width={22} height={40} rx={5} fill={C.ink} />
          <Rect x={-11} y={12} width={22} height={6} fill={C.yellow} />
          <Path d="M-15 -10 L-19 -28 L19 -28 L15 -10 Z" fill={C.yellow} stroke={C.ink} strokeWidth={3} strokeLinejoin="round" />
        </Svg>
      </Animated.View>
      <Text style={styles.cardTitle}>Işıklar söndü!</Text>
      <Text style={styles.cardText}>
        Odada {count} şey saklanıyor. Feneri parmağınla gezdir. Işık bir şeyin üstünde biraz durunca onu bulursun.
      </Text>
      <BigButton label="Haydi başla" onPress={onStart} />
    </Card>
  );
}

function FinaleCard({ onAgain }: { onAgain: () => void }) {
  return (
    <Card>
      <View style={{ flexDirection: 'row', gap: 6, marginBottom: 4 }}>
        {[0, 1, 2].map((i) => (
          <Svg key={i} width={i === 1 ? 54 : 42} height={i === 1 ? 54 : 42} viewBox="-10 -10 20 20" style={{ marginTop: i === 1 ? 0 : 10 }}>
            <Path d="M0 -9 L2.6 -3 L9 -2.6 L4 1.6 L5.6 8.4 L0 4.8 L-5.6 8.4 L-4 1.6 L-9 -2.6 L-2.6 -3 Z" fill={C.yellow} stroke={C.ink} strokeWidth={1.4} strokeLinejoin="round" />
          </Svg>
        ))}
      </View>
      <Text style={styles.cardTitle}>Harika!</Text>
      <Text style={styles.cardText}>Hepsini buldun, oda yeniden aydınlandı. Pamuk hâlâ uyuyor!</Text>
      <BigButton label="Tekrar oyna" onPress={onAgain} />
    </Card>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.nightDeep, alignItems: 'center' },
  col: { flex: 1, width: '100%', maxWidth: 440 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 10 },
  kicker: { fontFamily: font, color: C.glow, fontSize: 12, fontWeight: '800', letterSpacing: 1.6 },
  title: { fontFamily: font, color: '#fff', fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  counter: {
    flexDirection: 'row', alignItems: 'center', gap: 6, height: 40, paddingHorizontal: 14, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)',
  },
  counterTxt: { fontFamily: font, color: '#fff', fontSize: 17, fontWeight: '800', fontVariant: ['tabular-nums'] },
  hintBtn: {
    width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)',
  },
  sceneArea: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, marginBottom: 12 },
  scene: { borderRadius: 30, overflow: 'hidden', borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)' },
  toast: {
    position: 'absolute', alignSelf: 'center', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 22,
    backgroundColor: C.cream, borderWidth: 2.5, borderColor: C.ink,
  },
  toastTxt: { fontFamily: font, fontSize: 17, fontWeight: '800', color: C.ink },
  cardScrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(6,9,30,0.55)', alignItems: 'center', justifyContent: 'center', padding: 28 },
  card: {
    width: '100%', maxWidth: 340, alignItems: 'center', gap: 10, paddingHorizontal: 24, paddingTop: 22, paddingBottom: 24,
    borderRadius: 34, backgroundColor: C.cream, borderWidth: 3, borderColor: C.ink,
  },
  cardTitle: { fontFamily: font, fontSize: 30, fontWeight: '900', color: C.ink, letterSpacing: -0.6 },
  cardText: { fontFamily: font, fontSize: 17, lineHeight: 24, fontWeight: '600', color: '#4a4842', textAlign: 'center', marginBottom: 8 },
  btn: {
    alignSelf: 'stretch', height: 58, borderRadius: 29, backgroundColor: C.yellow, borderWidth: 3, borderColor: C.ink,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: C.ink, shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 0, height: 4 },
  },
  btnTxt: { fontFamily: font, fontSize: 20, fontWeight: '900', color: C.ink },
});

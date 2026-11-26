// One-shot animated overlays: object flying to the tray, sparkle burst, confetti.
import { useEffect, useMemo, useState, type ComponentType } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';
import type { ArtProps } from '../art/objects';
import { C } from '../theme';

const ND = Platform.OS !== 'web';

// Small seeded PRNG so particle layouts are deterministic (keeps render pure).
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
type Pt = { x: number; y: number };

export function FlyItem(props: {
  from: Pt; to: Pt; fromSize: number; toSize: number; Art: ComponentType<ArtProps>; onDone: () => void;
}) {
  const { from, to, fromSize, toSize, Art, onDone } = props;
  const pop = useState(() => new Animated.Value(0))[0];
  const fly = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    Animated.sequence([
      Animated.spring(pop, { toValue: 1, friction: 4, tension: 120, useNativeDriver: ND }),
      Animated.delay(160),
      Animated.timing(fly, { toValue: 1, duration: 620, easing: Easing.bezier(0.5, 0, 0.3, 1), useNativeDriver: ND }),
    ]).start(() => onDone());
  }, []);
  const popScale = pop.interpolate({ inputRange: [0, 1], outputRange: [1, 1.55] });
  const flyScale = fly.interpolate({ inputRange: [0, 1], outputRange: [1, toSize / fromSize / 1.55] });
  const tx = fly.interpolate({ inputRange: [0, 1], outputRange: [0, to.x - from.x] });
  // a little arc: rise first, then drop into the slot
  const ty = fly.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0, -40, to.y - from.y] });
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute', left: from.x - fromSize / 2, top: from.y - fromSize / 2, width: fromSize, height: fromSize,
        transform: [{ translateX: tx }, { translateY: ty }, { scale: Animated.multiply(popScale, flyScale) }],
      }}>
      <Svg width={fromSize} height={fromSize} viewBox="-30 -30 60 60">
        <Art />
      </Svg>
    </Animated.View>
  );
}

const STAR = 'M0 -10 L2.6 -2.6 L10 0 L2.6 2.6 L0 10 L-2.6 2.6 L-10 0 L-2.6 -2.6 Z';
const BURST_COLORS = [C.yellow, '#fff', C.pink, C.lightBlue, C.yellow];

export function Burst({ at, onDone }: { at: Pt; onDone: () => void }) {
  const v = useState(() => new Animated.Value(0))[0];
  const parts = useMemo(() => {
    const rand = rng(Math.round(at.x * 31 + at.y * 17));
    return Array.from({ length: 12 }, (_, i) => {
      const a = (i / 12) * Math.PI * 2 + rand() * 0.4;
      const d = 46 + rand() * 34;
      return { dx: Math.cos(a) * d, dy: Math.sin(a) * d, s: 0.6 + rand() * 0.7, c: BURST_COLORS[i % BURST_COLORS.length] };
    });
  }, [at.x, at.y]);
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 760, easing: Easing.out(Easing.cubic), useNativeDriver: ND }).start(() => onDone());
  }, []);
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: at.x, top: at.y }}>
      <Animated.View
        style={{
          position: 'absolute', left: -40, top: -40, width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: C.glow,
          opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.9, 0] }),
          transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1.7] }) }],
        }}
      />
      {parts.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute', left: -10, top: -10, width: 20, height: 20,
            opacity: v.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] }),
            transform: [
              { translateX: v.interpolate({ inputRange: [0, 1], outputRange: [0, p.dx] }) },
              { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, p.dy] }) },
              { scale: v.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.2, p.s, p.s * 0.4] }) },
              { rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${(i % 2 ? 1 : -1) * 140}deg`] }) },
            ],
          }}>
          <Svg width={20} height={20} viewBox="-10 -10 20 20">
            <G>
              <Path d={STAR} fill={p.c} stroke={C.ink} strokeWidth={1.4} strokeLinejoin="round" />
            </G>
          </Svg>
        </Animated.View>
      ))}
    </View>
  );
}

const CONFETTI = [C.yellow, C.red, C.blue, C.lavender, C.pink, '#fff'];

export function Confetti({ width, height }: { width: number; height: number }) {
  const pieces = useMemo(() => {
    const rand = rng(7);
    return Array.from({ length: 42 }, (_, i) => ({
      x: rand() * width,
      drift: (rand() - 0.5) * 120,
      delay: rand() * 500,
      dur: 1900 + rand() * 1300,
      spin: (rand() > 0.5 ? 1 : -1) * (360 + rand() * 540),
      w: 7 + rand() * 6,
      h: 10 + rand() * 8,
      c: CONFETTI[i % CONFETTI.length],
      v: new Animated.Value(0),
    }));
  }, [width]);
  useEffect(() => {
    Animated.parallel(
      pieces.map((p) => Animated.timing(p.v, { toValue: 1, duration: p.dur, delay: p.delay, easing: Easing.in(Easing.quad), useNativeDriver: ND })),
    ).start();
  }, [pieces]);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute', left: p.x, top: -24, width: p.w, height: p.h, borderRadius: 2, backgroundColor: p.c,
            borderWidth: 1.2, borderColor: C.ink,
            transform: [
              { translateY: p.v.interpolate({ inputRange: [0, 1], outputRange: [0, height + 60] }) },
              { translateX: p.v.interpolate({ inputRange: [0, 1], outputRange: [0, p.drift] }) },
              { rotate: p.v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.spin}deg`] }) },
            ],
          }}
        />
      ))}
    </View>
  );
}

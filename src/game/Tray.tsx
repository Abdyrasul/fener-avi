import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, Text, View } from 'react-native';
import Svg from 'react-native-svg';
import type { Hidden } from '../scenes/bedroom';
import { C, font } from '../theme';

type ViewRef = React.ComponentRef<typeof View>;
const ND = Platform.OS !== 'web';

export type TrayHandle = { slotCenter: (i: number, cb: (p: { x: number; y: number; size: number }) => void) => void };

function Slot({ item, filled, slotRef }: { item: Hidden; filled: boolean; slotRef: (v: ViewRef | null) => void }) {
  const bounce = useState(() => new Animated.Value(filled ? 1 : 0))[0];
  useEffect(() => {
    if (filled) {
      bounce.setValue(0);
      Animated.spring(bounce, { toValue: 1, friction: 3.5, tension: 160, useNativeDriver: ND }).start();
    } else bounce.setValue(0);
  }, [filled]);
  const { Art } = item;
  return (
    <View style={styles.cell}>
      <Animated.View
        ref={slotRef}
        style={[
          styles.slot,
          filled && styles.slotOn,
          { transform: [{ scale: bounce.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.18, 1] }) }] },
        ]}>
        <Svg width={40} height={40} viewBox="-30 -30 60 60">
          <Art tint={filled ? undefined : C.silhouette} />
        </Svg>
        {filled && (
          <View style={styles.check}>
            <Text style={styles.checkTxt}>✓</Text>
          </View>
        )}
      </Animated.View>
      <Text style={[styles.name, filled && styles.nameOn]} numberOfLines={1}>
        {filled ? item.name : '?'}
      </Text>
    </View>
  );
}

export const Tray = forwardRef<TrayHandle, { items: Hidden[]; filled: Set<number>; container: () => ViewRef | null }>(
  function Tray({ items, filled, container }, ref) {
    const slots = useRef<(ViewRef | null)[]>([]);
    useImperativeHandle(ref, () => ({
      slotCenter(i, cb) {
        const s = slots.current[i];
        const c = container();
        if (!s || !c) return;
        c.measureInWindow((cx, cy) =>
          s.measureInWindow((x, y, w, h) => cb({ x: x - cx + w / 2, y: y - cy + h / 2, size: 40 })),
        );
      },
    }));
    return (
      <View style={styles.tray}>
        {items.map((it, i) => (
          <Slot key={it.id} item={it} filled={filled.has(i)} slotRef={(v) => (slots.current[i] = v)} />
        ))}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  tray: {
    flexDirection: 'row', justifyContent: 'space-between', gap: 6,
    marginHorizontal: 12, paddingHorizontal: 10, paddingTop: 12, paddingBottom: 10,
    borderRadius: 28, backgroundColor: C.tray, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  cell: { flex: 1, alignItems: 'center', gap: 5 },
  slot: {
    width: '100%', aspectRatio: 1, maxWidth: 56, borderRadius: 18, backgroundColor: C.slot,
    alignItems: 'center', justifyContent: 'center',
  },
  slotOn: { backgroundColor: C.cream, borderWidth: 2.5, borderColor: C.ink },
  check: {
    position: 'absolute', right: -5, top: -5, width: 20, height: 20, borderRadius: 10,
    backgroundColor: '#3ccf6e', borderWidth: 2, borderColor: C.ink, alignItems: 'center', justifyContent: 'center',
  },
  checkTxt: { color: '#fff', fontSize: 11, fontWeight: '900', marginTop: -1 },
  name: { fontFamily: font, fontSize: 11, fontWeight: '700', color: '#59629c' },
  nameOn: { color: '#fff' },
});

// Hidden objects. Each one is drawn around (0,0) and fits roughly in a 56x56 box.
// `tint` turns the drawing into a flat silhouette (used in the tray before it is found).
import { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import { C } from '../theme';

export type ArtProps = { tint?: string };
const pick = (tint: string | undefined, col: string) => tint ?? col;
const line = (tint?: string) => ({
  stroke: tint ?? C.ink,
  strokeWidth: 2.4,
  strokeLinejoin: 'round' as const,
  strokeLinecap: 'round' as const,
});

export function Teddy({ tint }: ArtProps) {
  const b = pick(tint, '#c98a4b');
  const l = pick(tint, '#f3cd9b');
  const k = pick(tint, C.ink);
  return (
    <G {...line(tint)}>
      <Circle cx={-12} cy={-21} r={7} fill={b} />
      <Circle cx={12} cy={-21} r={7} fill={b} />
      <Circle cx={-12} cy={-21} r={3} fill={l} strokeWidth={0} />
      <Circle cx={12} cy={-21} r={3} fill={l} strokeWidth={0} />
      <Ellipse cx={0} cy={9} rx={15} ry={15} fill={b} />
      <Ellipse cx={0} cy={11} rx={8} ry={8} fill={l} />
      <Circle cx={-15} cy={4} r={5.5} fill={b} />
      <Circle cx={15} cy={4} r={5.5} fill={b} />
      <Ellipse cx={-10} cy={22} rx={7} ry={5} fill={b} />
      <Ellipse cx={10} cy={22} rx={7} ry={5} fill={b} />
      <Circle cx={0} cy={-12} r={13} fill={b} />
      <Ellipse cx={0} cy={-8} rx={6} ry={4.5} fill={l} />
      <Ellipse cx={0} cy={-10} rx={2.2} ry={1.6} fill={k} strokeWidth={0} />
      <Circle cx={-5} cy={-15} r={1.6} fill={k} strokeWidth={0} />
      <Circle cx={5} cy={-15} r={1.6} fill={k} strokeWidth={0} />
      <Path d="M-7 0 L0 3 L7 0 L7 6 L0 3 L-7 6 Z" fill={pick(tint, C.red)} strokeWidth={1.8} />
    </G>
  );
}

export function Ball({ tint }: ArtProps) {
  return (
    <G {...line(tint)}>
      <Circle cx={0} cy={0} r={16} fill={pick(tint, C.red)} />
      <Path d="M-16 0 C-8 -8 8 -8 16 0 C8 8 -8 8 -16 0 Z" fill={pick(tint, C.yellow)} />
      <Path d="M-3 -16 C-9 -6 -9 6 -3 16" fill="none" strokeWidth={2} />
      <Path d="M3 -16 C9 -6 9 6 3 16" fill="none" strokeWidth={2} />
      <Circle cx={-7} cy={-9} r={2.5} fill={pick(tint, '#fff')} strokeWidth={0} opacity={0.8} />
    </G>
  );
}

export function Rocket({ tint }: ArtProps) {
  return (
    <G {...line(tint)}>
      <Path d="M-5 18 L0 28 L5 18 Z" fill={pick(tint, C.yellow)} strokeWidth={1.8} />
      <Path d="M-9 6 L-16 18 L-8 16 Z" fill={pick(tint, C.red)} />
      <Path d="M9 6 L16 18 L8 16 Z" fill={pick(tint, C.red)} />
      <Path d="M-9 18 L-9 -8 C-9 -18 -4 -24 0 -28 C4 -24 9 -18 9 -8 L9 18 Z" fill={pick(tint, '#fff')} />
      <Path d="M-6.6 -16 C-5 -21 -2.5 -24.5 0 -27 C2.5 -24.5 5 -21 6.6 -16 Z" fill={pick(tint, C.red)} strokeWidth={1.8} />
      <Circle cx={0} cy={-4} r={4.5} fill={pick(tint, C.blue)} strokeWidth={2} />
      <Path d="M-9 10 L9 10" strokeWidth={1.6} />
    </G>
  );
}

export function Duck({ tint }: ArtProps) {
  return (
    <G {...line(tint)}>
      <Path d="M-20 4 C-22 18 -8 22 4 20 C16 18 22 10 18 0 C12 4 4 4 -2 2 Z" fill={pick(tint, C.yellow)} />
      <Path d="M-4 6 C2 12 10 10 12 6" fill="none" strokeWidth={1.8} />
      <Circle cx={-6} cy={-8} r={11} fill={pick(tint, C.yellow)} />
      <Path d="M-17 -8 C-24 -9 -26 -4 -22 -3 C-19 -2 -16 -4 -15 -5 Z" fill={pick(tint, '#f08a24')} strokeWidth={2} />
      <Circle cx={-8} cy={-11} r={1.8} fill={pick(tint, C.ink)} strokeWidth={0} />
    </G>
  );
}

export function Book({ tint }: ArtProps) {
  return (
    <G {...line(tint)} transform="rotate(-14)">
      <Rect x={-18} y={-12} width={36} height={26} rx={2} fill={pick(tint, '#fff')} />
      <Rect x={-20} y={-15} width={36} height={26} rx={3} fill={pick(tint, C.blue)} />
      <Rect x={-14} y={-9} width={22} height={6} fill={pick(tint, C.yellow)} strokeWidth={1.6} />
      <Circle cx={8} cy={4} r={3} fill={pick(tint, C.red)} strokeWidth={1.6} />
    </G>
  );
}

export function SleepyCat({ tint }: ArtProps) {
  const w = pick(tint, '#fff');
  const k = pick(tint, C.ink);
  return (
    <G {...line(tint)}>
      <Path d="M14 10 C26 10 26 -4 18 -6" fill="none" strokeWidth={3} />
      <Ellipse cx={2} cy={4} rx={19} ry={11} fill={w} />
      <Path d="M8 -6 C14 -6 20 0 19 6 C14 4 10 0 8 -6 Z" fill={k} strokeWidth={0} />
      <Circle cx={-12} cy={-2} r={10} fill={w} />
      <Path d="M-20 -6 L-20 -16 L-13 -11 Z" fill={k} />
      <Path d="M-4 -6 L-5 -16 L-11 -11 Z" fill={k} />
      <Path d="M-17 -1 Q-15 1 -13 -1 M-10 -1 Q-8 1 -6 -1" fill="none" strokeWidth={1.4} />
      <Path d="M-12 3 L-11 4 L-10 3" fill="none" strokeWidth={1.2} />
    </G>
  );
}

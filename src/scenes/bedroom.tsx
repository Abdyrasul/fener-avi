// "Bedroom" level. Scene space is 390 x 640 units; the game scales it to the screen.
// To add a new level, copy this file: a background component + a list of hidden objects.
import { memo, type ComponentType } from 'react';
import { Circle, Ellipse, G, Line, Path, Rect } from 'react-native-svg';
import { Ball, Book, Duck, Rocket, SleepyCat, Teddy, type ArtProps } from '../art/objects';
import { C } from '../theme';

export const SCENE_W = 390;
export const SCENE_H = 640;

export interface Hidden {
  id: string;
  name: string; // shown in tray / toast
  foundText: string; // "Ayıcığı buldun!"
  x: number;
  y: number;
  r: number; // hit radius for the torch
  fillR: number; // how much of the picture gets coloured when found
  Art: ComponentType<ArtProps>;
}

export const HIDDEN: Hidden[] = [
  { id: 'teddy', name: 'Ayıcık', foundText: 'Ayıcığı buldun!', x: 238, y: 112, r: 30, fillR: 118, Art: Teddy },
  { id: 'rocket', name: 'Roket', foundText: 'Roketi buldun!', x: 132, y: 186, r: 28, fillR: 112, Art: Rocket },
  { id: 'duck', name: 'Ördek', foundText: 'Ördeği buldun!', x: 92, y: 436, r: 28, fillR: 112, Art: Duck },
  { id: 'cat', name: 'Pamuk', foundText: 'Pamuk burada uyuyormuş!', x: 262, y: 386, r: 30, fillR: 120, Art: SleepyCat },
  { id: 'ball', name: 'Top', foundText: 'Topu buldun!', x: 290, y: 494, r: 26, fillR: 110, Art: Ball },
  { id: 'book', name: 'Kitap', foundText: 'Kitabı buldun!', x: 178, y: 592, r: 28, fillR: 120, Art: Book },
];

const S = { stroke: C.ink, strokeWidth: 2.6, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };

const star = (x: number, y: number, r: number) =>
  `M${x} ${y - r} L${x + r * 0.3} ${y - r * 0.3} L${x + r} ${y} L${x + r * 0.3} ${y + r * 0.3} L${x} ${y + r} L${x - r * 0.3} ${y + r * 0.3} L${x - r} ${y} L${x - r * 0.3} ${y - r * 0.3} Z`;

const WALL_STARS = [
  [200, 40, 5], [360, 60, 4], [300, 190, 4], [190, 250, 5], [230, 320, 4], [40, 290, 5], [120, 330, 4], [350, 300, 4], [180, 120, 3.5], [20, 380, 4],
];

const at = (h: Hidden) => {
  const { Art } = h;
  return (
    <G key={h.id} x={h.x} y={h.y}>
      <Art />
    </G>
  );
};
const byId = (id: string) => HIDDEN.find((h) => h.id === id)!;

/** Full colour picture of the room, hidden objects included (draw order matters for overlaps). */
export const BedroomArt = memo(function BedroomArt() {
  return (
    <G>
      {/* wall */}
      <Rect x={0} y={0} width={SCENE_W} height={500} fill="#d3e2ff" />
      {WALL_STARS.map(([x, y, r], i) => (
        <Path key={i} d={star(x, y, r)} fill="#fff" opacity={0.9} />
      ))}

      {/* window */}
      <Rect x={30} y={62} width={130} height={146} rx={6} fill={C.blue} {...S} />
      <Path d="M126 84 a14 14 0 1 0 14 20 a11 11 0 1 1 -14 -20 Z" fill={C.yellow} {...S} strokeWidth={2} />
      <Path d={star(56, 92, 5)} fill={C.yellow} />
      <Path d={star(70, 170, 4)} fill={C.yellow} />
      <Path d={star(140, 150, 3.5)} fill={C.yellow} />
      <Rect x={92} y={62} width={6} height={146} fill="#fff" {...S} strokeWidth={2} />
      <Rect x={30} y={132} width={130} height={6} fill="#fff" {...S} strokeWidth={2} />
      <Line x1={10} y1={50} x2={180} y2={50} stroke={C.ink} strokeWidth={4} strokeLinecap="round" />
      <Path d="M18 50 L50 50 C44 90 48 150 40 230 L18 230 Z" fill={C.red} {...S} />
      <Path d="M140 50 L172 50 L172 230 L150 230 C142 150 146 90 140 50 Z" fill={C.red} {...S} />
      <Path d="M30 50 L28 230 M160 50 L162 230" stroke="#b8271e" strokeWidth={2} />
      <Rect x={22} y={206} width={146} height={12} rx={3} fill="#fff" {...S} />

      {/* shelf */}
      <Rect x={200} y={140} width={168} height={11} rx={2} fill="#c98a4b" {...S} />
      <Path d="M214 151 L214 166 L228 151 M352 151 L352 166 L338 151" fill="none" {...S} strokeWidth={2.2} />
      {[
        [290, 18, C.red], [303, 22, C.yellow], [317, 16, C.blue], [328, 20, C.lavender], [340, 14, '#fff'],
      ].map(([x, w, col], i) => (
        <Rect key={i} x={x as number} y={140 - (32 + (i % 3) * 5)} width={(w as number) * 0.62} height={32 + (i % 3) * 5} fill={col as string} {...S} strokeWidth={2} />
      ))}
      <Rect x={346} y={110} width={14} height={30} fill={C.red} {...S} strokeWidth={2} transform="rotate(12 346 140)" />
      {at(byId('teddy'))}

      {/* framed rainbow */}
      <Rect x={262} y={214} width={92} height={72} fill={C.yellow} {...S} />
      <Rect x={272} y={224} width={72} height={52} fill="#fff" {...S} strokeWidth={2} />
      <Path d="M282 270 a26 26 0 0 1 52 0" fill="none" stroke={C.red} strokeWidth={6} />
      <Path d="M289 270 a19 19 0 0 1 38 0" fill="none" stroke={C.yellow} strokeWidth={6} />
      <Path d="M296 270 a12 12 0 0 1 24 0" fill="none" stroke={C.blue} strokeWidth={6} />

      {/* rocket stands on the window sill */}
      {at(byId('rocket'))}

      {/* floor */}
      <Rect x={0} y={500} width={SCENE_W} height={SCENE_H - 500} fill="#ecca93" />
      <Line x1={0} y1={500} x2={SCENE_W} y2={500} {...S} />
      {[540, 585].map((y) => (
        <Line key={y} x1={0} y1={y} x2={SCENE_W} y2={y} stroke="#d5ad70" strokeWidth={2} />
      ))}
      {[[80, 500, 540], [250, 500, 540], [160, 540, 585], [330, 540, 585], [60, 585, 640], [240, 585, 640]].map(([x, a, b], i) => (
        <Line key={i} x1={x} y1={a} x2={x} y2={b} stroke="#d5ad70" strokeWidth={2} />
      ))}

      {/* rug */}
      <Ellipse cx={170} cy={594} rx={128} ry={32} fill={C.lavender} {...S} />
      <Ellipse cx={170} cy={594} rx={104} ry={21} fill="none" stroke="#fff" strokeWidth={3} strokeDasharray="8 7" />
      {at(byId('book'))}

      {/* bed: ball sits under it, so draw it before the frame */}
      <Rect x={195} y={480} width={180} height={22} fill="#a88352" />
      {at(byId('ball'))}
      <Path d="M352 500 L352 340 C352 318 386 318 386 340 L386 500 Z" fill={C.red} {...S} />
      <Circle cx={369} cy={350} r={5} fill={C.yellow} {...S} strokeWidth={2} />
      <Rect x={200} y={398} width={152} height={42} rx={8} fill="#fff" {...S} />
      <Ellipse cx={322} cy={392} rx={26} ry={13} fill="#fff" {...S} />
      <Path d="M198 396 C230 384 280 386 300 392 L304 444 L198 444 Z" fill={C.yellow} {...S} />
      {[218, 240, 262, 284].map((x) => (
        <Line key={x} x1={x} y1={392} x2={x + 2} y2={444} stroke={C.blue} strokeWidth={3} />
      ))}
      {at(byId('cat'))}
      <Rect x={192} y={440} width={186} height={40} rx={6} fill={C.red} {...S} />
      <Rect x={202} y={478} width={13} height={24} fill="#b8271e" {...S} strokeWidth={2.2} />
      <Rect x={356} y={478} width={13} height={24} fill="#b8271e" {...S} strokeWidth={2.2} />

      {/* toy box: duck peeks out, so draw it first */}
      {at(byId('duck'))}
      <Rect x={26} y={442} width={112} height={74} rx={6} fill={C.blue} {...S} />
      <Rect x={20} y={436} width={124} height={14} rx={4} fill="#3c5ee0" {...S} />
      <Path d={star(82, 484, 15)} fill={C.yellow} {...S} strokeWidth={2.2} />

      {/* decoys */}
      <Rect x={150} y={496} width={22} height={22} fill={C.red} {...S} strokeWidth={2.2} />
      <Rect x={160} y={474} width={20} height={20} fill={C.yellow} {...S} strokeWidth={2.2} transform="rotate(10 170 484)" />
      <Ellipse cx={64} cy={606} rx={16} ry={8} fill={C.pink} {...S} strokeWidth={2.2} />
      <Ellipse cx={88} cy={616} rx={16} ry={8} fill={C.pink} {...S} strokeWidth={2.2} />
    </G>
  );
});

/** Things that stay softly visible in the dark (moonlit window). */
export const BedroomNight = memo(function BedroomNight() {
  return (
    <G opacity={0.55}>
      <Rect x={30} y={62} width={130} height={146} rx={6} fill="#1d2f8a" />
      <Path d="M126 84 a14 14 0 1 0 14 20 a11 11 0 1 1 -14 -20 Z" fill={C.yellow} />
      <Path d={star(56, 92, 5)} fill={C.yellow} />
      <Path d={star(70, 170, 4)} fill={C.yellow} />
      <Path d={star(140, 150, 3.5)} fill={C.yellow} />
      <Rect x={92} y={62} width={6} height={146} fill="#2a3577" />
      <Rect x={30} y={132} width={130} height={6} fill="#2a3577" />
    </G>
  );
});

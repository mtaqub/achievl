import React from 'react';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { CrateItem, Silhouette } from '../types';

/** Side-on outlines on a 120 x 48 canvas, barrel to the right. */
const SHAPES: Record<Silhouette, string[]> = {
  pistol: ['M14 12 H92 V16 H98 V24 H64 V27 C64 31 60 33 56 33 H50 L44 46 H26 L33 24 H14 Z'],
  smg: ['M8 16 H22 V13 H88 V17 H104 V21 H88 V26 H70 L68 44 H58 L58 26 H46 L41 38 H31 L35 26 H22 V22 H8 Z'],
  rifle: ['M2 20 H22 L27 15 H76 V11 H82 V15 H118 V19 H98 V22 H82 V26 H68 L63 42 H52 L56 26 H40 L34 38 H25 L28 26 H22 V25 H2 Z'],
  sniper: ['M2 22 H24 L30 18 H72 V20 H119 V23 H72 V27 H56 L52 40 H43 L46 27 H24 V26 H2 Z', 'M36 8 H74 V14 H68 V18 H62 V14 H48 V18 H42 V14 H36 Z'],
  knife: ['M4 27 C 26 12, 56 9, 76 17 V30 C 54 31, 28 31, 4 27 Z', 'M76 15 H80 V32 H76 Z', 'M80 18 H110 C 116 18, 116 30, 110 30 H80 Z'],
  karambit: [
    'M10 8 C 34 6, 60 14, 70 34 L60 38 C 52 24, 34 18, 12 19 Z',
    'M59 37 L71 32 L88 40 L80 46 Z',
    'M92 44 m-9 0 a9 9 0 1 0 18 0 a9 9 0 1 0 -18 0 M92 44 m-4 0 a4 4 0 1 1 8 0 a4 4 0 1 1 -8 0',
  ],
};

/** A weapon outline filled with its finish. `uid` keeps gradient ids apart when many are on screen. */
export function Weapon({ item, width = 96, uid }: { item: CrateItem; width?: number; uid: string }) {
  const id = `paint-${uid}`;
  const last = item.paint.length - 1;
  return (
    <Svg width={width} height={width * 0.4} viewBox="0 0 120 48" accessibilityLabel={`${item.weapon} ${item.finish}`}>
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          {item.paint.map((colour, i) => (
            <Stop key={i} offset={last === 0 ? 0 : i / last} stopColor={colour} />
          ))}
        </LinearGradient>
      </Defs>
      {SHAPES[item.shape].map((d, i) => (
        <Path key={i} d={d} fill={`url(#${id})`} fillRule="evenodd" stroke="rgba(0,0,0,0.55)" strokeWidth={1} strokeLinejoin="round" />
      ))}
    </Svg>
  );
}

import React from 'react';
import Svg, { Circle, ClipPath, Defs, Ellipse, G, Path, Rect } from 'react-native-svg';

import { AvatarLook, partOf } from './parts';

/**
 * A minimal voxel avatar: a block head on a block body, drawn as three-face cubes
 * (front, lit top, shaded side) with flat pixel features on the front.
 */

const U = 4; // one voxel on the face
const D = 8; // cube depth, drawn up and to the right
const INK = '#1F1A17';

function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1, 7), 16);
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(c + amount * 255)));
  return `#${[f(n >> 16), f((n >> 8) & 255), f(n & 255)].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

/** A box: front face at (x, y, w, h), top and right faces receding by `d`. */
function Cube({ x, y, w, h, d = D, color, top = true }: { x: number; y: number; w: number; h: number; d?: number; color: string; top?: boolean }) {
  return (
    <G>
      {top && <Path d={`M${x} ${y} L${x + d} ${y - d} H${x + w + d} L${x + w} ${y} Z`} fill={shade(color, 0.12)} />}
      <Path d={`M${x + w} ${y} L${x + w + d} ${y - d} V${y + h - d} L${x + w} ${y + h} Z`} fill={shade(color, -0.16)} />
      <Rect x={x} y={y} width={w} height={h} fill={color} />
    </G>
  );
}

/** Head box per face shape. */
function headBox(face: string) {
  switch (face) {
    case 'oval':
      return { x: 34, y: 24, w: 28, h: 35 };
    case 'square':
      return { x: 32, y: 27, w: 32, h: 31 };
    case 'long':
      return { x: 34, y: 23, w: 28, h: 37 };
    case 'heart':
      return { x: 33, y: 27, w: 30, h: 31 };
    default:
      return { x: 33, y: 26, w: 30, h: 32 };
  }
}
type Box = ReturnType<typeof headBox>;

const px = (x: number, y: number, w: number, h: number, fill: string, key?: string | number) => <Rect key={key} x={x} y={y} width={w} height={h} fill={fill} />;

function Hair({ hair, colour, b, part }: { hair: string; colour: string; b: Box; part: 'back' | 'front' }) {
  const { x, y, w, h } = b;
  const side = shade(colour, -0.16);
  if (part === 'back') {
    if (hair === 'long') return <Cube x={x - 2} y={y + 2} w={w + 4} h={h + 6} color={colour} top={false} />;
    if (hair === 'bob') return <Cube x={x - 2} y={y + 2} w={w + 4} h={h - 8} color={colour} top={false} />;
    return null;
  }
  const cap = (band: number) => (
    <G>
      <Path d={`M${x} ${y} L${x + D} ${y - D} H${x + w + D} L${x + w} ${y} Z`} fill={shade(colour, 0.12)} />
      <Path d={`M${x + w} ${y} L${x + w + D} ${y - D} V${y - D + band + 2} L${x + w} ${y + band + 2} Z`} fill={side} />
      {px(x, y, w, band, colour)}
    </G>
  );
  switch (hair) {
    case 'buzz':
      return <G opacity={0.85}>{cap(U)}</G>;
    case 'short':
      return cap(U * 2);
    case 'swoop':
      return (
        <G>
          {cap(U * 2)}
          {px(x, y + U * 2, U * 3, U, colour)}
          {px(x, y + U * 3, U, U, colour)}
        </G>
      );
    case 'spiky':
      return (
        <G>
          {cap(U * 2)}
          {[0, 1, 2].map((i) => (
            <Cube key={i} x={x + 4 + i * 11} y={y - 6} w={6} h={6} d={5} color={colour} />
          ))}
        </G>
      );
    case 'bob':
    case 'long':
      return (
        <G>
          {cap(U * 2)}
          {px(x, y, U, U * 6, colour)}
          {px(x + w - U, y, U, U * 6, colour)}
        </G>
      );
    case 'bun':
      return (
        <G>
          {cap(U * 2)}
          <Cube x={x + w / 2 - 4} y={y - 12} w={10} h={8} d={5} color={colour} />
        </G>
      );
    case 'curly':
      return (
        <G>
          {cap(U * 2)}
          {Array.from({ length: Math.floor(w / (U * 2)) }, (_, i) => px(x + i * U * 2, y + U * 2, U, U, colour, i))}
        </G>
      );
    case 'mohawk':
      return <Cube x={x + w / 2 - 4} y={y - 10} w={6} h={10} d={D} color={colour} />;
    default:
      return null;
  }
}

function Face({ look, b, skin, eyeColour, hairColour }: { look: AvatarLook; b: Box; skin: string; eyeColour: string; hairColour: string }) {
  const cx = b.x + b.w / 2;
  const ey = b.y + Math.round(b.h * 0.36);
  const left = cx - 9;
  const right = cx + 3;
  const out: React.ReactNode[] = [];

  // eyes (each 2 voxels wide)
  const eye = (ex: number, kind: string, key: string) => {
    switch (kind) {
      case 'dot':
        return px(ex + 2, ey + 2, U, U, INK, key);
      case 'happy':
        return (
          <G key={key}>
            {px(ex, ey + 4, 2, 2, INK)}
            {px(ex + 2, ey + 2, 4, 2, INK)}
            {px(ex + 6, ey + 4, 2, 2, INK)}
          </G>
        );
      case 'sleepy':
        return (
          <G key={key}>
            {px(ex, ey + 2, 8, 4, '#FFFFFF')}
            {px(ex + 4, ey + 3, 3, 3, eyeColour)}
            {px(ex, ey + 1, 8, 2, INK)}
          </G>
        );
      case 'bar':
        return px(ex, ey + 4, 8, 2, INK, key);
      case 'sharp':
        return (
          <G key={key}>
            {px(ex, ey + 3, 8, 4, '#FFFFFF')}
            {px(ex + 3, ey + 3, 3, 4, eyeColour)}
          </G>
        );
      default:
        return (
          <G key={key}>
            {px(ex, ey + 2, 8, 4, '#FFFFFF')}
            {px(ex + 4, ey + 2, 3, 4, eyeColour)}
            {px(ex, ey + 1, 8, 1.5, shade(skin, -0.45))}
          </G>
        );
    }
  };
  out.push(eye(left - 2, look.eyes, 'l'));
  out.push(eye(right, look.eyes === 'wink' ? 'bar' : look.eyes, 'r'));

  // brows
  const by = ey - 5;
  switch (look.brows) {
    case 'arched':
      out.push(
        px(left - 2, by + 1, 2, 2, hairColour, 'b1'),
        px(left, by, 6, 2, hairColour, 'b2'),
        px(right, by, 6, 2, hairColour, 'b3'),
        px(right + 6, by + 1, 2, 2, hairColour, 'b4')
      );
      break;
    case 'thick':
      out.push(px(left - 2, by - 1, 8, 4, hairColour, 'b1'), px(right, by - 1, 8, 4, hairColour, 'b2'));
      break;
    case 'angry':
      out.push(
        px(left - 2, by - 1, 4, 2, hairColour, 'b1'),
        px(left + 2, by + 1, 4, 2, hairColour, 'b2'),
        px(right + 4, by - 1, 4, 2, hairColour, 'b3'),
        px(right, by + 1, 4, 2, hairColour, 'b4')
      );
      break;
    case 'none':
      break;
    default:
      out.push(px(left - 2, by, 8, 2, hairColour, 'b1'), px(right, by, 8, 2, hairColour, 'b2'));
  }

  // nose
  const ny = ey + 8;
  const nose = shade(skin, -0.14);
  if (look.nose === 'long') out.push(px(cx - 2, ny - 2, U, U * 2, nose, 'n'));
  else if (look.nose === 'wide') out.push(px(cx - 4, ny, U * 2, U, nose, 'n'));
  else if (look.nose === 'dot') out.push(px(cx - 1, ny + 1, 2, 2, nose, 'n'));
  else out.push(px(cx - 2, ny, U, U, nose, 'n'));

  // facial hair (under the mouth so the mouth stays readable)
  const my = ny + 6;
  switch (look.beard) {
    case 'stubble':
      out.push(<Rect key="bd" x={b.x} y={my - 2} width={b.w} height={b.y + b.h - my + 2} fill={hairColour} opacity={0.3} />);
      break;
    case 'moustache':
      out.push(px(cx - 8, my - 3, 16, 3, hairColour, 'bd'));
      break;
    case 'goatee':
      out.push(px(cx - 4, my + 4, 8, 5, hairColour, 'bd'));
      break;
    case 'full':
      out.push(
        px(b.x, my - 4, b.w, b.y + b.h - my + 4, hairColour, 'bd'),
        px(b.x, my - 12, U, 8, hairColour, 'bd2'),
        px(b.x + b.w - U, my - 12, U, 8, hairColour, 'bd3')
      );
      break;
  }

  // mouth
  switch (look.mouth) {
    case 'grin':
      out.push(px(cx - 6, my, 12, 4, '#FFFFFF', 'm1'), px(cx - 6, my + 4, 12, 1.5, INK, 'm2'));
      break;
    case 'flat':
      out.push(px(cx - 4, my + 1, 8, 1.5, shade(skin, -0.45), 'm'));
      break;
    case 'open':
      out.push(px(cx - 3, my, 6, 6, '#6E2424', 'm'));
      break;
    case 'smirk':
      out.push(px(cx - 4, my + 2, 8, 2, INK, 'm1'), px(cx + 4, my, 2, 2, INK, 'm2'));
      break;
    case 'tongue':
      out.push(
        px(cx - 6, my, 2, 2, INK, 'm1'),
        px(cx - 4, my + 2, 8, 2, INK, 'm2'),
        px(cx + 4, my, 2, 2, INK, 'm3'),
        px(cx - 2, my + 4, 4, 3, '#E86A7A', 'm4')
      );
      break;
    default:
      out.push(
        px(cx - 5, my + 0.5, 1.5, 1.5, shade(skin, -0.45), 'm1'),
        px(cx - 4, my + 1.5, 8, 1.5, shade(skin, -0.45), 'm2'),
        px(cx + 3.5, my + 0.5, 1.5, 1.5, shade(skin, -0.45), 'm3')
      );
  }

  return <G>{out}</G>;
}

function Glasses({ kind, b }: { kind: string; b: Box }) {
  const cx = b.x + b.w / 2;
  const ey = b.y + Math.round(b.h * 0.36);
  const l = cx - 13;
  const r = cx + 1;
  const frame = (x: number, key: string, color = INK) => <Rect key={key} x={x} y={ey} width={12} height={8} fill="none" stroke={color} strokeWidth={2} />;
  switch (kind) {
    case 'round':
    case 'square':
      return (
        <G>
          {frame(l, 'l')}
          {frame(r, 'r')}
          {px(cx - 2, ey + 2, 4, 2, INK)}
        </G>
      );
    case 'shades':
      return (
        <G>
          {px(l, ey - 1, 12, 9, '#111114')}
          {px(r, ey - 1, 12, 9, '#111114')}
          {px(cx - 2, ey + 1, 4, 2, '#111114')}
        </G>
      );
    case 'monocle':
      return frame(r, 'm', '#C9A227');
    case 'visor':
      return <Rect x={b.x - 1} y={ey - 1} width={b.w + 2} height={9} fill="#22E0FF" opacity={0.8} />;
    case 'starry':
      return (
        <G>
          {px(l, ey - 1, 12, 9, '#FF5CA8')}
          {px(r, ey - 1, 12, 9, '#FF5CA8')}
          {px(l + 4, ey + 1, 4, 4, '#FFE04B')}
          {px(r + 4, ey + 1, 4, 4, '#FFE04B')}
        </G>
      );
    case 'ballistic':
      return <Rect x={b.x + 2} y={ey + 1} width={b.w - 4} height={6} fill="#1C2026" opacity={0.85} />;
    case 'goggles':
      return (
        <G>
          {px(b.x - 1, ey + 2, b.w + 2, 3, '#2A2C30')}
          {px(l, ey, 12, 8, '#E0A030')}
          {px(r, ey, 12, 8, '#E0A030')}
          {px(l + 2, ey + 1, 3, 2, '#FFF2C8')}
          {px(r + 2, ey + 1, 3, 2, '#FFF2C8')}
        </G>
      );
    case 'eyepatch':
      return (
        <G>
          <Path d={`M${b.x} ${ey - 4} L${b.x + b.w} ${ey + 8}`} stroke="#15151A" strokeWidth={1.5} />
          {px(l + 1, ey, 10, 8, '#15151A')}
        </G>
      );
    case 'retro3d':
      return (
        <G>
          {px(l, ey - 1, 12, 9, '#FF3B3B')}
          {px(r, ey - 1, 12, 9, '#2BB7FF')}
          {px(l, ey - 2, 26, 2, '#F2F2F2')}
        </G>
      );
    default:
      return null;
  }
}

function Hat({ hat, colour, b }: { hat: string; colour: string; b: Box }) {
  const { x, y, w, h } = b;
  const ey = y + Math.round(h * 0.36);
  switch (hat) {
    case 'cap':
      return (
        <G>
          <Cube x={x - 1} y={y - 4} w={w + 2} h={10} color={colour} />
          <Cube x={x - 8} y={y + 4} w={w / 2 + 6} h={3} d={6} color={shade(colour, -0.1)} />
        </G>
      );
    case 'beanie':
      return (
        <G>
          <Cube x={x - 1} y={y - 6} w={w + 2} h={14} color={colour} />
          {px(x - 1, y + 4, w + 2, 4, shade(colour, -0.15))}
        </G>
      );
    case 'headphones':
      return (
        <G>
          <Path d={`M${x - 2} ${y + 10} V${y - 4} H${x + w + 2} V${y + 10}`} stroke="#2A2C30" strokeWidth={3} fill="none" />
          <Cube x={x - 7} y={y + 10} w={7} h={12} d={4} color="#E04B4B" />
          <Cube x={x + w} y={y + 10} w={7} h={12} d={4} color="#E04B4B" />
        </G>
      );
    case 'party':
      return (
        <G>
          <Cube x={x + w / 2 - 8} y={y - 8} w={14} h={8} d={5} color="#FF5CA8" />
          <Cube x={x + w / 2 - 5} y={y - 15} w={8} h={7} d={4} color="#FFE04B" />
          <Cube x={x + w / 2 - 3} y={y - 20} w={4} h={5} d={3} color="#FF5CA8" />
        </G>
      );
    case 'cat':
      return (
        <G>
          <Cube x={x + 1} y={y - 9} w={9} h={9} d={5} color="#2A2C30" />
          <Cube x={x + w - 10} y={y - 9} w={9} h={9} d={5} color="#2A2C30" />
          {px(x + 4, y - 6, 3, 4, '#FF9BC8')}
          {px(x + w - 7, y - 6, 3, 4, '#FF9BC8')}
        </G>
      );
    case 'propeller':
      return (
        <G>
          <Cube x={x - 1} y={y - 4} w={w + 2} h={8} color="#3A6ED9" />
          {px(x + w / 2 + 2, y - 16, 2, 8, '#2A2C30')}
          {px(x + w / 2 - 8, y - 18, 22, 3, '#F2C230')}
        </G>
      );
    case 'tophat':
      return (
        <G>
          <Cube x={x - 5} y={y - 2} w={w + 10} h={3} d={6} color="#1E1E24" />
          <Cube x={x + 4} y={y - 20} w={w - 8} h={18} d={6} color="#1E1E24" />
          {px(x + 4, y - 6, w - 8, 3, '#B3261E')}
        </G>
      );
    case 'horns':
      return (
        <G>
          <Cube x={x - 1} y={y - 4} w={w + 2} h={12} color="#9AA3AD" />
          <Cube x={x - 9} y={y - 10} w={7} h={5} d={4} color="#F2E6C8" />
          <Cube x={x + w + 2} y={y - 10} w={7} h={5} d={4} color="#F2E6C8" />
        </G>
      );
    case 'wizard':
      return (
        <G>
          <Cube x={x - 6} y={y} w={w + 12} h={3} d={6} color="#3A2384" />
          <Cube x={x + 4} y={y - 10} w={w - 8} h={10} d={6} color="#4A2EA6" />
          <Cube x={x + 10} y={y - 20} w={w - 20} h={10} d={5} color="#4A2EA6" />
          <Cube x={x + 14} y={y - 27} w={w - 28} h={7} d={4} color="#4A2EA6" />
          {px(x + w / 2 - 2, y - 8, 4, 4, '#FFE04B')}
        </G>
      );
    case 'crown':
      return (
        <G>
          <Cube x={x + 2} y={y - 8} w={w - 4} h={8} d={6} color="#F2C230" />
          {[0, 1, 2].map((i) => px(x + 2 + i * ((w - 8) / 2), y - 13, 4, 5, '#F2C230', i))}
          {px(x + w / 2 - 2, y - 6, 4, 4, '#D9483B')}
        </G>
      );
    case 'helmet':
      return (
        <G>
          <Cube x={x - 2} y={y - 6} w={w + 4} h={14} color="#4F5640" />
          {px(x - 2, y + 6, w + 4, 2, '#3E4433')}
          {px(x + 3, y - 3, 6, 4, '#3E4433')}
          {px(x - 2, y + 8, 3, 14, '#2E3226')}
        </G>
      );
    case 'beret':
      return (
        <G>
          <Cube x={x - 1} y={y - 3} w={w + 3} h={5} d={6} color="#7A1E2A" />
          {px(x + w - 6, y + 2, 8, 3, '#5E1620')}
          {px(x + 4, y - 1, 4, 3, '#C9A227')}
        </G>
      );
    case 'balaclava':
      return (
        <G>
          <Cube x={x} y={y - 1} w={w} h={ey - y + 1} color="#22252A" />
          <Cube x={x} y={ey + 7} w={w} h={y + h - ey - 7} color="#22252A" top={false} />
          <Path d={`M${x + w} ${y} l${D} ${-D} V${y + h - D} l${-D} ${D} Z`} fill="#1A1C20" />
        </G>
      );
    case 'boonie':
      return (
        <G>
          <Cube x={x - 6} y={y + 1} w={w + 12} h={3} d={7} color="#7A6B48" />
          <Cube x={x + 1} y={y - 7} w={w - 2} h={8} d={7} color="#8A7A55" />
          {px(x + 1, y - 1, w - 2, 2, '#5E5238')}
        </G>
      );
    case 'nvg':
      return (
        <G>
          <Cube x={x - 2} y={y - 6} w={w + 4} h={14} color="#3A3D42" />
          <Cube x={x + w / 2 - 7} y={y - 2} w={14} h={7} d={4} color="#1E2024" />
          {px(x + w / 2 - 5, y + 1, 4, 3, '#5CFF8C')}
          {px(x + w / 2 + 1, y + 1, 4, 3, '#5CFF8C')}
        </G>
      );
    case 'racehelm':
      return (
        <G>
          <Cube x={x - 3} y={y - 5} w={w + 6} h={h + 3} color={colour} />
          {px(x - 3, ey - 1, w + 6, 9, '#15161A')}
          {px(x - 3, y - 1, w + 6, 2, '#FFFFFF')}
        </G>
      );
    case 'tricorn':
      return (
        <G>
          <Cube x={x - 6} y={y - 2} w={w + 12} h={4} d={7} color="#1C1D22" />
          <Cube x={x + 2} y={y - 9} w={w - 4} h={7} d={6} color="#1C1D22" />
          {px(x - 6, y - 2, w + 12, 1.5, '#C9A227')}
          {px(x + w / 2 - 3, y - 7, 6, 4, '#ECEEF0')}
        </G>
      );
    case 'halo':
      return <Path d={`M${x + 4} ${y - 10} L${x + 10} ${y - 15} H${x + w + 2} L${x + w - 4} ${y - 10} Z`} fill="none" stroke="#FFE680" strokeWidth={3} />;
    default:
      return null;
  }
}

function Body({ top, colour, skin }: { top: string; colour: string; skin: string }) {
  const x = 26;
  const y = 66;
  const w = 44;
  const h = 40;
  const base = top === 'tux' || top === 'gi' ? '#1C1D22' : top === 'ghillie' ? '#4E5B33' : top === 'armor' ? '#9AA3AD' : top === 'space' ? '#EDEFF2' : colour;
  const detail: React.ReactNode[] = [];
  const cx = x + w / 2;
  switch (top) {
    case 'hoodie':
      detail.push(px(cx - 10, y, 20, 4, shade(colour, -0.15), 'h'), px(cx - 5, y + 4, 2, 8, '#F2F2F2', 's1'), px(cx + 3, y + 4, 2, 8, '#F2F2F2', 's2'));
      break;
    case 'collar':
      detail.push(px(cx - 8, y, 6, 6, '#F7F7F7', 'c1'), px(cx + 2, y, 6, 6, '#F7F7F7', 'c2'));
      break;
    case 'jersey':
      detail.push(px(x, y + 18, w, 4, '#FFFFFF', 'j1'), px(cx - 4, y + 6, 8, 8, shade(colour, 0.25), 'j2'));
      break;
    case 'varsity':
      detail.push(px(x, y, 8, h, '#F2EEE2', 'v1'), px(x + w - 8, y, 8, h, '#F2EEE2', 'v2'), px(x + 12, y + 8, 6, 8, '#F2EEE2', 'v3'));
      break;
    case 'tux':
      detail.push(px(cx - 4, y, 8, h, '#F7F7F7', 't1'), px(cx - 6, y + 2, 12, 4, colour, 't2'));
      break;
    case 'armor':
      detail.push(px(x, y, 10, 10, '#C3CAD3', 'a1'), px(x + w - 10, y, 10, 10, '#C3CAD3', 'a2'), px(cx - 4, y + 12, 8, 8, colour, 'a3'));
      break;
    case 'vest':
      detail.push(
        px(x + 6, y + 2, w - 12, h - 8, shade(colour, -0.18), 'v1'),
        px(x + 9, y + 12, 7, 7, shade(colour, -0.3), 'v2'),
        px(x + 18, y + 12, 7, 7, shade(colour, -0.3), 'v3'),
        px(x + 27, y + 12, 7, 7, shade(colour, -0.3), 'v4'),
        px(cx - 4, y, 8, 3, skin, 'v5')
      );
      break;
    case 'plate':
      detail.push(
        px(x + 4, y + 1, w - 8, h - 6, '#2F3329', 'p1'),
        px(x + 4, y, 6, 10, '#23261F', 'p2'),
        px(x + w - 10, y, 6, 10, '#23261F', 'p3'),
        px(x + 8, y + 14, 8, 9, '#3E4433', 'p4'),
        px(x + 18, y + 14, 8, 9, '#3E4433', 'p5'),
        px(x + 28, y + 14, 8, 9, '#3E4433', 'p6'),
        px(x + 10, y + 5, 10, 5, '#5C6650', 'p7')
      );
      break;
    case 'camo':
      [
        [2, 4, 10, 6],
        [16, 10, 8, 8],
        [30, 2, 10, 7],
        [6, 20, 12, 6],
        [26, 22, 10, 8],
        [34, 14, 8, 5],
      ].forEach(([dx, dy, cw, ch], i) => detail.push(px(x + dx, y + dy, cw, ch, i % 2 ? shade(colour, -0.25) : shade(colour, 0.15), `c${i}`)));
      detail.push(px(cx - 4, y, 8, 3, skin, 'cn'));
      break;
    case 'gi':
      detail.push(px(cx - 8, y, 4, 14, '#2E3036', 'g1'), px(cx + 4, y, 4, 14, '#2E3036', 'g2'), px(x, y + 18, w, 4, colour, 'g3'));
      break;
    case 'ghillie':
      for (let i = 0; i < 26; i++) {
        const dx = (i * 17) % (w - 2);
        const dy = (i * 11) % (h - 4);
        detail.push(px(x + dx, y + dy - 2, 3, 6, ['#4E5B33', '#6E7A45', '#3A4426', '#8A8550'][i % 4], `gh${i}`));
      }
      break;
    case 'robe':
      detail.push(px(cx - 3, y, 6, h, '#C9A227', 'r1'), px(x, y + 16, w, 3, '#C9A227', 'r2'), px(cx - 6, y, 12, 4, shade(colour, -0.2), 'r3'));
      break;
    case 'space':
      detail.push(px(cx - 8, y + 10, 16, 10, colour, 'p1'), px(cx - 5, y + 13, 3, 3, '#FFFFFF', 'p2'), px(cx + 2, y + 13, 3, 3, '#FFE04B', 'p3'));
      break;
    default:
      detail.push(px(cx - 4, y, 8, 4, skin, 'n'));
  }
  return (
    <G>
      <Cube x={x} y={y} w={w} h={h} color={base} />
      {detail}
    </G>
  );
}

function Backdrop({ bg }: { bg: string }) {
  const colour = partOf('bg', bg).color ?? '#9BD3F5';
  switch (bg) {
    case 'sunset':
      return (
        <G>
          <Rect width={100} height={100} fill="#FFB25C" />
          <Rect y={50} width={100} height={50} fill="#F0707A" />
          <Rect y={75} width={100} height={25} fill="#C2477E" />
        </G>
      );
    case 'grid':
      return (
        <G>
          <Rect width={100} height={100} fill={colour} />
          {[20, 40, 60, 80].map((v) => (
            <G key={v}>
              <Rect x={v} width={1} height={100} fill="#FF3DA5" opacity={0.5} />
              <Rect y={v} width={100} height={1} fill="#22D3EE" opacity={0.5} />
            </G>
          ))}
        </G>
      );
    case 'bubbles':
      return (
        <G>
          <Rect width={100} height={100} fill={colour} />
          {[
            [10, 16, 8],
            [80, 12, 6],
            [84, 56, 10],
            [8, 64, 6],
          ].map(([x, y, s], i) => (
            <Rect key={i} x={x} y={y} width={s} height={s} fill="#FFFFFF" opacity={0.35} />
          ))}
        </G>
      );
    case 'galaxy':
      return (
        <G>
          <Rect width={100} height={100} fill={colour} />
          {[
            [10, 12],
            [80, 8],
            [88, 40],
            [14, 52],
            [44, 6],
            [84, 76],
            [8, 86],
          ].map(([x, y], i) => (
            <Rect key={i} x={x} y={y} width={i % 2 ? 2 : 3} height={i % 2 ? 2 : 3} fill="#FFFFFF" />
          ))}
        </G>
      );
    default:
      return <Rect width={100} height={100} fill={colour} />;
  }
}

/** A minimal voxel avatar drawn from a look. */
export function Avatar({
  look,
  size = 96,
  uid = 'avatar',
  round = true,
  bare = false,
}: {
  look: AvatarLook;
  size?: number;
  uid?: string;
  round?: boolean;
  /** No backdrop and no clipping, for standing the avatar in a scene. */
  bare?: boolean;
}) {
  const skin = partOf('skin', look.skin).color ?? look.skin;
  const hairColour = partOf('hairColor', look.hairColor).color ?? look.hairColor;
  const eyeColour = partOf('eyeColor', look.eyeColor).color ?? look.eyeColor;
  const topColour = partOf('topColor', look.topColor).color ?? look.topColor;
  const id = uid.replace(/[^a-zA-Z0-9-]/g, '');
  const b = headBox(look.face);
  const covered = ['tophat', 'horns', 'wizard', 'beanie', 'cap', 'helmet', 'boonie', 'nvg', 'racehelm', 'tricorn', 'balaclava'].includes(look.hat);

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityLabel="avatar">
      <Defs>
        <ClipPath id={`${id}-clip`}>{round ? <Circle cx={50} cy={50} r={50} /> : <Rect width={100} height={100} rx={14} />}</ClipPath>
      </Defs>
      <G clipPath={bare ? undefined : `url(#${id}-clip)`}>
        {!bare && <Backdrop bg={look.bg} />}
        <Ellipse cx={52} cy={98} rx={30} ry={4} fill="#000000" opacity={0.12} />
        <Body top={look.top} colour={topColour} skin={skin} />
        {!covered && <Hair hair={look.hair} colour={hairColour} b={b} part="back" />}
        <Cube x={b.x} y={b.y} w={b.w} h={b.h} color={skin} />
        {look.face === 'heart' && (
          <G>
            {px(b.x, b.y + b.h - U, U, U, shade(skin, -0.16))}
            {px(b.x + b.w - U, b.y + b.h - U, U, U, shade(skin, -0.16))}
          </G>
        )}
        <Face look={look} b={b} skin={skin} eyeColour={eyeColour} hairColour={hairColour} />
        {!covered && <Hair hair={look.hair} colour={hairColour} b={b} part="front" />}
        <Glasses kind={look.glasses} b={b} />
        <Hat hat={look.hat} colour={topColour} b={b} />
      </G>
    </Svg>
  );
}

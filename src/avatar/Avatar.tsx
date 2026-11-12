import React, { useMemo } from 'react';
import { View } from 'react-native';

import type { Layer } from '@/voxel/engine';
import { VoxelView } from '@/voxel/VoxelView';

import { buildAvatar } from './model';
import { AvatarLook, partOf } from './parts';

interface Props {
  look: AvatarLook;
  size?: number;
  /** Kept for callers; the voxel view needs no svg ids. */
  uid?: string;
  round?: boolean;
  /** No backdrop, for standing the figure in a scene. */
  bare?: boolean;
  /** Turn in degrees; a little to the side by default so it reads as 3d. */
  yaw?: number;
  pitch?: number;
  /** Head and shoulders only: portraits and small thumbnails. */
  headOnly?: boolean;
  /** Extra layers in the same scene, like a held weapon. */
  extra?: Layer[];
}

/** The player's voxel figure. */
export function Avatar({ look, size = 96, round = true, bare = false, yaw = -28, pitch = 14, headOnly = false, extra }: Props) {
  const voxels = useMemo(() => {
    const all = buildAvatar(look);
    return headOnly ? all.filter(([, y]) => y >= 42) : all;
  }, [look, headOnly]);
  const layers = useMemo<Layer[]>(() => [{ voxels }, ...(extra ?? [])], [voxels, extra]);
  const bg = partOf('bg', look.bg).color ?? '#9BD3F5';

  const figure = <VoxelView layers={layers} width={size} height={size} yaw={yaw} pitch={pitch} margin={headOnly ? 0.95 : 0.9} muted={0.22} />;
  if (bare) return figure;
  return <View style={{ width: size, height: size, borderRadius: round ? size / 2 : size * 0.14, overflow: 'hidden', backgroundColor: bg }}>{figure}</View>;
}

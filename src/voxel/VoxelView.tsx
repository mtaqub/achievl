import React, { useMemo } from 'react';
import Svg, { Path } from 'react-native-svg';

import { bounds, fitUnit, Layer, meshScene, project } from './engine';

interface Props {
  layers: Layer[];
  width: number;
  height: number;
  /** Turn in degrees; 0 faces the viewer. */
  yaw?: number;
  /** Camera tilt in degrees; positive looks down from above. */
  pitch?: number;
  /** Fit the model as if it could turn all the way round, so it never changes size while spinning. */
  margin?: number;
  /** 0 keeps colours as they are; 1 is greyscale. */
  muted?: number;
}

/** Renders voxel layers as flat-shaded svg polygons. Meshing is cached; turning only reprojects. */
export function VoxelView({ layers, width, height, yaw = -28, pitch = 16, margin, muted = 0 }: Props) {
  const quads = useMemo(() => meshScene(layers), [layers]);
  const box = useMemo(() => bounds(quads), [quads]);
  const unit = fitUnit(box, pitch, width, height, margin);
  const polys = useMemo(() => project(quads, box, yaw, pitch, unit, width, height, muted), [quads, box, yaw, pitch, unit, width, height, muted]);
  return (
    <Svg width={width} height={height}>
      {polys.map((p, i) => (
        <Path key={i} d={p.d} fill={p.fill} stroke={p.fill} strokeWidth={0.6} strokeLinejoin="round" />
      ))}
    </Svg>
  );
}

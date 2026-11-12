import { useRouter } from 'expo-router';
import React, { memo, useEffect, useMemo, useState } from 'react';
import { PanResponder, Platform, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

import { loadoutFor } from '@/arcade/loadout';
import { reveal, thud, tick } from '@/arcade/ui/feedback';
import { Weapon } from '@/arcade/ui/Weapon';
import { Avatar } from '@/avatar/Avatar';
import { AvatarLook } from '@/avatar/parts';
import { Btn } from '@/components/Btn';
import { Icon } from '@/components/Icon';
import { Txt } from '@/components/Txt';
import { useToday } from '@/hooks/useToday';
import { ARENA, choose, Loadout, newRun, perksFrom, RUN_SECONDS, runReward, RunState, step, UPGRADES, weaponStats, Zombie } from '@/minigame/survivor';
import { useArcade } from '@/store/useArcade';
import { useAvatar } from '@/store/useAvatar';
import { useGame } from '@/store/useGame';

const ZOMBIE_LOOK: Record<Zombie['kind'], { shirt: string; skin: string; scale: number }> = {
  walker: { shirt: '#5A5048', skin: '#7FA06A', scale: 1 },
  runner: { shirt: '#3E4A5A', skin: '#93A877', scale: 0.85 },
  brute: { shirt: '#4A3A3A', skin: '#6E8C5A', scale: 1.5 },
  boss: { shirt: '#2E2224', skin: '#5E7A4C', scale: 2.8 },
};

/** A blocky zombie seen from above and a little in front, arms out towards the player. */
function ZombieSprite({ z, px, py }: { z: Zombie; px: number; py: number }) {
  const look = ZOMBIE_LOOK[z.kind];
  const s = look.scale * 10;
  const a = Math.atan2(py - z.y, px - z.x);
  const flash = z.flash > 0;
  const lean = Math.sin(z.id + z.x * 0.05) * 0.6; // shamble
  return (
    <G transform={`translate(${z.x} ${z.y})`}>
      <Rect x={-s * 1.1} y={s * 0.9} width={s * 2.2} height={s * 0.5} fill="rgba(0,0,0,0.35)" />
      <G transform={`rotate(${(a * 180) / Math.PI} 0 0)`}>
        <Rect x={s * 0.4} y={-s * 0.75 + lean} width={s * 1.1} height={s * 0.4} fill={flash ? '#FFFFFF' : look.skin} />
        <Rect x={s * 0.4} y={s * 0.35 - lean} width={s * 1.1} height={s * 0.4} fill={flash ? '#FFFFFF' : look.skin} />
      </G>
      <Rect x={-s * 0.8} y={-s * 0.6} width={s * 1.6} height={s * 1.5} fill={flash ? '#FFFFFF' : look.shirt} />
      <Rect x={-s * 0.6} y={-s * 1.5} width={s * 1.2} height={s * 1.1} fill={flash ? '#FFFFFF' : look.skin} />
      <Rect x={-s * 0.4} y={-s * 1.15} width={s * 0.25} height={s * 0.2} fill={z.kind === 'boss' ? '#FF3B3B' : '#E8E04B'} />
      <Rect x={s * 0.15} y={-s * 1.15} width={s * 0.25} height={s * 0.2} fill={z.kind === 'boss' ? '#FF3B3B' : '#E8E04B'} />
      {z.kind !== 'walker' && z.kind !== 'runner' && <Rect x={-s} y={-s * 2} width={(2 * s * Math.max(0, z.hp)) / z.maxHp} height={s * 0.18} fill="#E5534B" />}
    </G>
  );
}

/** The player's figure, redrawn only when it turns to a new direction. */
const PlayerSprite = memo(function PlayerSprite({ look, yaw }: { look: AvatarLook; yaw: number }) {
  return <Avatar look={look} size={92} bare yaw={yaw} pitch={32} />;
});

const fmt = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

export default function Survivor() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const look = useAvatar((s) => s.look);
  const stats = useGame((s) => s.data.stats);
  const { meters } = useToday();
  const inventory = useArcade((s) => s.data.inventory);
  const equipped = useArcade((s) => s.data.equipped);

  const gear = useMemo(() => loadoutFor(inventory, equipped), [inventory, equipped]);
  const loadout: Loadout = useMemo(
    () => ({ weapon: weaponStats(gear.item, gear.wear), perks: perksFrom(stats, meters.hp, !!gear.drop?.foil) }),
    [gear, stats, meters.hp]
  );

  // One mutable container for the running game, read by the loop and the renderer.
  const [game] = useState(() => ({ run: newRun(loadout) as RunState, input: { x: 0, y: 0 }, keys: new Set<string>(), loadout, paid: false }));
  const [, setFrame] = useState(0);
  const [paused, setPaused] = useState(false);
  const [paid, setPaid] = useState<number | null>(null);
  const [stick, setStick] = useState<{ x: number; y: number; dx: number; dy: number } | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability -- the game container is deliberately mutable; the loop reads the latest loadout
    game.loadout = loadout;
  }, [game, loadout]);

  // the game loop
  useEffect(() => {
    let raf = 0;
    let last = 0;
    let lastLevel = 1;
    let lastHp = game.run.player.hp;
    const frame = (now: number) => {
      const dt = last ? (now - last) / 1000 : 0;
      last = now;
      if (!paused) {
        const k = game.keys;
        const kx = (k.has('d') || k.has('arrowright') ? 1 : 0) - (k.has('a') || k.has('arrowleft') ? 1 : 0);
        const ky = (k.has('s') || k.has('arrowdown') ? 1 : 0) - (k.has('w') || k.has('arrowup') ? 1 : 0);
        const move = kx || ky ? { x: kx, y: ky } : game.input;
        const s = step(game.run, game.loadout, dt, move, Math.random);
        if (s.player.level > lastLevel) {
          lastLevel = s.player.level;
          reveal(2);
        }
        if (s.player.hp < lastHp - 1) thud();
        if (s.over && !game.paid) {
          game.paid = true;
          const shards = runReward(s);
          useArcade.getState().finishRun({ seconds: Math.floor(s.t), kills: s.kills, won: s.won, shards });
          setPaid(shards);
        }
        lastHp = s.player.hp;
        setFrame((f) => (f + 1) % 1000000);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [paused, game]);

  // keyboard on the web
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const down = (e: KeyboardEvent) => game.keys.add(e.key.toLowerCase());
    const up = (e: KeyboardEvent) => game.keys.delete(e.key.toLowerCase());
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [game]);

  // a floating thumbstick wherever the thumb lands
  const [pan] = useState(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => setStick({ x: e.nativeEvent.locationX, y: e.nativeEvent.locationY, dx: 0, dy: 0 }),
      onPanResponderMove: (_, g) => {
        const len = Math.hypot(g.dx, g.dy);
        const k = len > 50 ? 50 / len : 1;
        game.input = { x: (g.dx * k) / 50, y: (g.dy * k) / 50 };
        setStick((s) => (s ? { ...s, dx: g.dx * k, dy: g.dy * k } : s));
      },
      onPanResponderRelease: () => {
        game.input = { x: 0, y: 0 };
        setStick(null);
      },
      onPanResponderTerminate: () => {
        game.input = { x: 0, y: 0 };
        setStick(null);
      },
    })
  );

  const s = game.run;
  const p = s.player;
  // the camera sits close in, like an isometric survival game
  const Z = 1.35;
  const viewW = width / Z;
  const viewH = height / Z;
  const camX = Math.min(Math.max(p.x - viewW / 2, 0), ARENA - viewW);
  const camY = Math.min(Math.max(p.y - viewH / 2, 0), ARENA - viewH);
  const sx = (p.x - camX) * Z;
  const sy = (p.y - camY) * Z;
  // face the way you walk: screen down is towards the viewer
  const yaw = Math.round(((90 - (p.face * 180) / Math.PI) % 360) / 45) * 45;
  const moving = Math.hypot(game.input.x, game.input.y) > 0.05 || game.keys.size > 0;
  const bobY = moving ? Math.abs(Math.sin(s.t * 12)) * -4 : 0;
  const aimDeg = (p.aim * 180) / Math.PI;
  const flipped = Math.cos(p.aim) < 0;

  const restart = () => {
    // eslint-disable-next-line react-hooks/immutability -- see the game container above
    game.run = newRun(loadout);
    game.paid = false;
    setPaid(null);
    setPaused(false);
  };

  // what's on screen
  const onScreen = (x: number, y: number, pad = 60) => x > camX - pad && x < camX + viewW + pad && y > camY - pad && y < camY + viewH + pad;
  const grid: React.ReactNode[] = [];
  for (let gx = Math.floor(camX / 80) * 80; gx < camX + viewW; gx += 80)
    grid.push(<Rect key={`gx${gx}`} x={gx} y={camY} width={1.5} height={viewH} fill="#2F3236" />);
  for (let gy = Math.floor(camY / 80) * 80; gy < camY + viewH; gy += 80)
    grid.push(<Rect key={`gy${gy}`} x={camX} y={gy} width={viewW} height={1.5} fill="#2F3236" />);

  return (
    <View style={styles.root}>
      <View style={StyleSheet.absoluteFill} {...pan.panHandlers}>
        <Svg width={width} height={height}>
          <Rect width={width} height={height} fill="#232528" />
          <G transform={`scale(${Z}) translate(${-camX} ${-camY})`}>
            {grid}
            <Rect x={-6} y={-6} width={ARENA + 12} height={ARENA + 12} fill="none" stroke="#5A3A3A" strokeWidth={6} />
            {s.gems
              .filter((g) => onScreen(g.x, g.y))
              .map((g) => (
                <Rect
                  key={g.id}
                  x={g.x - 4}
                  y={g.y - 4}
                  width={8}
                  height={8}
                  fill={g.value > 4 ? '#FF5CA8' : '#5CE0FF'}
                  transform={`rotate(45 ${g.x} ${g.y})`}
                />
              ))}
            {s.zombies
              .filter((z) => z.slam)
              .map((z) => (
                <Circle
                  key={`slam${z.id}`}
                  cx={z.slam!.x}
                  cy={z.slam!.y}
                  r={110}
                  fill="rgba(229,83,75,0.18)"
                  stroke="#E5534B"
                  strokeWidth={3}
                  strokeDasharray="10 8"
                />
              ))}
            {s.zombies
              .filter((z) => onScreen(z.x, z.y))
              .map((z) => (
                <ZombieSprite key={z.id} z={z} px={p.x} py={p.y} />
              ))}
            {s.bullets.map((b) => (
              <Rect key={b.id} x={b.x - 3} y={b.y - 3} width={6} height={6} fill={gear.item.paint[0]} stroke={gear.item.paint[1]} strokeWidth={1} />
            ))}
            {(s.levels.halo ?? 0) > 0 &&
              Array.from({ length: (s.levels.halo ?? 0) + 1 }, (_, i) => {
                const a = s.t * 3 + (i * Math.PI * 2) / ((s.levels.halo ?? 0) + 1);
                const bx = p.x + Math.cos(a) * 70;
                const by = p.y + Math.sin(a) * 70;
                return (
                  <Rect
                    key={`halo${i}`}
                    x={bx - 7}
                    y={by - 7}
                    width={14}
                    height={14}
                    fill="#C3CAD3"
                    stroke="#6B737C"
                    transform={`rotate(${s.t * 600} ${bx} ${by})`}
                  />
                );
              })}
            {s.effects.map((e) =>
              e.kind === 'swing' ? (
                <Path
                  key={e.id}
                  d={`M${e.x} ${e.y} L${e.x + Math.cos(e.angle - 1.2) * e.radius} ${e.y + Math.sin(e.angle - 1.2) * e.radius} A${e.radius} ${e.radius} 0 0 1 ${e.x + Math.cos(e.angle + 1.2) * e.radius} ${e.y + Math.sin(e.angle + 1.2) * e.radius} Z`}
                  fill={`${gear.item.paint[0]}55`}
                />
              ) : (
                <Circle
                  key={e.id}
                  cx={e.x}
                  cy={e.y}
                  r={e.kind === 'nova' ? e.radius * (1 - e.t / 0.35) : e.radius}
                  fill="none"
                  stroke={e.kind === 'nova' ? '#7CFFE0' : '#B33A3A'}
                  strokeWidth={e.kind === 'nova' ? 4 : 2}
                  opacity={Math.min(1, e.t * 4)}
                />
              )
            )}
          </G>
        </Svg>

        {/* the player and their gun, as views over the svg */}
        <View pointerEvents="none" style={[styles.player, { left: sx - 46, top: sy - 84 + bobY, opacity: p.hurt > 0 && Math.floor(s.t * 20) % 2 ? 0.4 : 1 }]}>
          <PlayerSprite look={look} yaw={yaw} />
        </View>
        <View
          pointerEvents="none"
          style={[styles.gun, { left: sx - 6, top: sy - 28 + bobY, transform: [{ rotate: `${aimDeg}deg` }, { scaleY: flipped ? -1 : 1 }] }]}>
          <Weapon item={gear.item} uid="run-gun" width={40} wear={gear.wear} seed={gear.seed} />
        </View>

        {stick && (
          <View pointerEvents="none" style={[styles.stick, { left: stick.x - 50, top: stick.y - 50 }]}>
            <View style={[styles.knob, { transform: [{ translateX: stick.dx }, { translateY: stick.dy }] }]} />
          </View>
        )}
      </View>

      {/* HUD */}
      <SafeAreaView pointerEvents="box-none" style={styles.hud}>
        <View style={styles.hudRow} pointerEvents="box-none">
          <Pressable onPress={() => setPaused(true)} style={styles.hudBtn} accessibilityLabel="Pause">
            <Icon name="pause" size={20} color="#FFFFFF" />
          </Pressable>
          <View style={styles.flex}>
            <View style={styles.bar}>
              <View style={[styles.fill, { width: `${(100 * p.hp) / p.maxHp}%`, backgroundColor: '#E5534B' }]} />
            </View>
            <View style={[styles.bar, styles.thin]}>
              <View style={[styles.fill, { width: `${(100 * p.xp) / p.next}%`, backgroundColor: '#5CE0FF' }]} />
            </View>
          </View>
          <View style={styles.clock}>
            <Txt variant="number" size={18} color={s.t >= 240 ? '#FF5C5C' : '#FFFFFF'}>
              {fmt(Math.max(0, RUN_SECONDS - s.t))}
            </Txt>
            <Txt variant="caption" size={10} color="#C3CAD3">{`lv ${p.level} · ${s.kills} kills`}</Txt>
          </View>
        </View>
        {s.bossSpawned && !s.bossDown && (
          <Txt variant="label" center color="#FF5C5C" style={styles.banner}>
            the butcher is here
          </Txt>
        )}
      </SafeAreaView>

      {/* level up */}
      {s.choices && !s.over && (
        <View style={styles.overlay}>
          <View style={styles.card}>
            <Txt variant="title" center color="#FFFFFF">{`level ${p.level}`}</Txt>
            <Txt variant="caption" center color="#C3CAD3">
              pick one
            </Txt>
            {s.choices.map((id) => (
              <Pressable
                key={id}
                style={styles.choice}
                accessibilityRole="button"
                onPress={() => {
                  tick();
                  game.run = choose(game.run, loadout, id);
                  setFrame((f) => f + 1);
                }}>
                <Icon name={UPGRADES[id].icon} size={24} color="#5CE0FF" />
                <View style={styles.flex}>
                  <Txt variant="bodyStrong" color="#FFFFFF">{`${UPGRADES[id].name} ${(s.levels[id] ?? 0) + 1}`}</Txt>
                  <Txt variant="caption" color="#C3CAD3">
                    {UPGRADES[id].blurb}
                  </Txt>
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {/* pause */}
      {paused && !s.over && (
        <View style={styles.overlay}>
          <View style={styles.card}>
            <Txt variant="title" center color="#FFFFFF">
              paused
            </Txt>
            <Txt variant="caption" color="#C3CAD3" center>
              {`${gear.item.weapon} | ${gear.item.finish} · ${Math.round(loadout.weapon.damage * loadout.perks.damage)} dmg · ${p.maxHp} hp`}
            </Txt>
            <Btn label="Resume" icon="play" onPress={() => setPaused(false)} />
            <Btn label="Quit run" icon="exit-run" variant="secondary" onPress={() => router.back()} />
          </View>
        </View>
      )}

      {/* the end */}
      {s.over && (
        <View style={styles.overlay}>
          <View style={styles.card}>
            <Txt variant="title" center color={s.won ? '#5CE0B0' : '#FF5C5C'}>
              {s.won ? (s.bossDown ? 'dawn. the butcher is dead.' : 'you made it to dawn') : 'overrun'}
            </Txt>
            <Txt center color="#C3CAD3">{`${fmt(s.t)} survived · ${s.kills} kills · level ${p.level}`}</Txt>
            <Txt center variant="bodyStrong" color="#FFD23F">{`+${paid ?? 0} shards`}</Txt>
            <Btn label="Again" icon="restart" onPress={restart} />
            <Btn label="Home" icon="home" variant="secondary" onPress={() => router.back()} />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#232528', overflow: 'hidden' },
  flex: { flex: 1 },
  player: { position: 'absolute', width: 92, height: 92 },
  gun: { position: 'absolute', width: 34, height: 15, transformOrigin: '6px 8px' },
  stick: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  knob: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.45)' },
  hud: { position: 'absolute', left: 0, right: 0, top: 0 },
  hudRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingTop: 8 },
  hudBtn: { width: 38, height: 38, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  bar: { height: 10, borderRadius: 3, backgroundColor: 'rgba(0,0,0,0.5)', overflow: 'hidden' },
  thin: { height: 5, marginTop: 4 },
  fill: { height: '100%' },
  clock: { alignItems: 'flex-end' },
  banner: { marginTop: 8 },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(10,10,14,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: { width: '100%', maxWidth: 380, gap: 10, padding: 18, borderRadius: 10, backgroundColor: '#1B1D22', borderWidth: 1, borderColor: '#3A3F48' },
  choice: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 8, backgroundColor: '#262A31' },
});

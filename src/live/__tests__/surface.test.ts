/**
 * The Lock Screen layouts run outside the app, in a small runtime that only knows the
 * Expo UI components and the props it is handed. Nothing here can load that runtime,
 * so these tests compile each layout the way the bundler does and run it in a stand-in
 * that offers exactly the same names. A layout that reaches for anything else, or uses
 * a component the installed native renderer cannot draw, fails here instead of on a phone.
 */
import { transformFileSync } from '@babel/core';
import fs from 'fs';
import path from 'path';

import { templateById } from '@/data/questCatalog';
import { addQuestFromTemplate, completeQuest, initialData, logWater } from '@/game/engine';
import { buildLiveProps, LiveProps } from '@/game/live';
import { QuestTemplate } from '@/game/types';
import { liveLook } from '@/live/look';
import { DEFAULT_THEME } from '@/theme/themes';

type Node = { type: string; props: Record<string, unknown> };
type Sections = Record<string, Node>;

const root = path.join(__dirname, '../../..');
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

/** Names inside string literals followed by `:`, `,` or `->`: how both native renderers list what they draw. */
const quotedNames = (source: string) => new Set([...source.matchAll(/"(\w+)"\s*(?::|,|->)/g)].map((m) => m[1]));

function importsFrom(source: string, module: string): string[] {
  const match = source.match(new RegExp(`import \\{([^}]+)\\} from '${module.replace(/[/-]/g, '\\$&')}';`));
  return match
    ? match[1]
        .split(',')
        .map((name) => name.trim())
        .filter(Boolean)
    : [];
}

/** Compiles a surface file for a platform and returns its layout as the widget runtime would receive it. */
function compileLayout(file: string, platform: 'ios' | 'android'): string {
  const result = transformFileSync(path.join(root, file), {
    presets: [require.resolve('babel-preset-expo')],
    caller: { name: 'metro', platform, bundler: 'metro', isDev: false } as never,
    babelrc: false,
    configFile: false,
    ast: true,
    code: false,
  });
  for (const statement of result?.ast?.program.body ?? []) {
    if (statement.type !== 'VariableDeclaration') continue;
    for (const declaration of statement.declarations) {
      if (declaration.id.type === 'Identifier' && declaration.id.name === 'layout' && declaration.init?.type === 'TemplateLiteral') {
        return declaration.init.quasis[0].value.cooked ?? '';
      }
    }
  }
  throw new Error(`${file}: the layout was not compiled into a widget function`);
}

/** Runs a compiled layout with only the given names in reach, recording what it draws. */
function run(layout: string, components: string[], modifiers: string[], props: LiveProps) {
  const used = { components: new Set<string>(), modifiers: new Set<string>() };
  const jsx = (type: string, nodeProps: Record<string, unknown>): Node => {
    used.components.add(type);
    return { type, props: nodeProps };
  };
  const scope: Record<string, unknown> = { _jsx: jsx, _jsxs: jsx };
  for (const name of components) scope[name] = name;
  for (const name of modifiers) {
    scope[name] = (...args: unknown[]) => {
      used.modifiers.add(name);
      return { $type: name, args };
    };
  }
  // Strict mode makes a stray outside name a ReferenceError rather than a silent global lookup.
  const build = new Function(...Object.keys(scope), `"use strict"; return (${layout});`);
  const sections = build(...Object.values(scope))(props) as Sections;
  return { sections, used };
}

function find(node: unknown, test: (n: Node) => boolean): Node | undefined {
  if (Array.isArray(node)) {
    for (const child of node) {
      const hit = find(child, test);
      if (hit) return hit;
    }
    return undefined;
  }
  if (!node || typeof node !== 'object' || !('type' in node)) return undefined;
  const n = node as Node;
  return test(n) ? n : find(n.props?.children, test);
}

const text = (node: unknown): string => {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(text).join(' ');
  if (node && typeof node === 'object' && 'props' in node) {
    const props = (node as Node).props;
    return [props.label, text(props.children)].filter(Boolean).join(' ');
  }
  return '';
};

function sampleProps(): LiveProps {
  const at = (hour: number) => new Date(2026, 10, 12, hour);
  let data = { ...initialData(), onboarded: true };
  data = addQuestFromTemplate(data, templateById('bed') as QuestTemplate, at(7)).data;
  data = addQuestFromTemplate(data, templateById('read') as QuestTemplate, at(7)).data;
  data = completeQuest(data, data.quests[1].id, at(8)).data;
  data = logWater(data, 500, at(9)).data;
  return buildLiveProps(data, at(10), liveLook(DEFAULT_THEME));
}

describe('iOS Live Activity layout', () => {
  const file = 'src/live/surface.ios.tsx';
  const source = read(file);
  const components = importsFrom(source, '@expo/ui/swift-ui');
  const modifiers = importsFrom(source, '@expo/ui/swift-ui/modifiers');
  const drawable = quotedNames(read('node_modules/expo-widgets/ios/Widgets/ViewRenderer.swift'));
  const layout = compileLayout(file, 'ios');

  it('is self-contained and fills every Lock Screen and Dynamic Island region', () => {
    const { sections } = run(layout, components, modifiers, sampleProps());
    expect(Object.keys(sections).sort()).toEqual(
      ['banner', 'compactLeading', 'compactTrailing', 'expandedBottom', 'expandedCenter', 'expandedLeading', 'expandedTrailing', 'minimal'].sort()
    );
  });

  it('only uses components the installed renderer can draw', () => {
    const { used } = run(layout, components, modifiers, sampleProps());
    expect(used.components.size).toBeGreaterThan(0);
    for (const name of used.components) {
      expect(`${name}: ${drawable.has(name) || drawable.has(`${name}View`)}`).toBe(`${name}: true`);
    }
  });

  it('shows the latest achievement, both meters and working shortcuts', () => {
    const props = sampleProps();
    const { sections } = run(layout, components, modifiers, props);
    const banner = text(sections.banner);
    expect(banner).toContain('Achievement unlocked');
    expect(banner).toContain(props.title);
    expect(banner).toContain(props.foodLabel);
    expect(banner).toContain('0.5 / 2 L');

    const bars = [0, 1].map((i) => {
      let seen = -1;
      return find(sections.banner, (n) => n.type === 'ProgressView' && (seen += 1) === i);
    });
    expect(bars.map((bar) => bar?.props.value)).toEqual([props.food, props.water]);

    const links = ['urlWater', 'urlFood', 'urlScan'].map((key) =>
      find(sections.banner, (n) => n.type === 'Link' && n.props.destination === props[key as keyof LiveProps])
    );
    expect(links.every(Boolean)).toBe(true);
    expect(links[0]?.props.label).toBe('+250 ml');
  });

  it('copes with a day where nothing is unlocked yet', () => {
    const props = { ...sampleProps(), points: 0, title: 'Clear a quest to get started', headline: 'Nothing unlocked yet today' };
    expect(text(run(layout, components, modifiers, props).sections.banner)).toContain('Clear a quest to get started');
  });
});

describe('Android notification layout', () => {
  const file = 'src/live/surface.android.tsx';
  const source = read(file);
  const components = importsFrom(source, '@expo/ui/jetpack-compose');
  const modifiers = importsFrom(source, '@expo/ui/jetpack-compose/modifiers');
  const supported = quotedNames(read('node_modules/expo-widgets/android/src/main/java/expo/modules/widgets/ExpoWidgetEmittableTree.kt'));
  const layout = compileLayout(file, 'android');

  it('is self-contained and has collapsed and expanded views', () => {
    const { sections } = run(layout, components, modifiers, sampleProps());
    expect(Object.keys(sections).sort()).toEqual(['collapsed', 'expanded']);
  });

  it('only uses components and modifiers the installed renderer supports', () => {
    const { used } = run(layout, components, modifiers, sampleProps());
    expect(used.components.size).toBeGreaterThan(0);
    for (const name of used.components) {
      expect(`${name}: ${supported.has(name) || supported.has(`${name}View`)}`).toBe(`${name}: true`);
    }
    for (const name of used.modifiers) {
      expect(`${name}: ${supported.has(name)}`).toBe(`${name}: true`);
    }
  });

  it('adds water from its own button and shows it before the app has recorded it', () => {
    const props = sampleProps();
    const first = run(layout, components, modifiers, props).sections;
    expect(text(first.expanded)).toContain('0.5 / 2 L');

    const button = find(first.expanded, (n) => n.type === 'FilledTonalButton');
    expect(text(button)).toBe('+250 ml');
    const change = (button?.props.onClick as () => Partial<LiveProps>)();
    expect(change).toEqual({ pendingWaterMl: 250 });

    const after = run(layout, components, modifiers, { ...props, ...change }).sections;
    expect(text(after.expanded)).toContain('0.75 / 2 L');
    const bar = find(after.expanded, (n) => n.type === 'LinearProgressIndicator' && n.props.color === props.waterColor);
    expect(bar?.props.progress).toBeCloseTo(0.375);
  });

  it('reads out in ounces for US units', () => {
    const props = { ...sampleProps(), units: 'us' as const };
    expect(text(run(layout, components, modifiers, props).sections.expanded)).toContain('17 / 68 oz');
  });
});

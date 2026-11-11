import { templateById } from '@/data/questCatalog';
import { addQuestFromTemplate, completeQuest, initialData, logWater, setProfile } from '../engine';
import { buildLiveProps, latestUnlock, LiveLook, parseWaterLink, waterReadout, waterStep } from '../live';
import { QuestTemplate } from '../types';

const look: LiveLook = {
  bg: '#000',
  text: '#fff',
  dim: '#aaa',
  accent: '#0f0',
  hpColor: '#f00',
  foodColor: '#fa0',
  waterColor: '#0af',
  unlockHeadline: 'Achievement unlocked',
};
const at = (hour: number, minute = 0) => new Date(2026, 10, 11, hour, minute);
const tpl = (id: string) => templateById(id) as QuestTemplate;

function seeded() {
  let data = setProfile(initialData(), { name: 'Kei' });
  data = addQuestFromTemplate(data, tpl('bed'), at(7)).data;
  data = addQuestFromTemplate(data, tpl('read'), at(7)).data;
  return data;
}

describe('live surface payload', () => {
  it('describes an untouched morning', () => {
    const props = buildLiveProps(seeded(), at(7), look);
    expect(props).toMatchObject({
      player: 'Kei · LV 1 · Rank E',
      headline: 'Nothing unlocked yet today',
      title: 'Clear a quest to get started',
      points: 0,
      questsDone: 0,
      questsTotal: 2,
      hp: 100,
      food: 0,
      water: 0,
      foodLabel: '0 / 2200 kcal',
      waterLabel: '0 / 2 L',
      waterStepMl: 250,
      waterStepLabel: '+250 ml',
      urlWater: 'achievl://log-water?ml=250',
      urlFood: 'achievl://food-add',
      urlScan: 'achievl://scan',
      bg: '#000',
    });
  });

  it('keeps health full on the day the player joined', () => {
    const data = { ...seeded(), joinedOn: '2026-11-11' };
    expect(buildLiveProps(data, at(22), look).hp).toBe(100);
    expect(buildLiveProps(seeded(), at(22), look).hp).toBeLessThan(50);
  });

  it('prompts for a quest when the board is empty', () => {
    expect(buildLiveProps(initialData(), at(9), look).title).toBe('Add a quest to get started');
  });

  it('shows the latest unlock and the day so far', () => {
    let data = seeded();
    data = completeQuest(data, data.quests[0].id, at(8)).data; // bed + "Press Start" milestone
    data = logWater(data, 500, at(9)).data;
    const props = buildLiveProps(data, at(9, 30), look);
    // The milestone fires in the same instant as the quest and is announced after it.
    expect(props.headline).toBe('Achievement unlocked');
    expect(props.title).toBe('Press Start');
    expect(props.points).toBe(10);
    expect(props).toMatchObject({ questsDone: 1, questsTotal: 2, dayPoints: 5, water: 0.25, waterLabel: '0.5 / 2 L', waterMl: 500 });
  });

  it('prefers a later quest over an earlier milestone', () => {
    let data = seeded();
    data = completeQuest(data, data.quests[0].id, at(8)).data;
    data = completeQuest(data, data.quests[1].id, at(20)).data;
    expect(latestUnlock(data, '2026-11-11')).toMatchObject({ title: 'Read 20 Pages', points: 20 });
  });

  it('ignores unlocks from other days', () => {
    let data = seeded();
    data = completeQuest(data, data.quests[0].id, new Date(2026, 10, 10, 8)).data;
    expect(latestUnlock(data, '2026-11-11')).toBeNull();
  });

  it('clamps overfilled meters for the progress bars', () => {
    let data = seeded();
    for (let i = 0; i < 6; i += 1) data = logWater(data, 500, at(10 + i)).data;
    const props = buildLiveProps(data, at(18), look);
    expect(props.water).toBe(1);
    expect(props.waterLabel).toBe('3 / 2 L');
  });

  it('switches the quick-add size and readout with units', () => {
    expect(waterStep('metric')).toEqual({ ml: 250, label: '+250 ml' });
    expect(waterStep('us')).toEqual({ ml: 237, label: '+8 oz' });
    expect(waterReadout(1250, 2000, 'metric')).toBe('1.25 / 2 L');
    expect(waterReadout(1250, 2000, 'us')).toBe('42 / 68 oz');
    const props = buildLiveProps({ ...seeded(), units: 'us' }, at(9), look);
    expect(props.urlWater).toBe('achievl://log-water?ml=237');
  });

  it('only accepts sensible amounts from a water link', () => {
    expect(parseWaterLink('250')).toBe(250);
    expect(parseWaterLink(['236.6'])).toBe(237);
    expect(parseWaterLink('5')).toBeNull();
    expect(parseWaterLink('999999')).toBeNull();
    expect(parseWaterLink('abc')).toBeNull();
    expect(parseWaterLink(undefined)).toBeNull();
  });
});

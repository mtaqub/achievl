import { BUILTIN_FOODS } from '@/data/foods';
import { QUEST_CATALOG, templateById } from '@/data/questCatalog';
import {
  addQuest,
  addQuestFromTemplate,
  archiveQuest,
  bestStreak,
  buildMilestoneContext,
  completeOnboarding,
  completeQuest,
  currentStreak,
  daySummary,
  GameData,
  getDay,
  initialData,
  logFood,
  logWater,
  questsForDay,
  recordScan,
  removeFood,
  setGoals,
  setSocial,
  setTheme,
  uncompleteQuest,
  undoWater,
  updateQuest,
} from '../engine';
import { levelFromXp } from '../leveling';
import { QuestTemplate } from '../types';

const at = (day: string, hour = 9) => {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d, hour);
};
const MON = '2026-11-09';
const TUE = '2026-11-10';
const WED = '2026-11-11';
const SAT = '2026-11-14';

const tpl = (id: string): QuestTemplate => templateById(id) as QuestTemplate;
const food = (id: string) => BUILTIN_FOODS.find((f) => f.id === `builtin:${id}`)!;

function withQuests(ids: string[], day = MON): GameData {
  let data = initialData();
  for (const id of ids) data = addQuestFromTemplate(data, tpl(id), at(day)).data;
  return data;
}

describe('quests', () => {
  it('adds catalog quests once and orders the board by time of day', () => {
    let data = withQuests(['read', 'pushups', 'bed']);
    data = addQuestFromTemplate(data, tpl('bed'), at(MON)).data;
    expect(questsForDay(data, MON).map((q) => q.templateId)).toEqual(['bed', 'read', 'pushups']);
  });

  it('pays XP and stats on completion and announces it', () => {
    const data = withQuests(['pushups']);
    const quest = data.quests[0];
    const { data: after, toasts } = completeQuest(data, quest.id, at(MON));
    // 15 for the quest + 10 for the "Press Start" milestone
    expect(after.xp).toBe(25);
    expect(after.stats.STR).toBe(3);
    expect(getDay(after, MON).completions[quest.id]).toMatchObject({ points: 15, title: '20 Push-ups' });
    expect(toasts.map((t) => t.kind)).toEqual(['quest', 'milestone']);
    expect(toasts[0]).toMatchObject({ title: '20 Push-ups', points: 15 });
    expect(after.unlocked['press-start']).toBeDefined();
  });

  it('cannot complete the same quest twice in a day', () => {
    const data = withQuests(['pushups']);
    const id = data.quests[0].id;
    const once = completeQuest(data, id, at(MON)).data;
    const twice = completeQuest(once, id, at(MON, 15));
    expect(twice.data).toBe(once);
    expect(twice.toasts).toEqual([]);
  });

  it('undo returns exactly what the quest paid but keeps the milestone', () => {
    const data = withQuests(['pushups']);
    const id = data.quests[0].id;
    const done = completeQuest(data, id, at(MON)).data;
    const undone = uncompleteQuest(done, id, at(MON)).data;
    expect(undone.xp).toBe(10);
    expect(undone.stats.STR).toBe(0);
    expect(getDay(undone, MON).completions).toEqual({});
    expect(undone.unlocked['press-start']).toBeDefined();
  });

  it('resets daily quests each day', () => {
    const data = withQuests(['bed']);
    const id = data.quests[0].id;
    const mon = completeQuest(data, id, at(MON)).data;
    expect(getDay(mon, TUE).completions[id]).toBeUndefined();
    const tue = completeQuest(mon, id, at(TUE)).data;
    expect(Object.keys(getDay(tue, TUE).completions)).toEqual([id]);
  });

  it('respects weekday and weekend schedules', () => {
    let data = initialData();
    data = addQuest(data, { title: 'Commute Podcast', icon: 'music', points: 10, stat: 'INT', category: 'mind', slot: 'morning', repeat: 'weekdays' }, at(MON)).data;
    data = addQuest(data, { title: 'Long Hike', icon: 'walk', points: 40, stat: 'AGI', category: 'body', slot: 'anytime', repeat: 'weekends' }, at(MON)).data;
    expect(questsForDay(data, MON).map((q) => q.title)).toEqual(['Commute Podcast']);
    expect(questsForDay(data, SAT).map((q) => q.title)).toEqual(['Long Hike']);
  });

  it('carries a one-off quest forward until it is done, then drops it', () => {
    let data = initialData();
    data = addQuest(data, { title: 'Renew Passport', icon: 'flag-checkered', points: 50, stat: 'WIL', category: 'home', slot: 'anytime', repeat: 'once' }, at(MON)).data;
    const id = data.quests[0].id;
    expect(questsForDay(data, TUE)).toHaveLength(1);
    data = completeQuest(data, id, at(TUE)).data;
    expect(questsForDay(data, TUE)).toHaveLength(1);
    expect(questsForDay(data, WED)).toHaveLength(0);
    data = uncompleteQuest(data, id, at(TUE)).data;
    expect(questsForDay(data, WED)).toHaveLength(1);
  });

  it('does not show a quest on days before it existed', () => {
    const data = withQuests(['bed'], TUE);
    expect(questsForDay(data, MON)).toHaveLength(0);
  });

  it('archives a quest without losing its history', () => {
    const data = withQuests(['bed', 'read']);
    const id = data.quests[0].id;
    const done = completeQuest(data, id, at(MON)).data;
    const archived = archiveQuest(done, id, at(MON)).data;
    expect(questsForDay(archived, MON)).toHaveLength(1);
    expect(getDay(archived, MON).completions[id].title).toBe('Make the Bed');
    expect(archived.xp).toBe(done.xp);
    // and the catalog entry can be added again
    expect(addQuestFromTemplate(archived, tpl('bed'), at(TUE)).data.quests).toHaveLength(3);
  });

  it('edits a quest in place', () => {
    const data = withQuests(['bed']);
    const id = data.quests[0].id;
    const edited = updateQuest(data, id, { title: '  Make the Bed Properly ', points: 10 }, at(MON)).data;
    expect(edited.quests[0]).toMatchObject({ title: 'Make the Bed Properly', points: 10 });
    expect(updateQuest(edited, id, { title: '   ' }, at(MON)).data.quests[0].title).toBe('Make the Bed Properly');
  });

  it('counts custom quests toward the designer milestone', () => {
    const { data, toasts } = addQuest(initialData(), { title: 'Feed the Cat', icon: 'cat', points: 5, stat: 'CHA', category: 'home', slot: 'morning', repeat: 'daily' }, at(MON));
    expect(data.counters.customQuests).toBe(1);
    expect(toasts.map((t) => t.title)).toEqual(['Quest Designer']);
  });

  it('ignores blank quest titles', () => {
    const out = addQuest(initialData(), { title: '  ', icon: 'cat', points: 5, stat: 'CHA', category: 'home', slot: 'morning', repeat: 'daily' }, at(MON));
    expect(out.data.quests).toHaveLength(0);
  });
});

describe('streaks and perfect days', () => {
  it('tracks the current and best streak', () => {
    let data = withQuests(['bed']);
    const id = data.quests[0].id;
    data = completeQuest(data, id, at(MON)).data;
    data = completeQuest(data, id, at(TUE)).data;
    expect(currentStreak(data.days, TUE)).toBe(2);
    // still alive the next morning before anything is cleared
    expect(currentStreak(data.days, WED)).toBe(2);
    // broken after a full missed day
    expect(currentStreak(data.days, '2026-11-12')).toBe(0);
    data = completeQuest(data, id, at(SAT)).data;
    expect(currentStreak(data.days, SAT)).toBe(1);
    expect(bestStreak(data.days)).toBe(2);
  });

  it('unlocks Combo x3 on the third day in a row', () => {
    let data = withQuests(['bed']);
    const id = data.quests[0].id;
    data = completeQuest(data, id, at(MON)).data;
    data = completeQuest(data, id, at(TUE)).data;
    const third = completeQuest(data, id, at(WED));
    expect(third.toasts.map((t) => t.title)).toContain('Combo x3');
  });

  it('marks a perfect day only when all 3+ quests are cleared', () => {
    let data = withQuests(['bed', 'read', 'pushups']);
    const [a, b, c] = data.quests.map((q) => q.id);
    data = completeQuest(data, a, at(MON)).data;
    data = completeQuest(data, b, at(MON)).data;
    expect(daySummary(data, MON)).toMatchObject({ cleared: 2, planned: 3, perfect: false, points: 25 });
    const last = completeQuest(data, c, at(MON));
    expect(daySummary(last.data, MON).perfect).toBe(true);
    expect(last.toasts.map((t) => t.title)).toContain('Perfect Run');
  });

  it('does not call two quests a perfect day', () => {
    let data = withQuests(['bed', 'read']);
    for (const q of data.quests) data = completeQuest(data, q.id, at(MON)).data;
    expect(daySummary(data, MON).perfect).toBe(false);
  });
});

describe('leveling up', () => {
  it('announces a level and a rank change', () => {
    let data = initialData();
    data = addQuest(data, { title: 'Big One', icon: 'sword', points: 50, stat: 'STR', category: 'body', slot: 'anytime', repeat: 'daily' }, at(MON)).data;
    data = { ...data, xp: 800 }; // level 5 starts at 820
    expect(levelFromXp(data.xp).level).toBe(4);
    const { data: after, toasts } = completeQuest(data, data.quests[0].id, at(MON));
    expect(levelFromXp(after.xp).level).toBe(5);
    expect(toasts.map((t) => t.kind)).toEqual(expect.arrayContaining(['level', 'rank', 'milestone']));
    expect(toasts.find((t) => t.kind === 'rank')?.title).toBe('Rank D');
    expect(after.unlocked['tutorial-over']).toBeDefined();
  });
});

describe('food and water', () => {
  it('logs food, pays its gain and remembers nothing for built-ins', () => {
    const { data, toasts } = logFood(initialData(), food('chicken-breast'), 1, 'lunch', at(MON, 12));
    const entry = getDay(data, MON).foods[0];
    expect(entry).toMatchObject({ servings: 1, meal: 'lunch' });
    expect(data.xp).toBe(entry.gain.xp + 10); // + First Bite
    expect(data.stats.STR).toBeCloseTo(3.1);
    expect(data.myFoods).toHaveLength(0);
    expect(toasts.map((t) => t.title)).toEqual(['First Bite']);
  });

  it('removing a food entry returns its gain', () => {
    const logged = logFood(initialData(), food('chicken-breast'), 2, 'dinner', at(MON, 19)).data;
    const entry = getDay(logged, MON).foods[0];
    const removed = removeFood(logged, MON, entry.id).data;
    expect(getDay(removed, MON).foods).toHaveLength(0);
    expect(removed.stats.STR).toBe(0);
    expect(removed.xp).toBe(10); // milestone bonus stays
  });

  it('remembers custom and scanned foods, most recent first', () => {
    const custom = { ...food('oatmeal'), id: 'custom:1', source: 'custom' as const, name: 'My Oats' };
    const scanned = { ...food('cola'), id: 'scan:049000028911', source: 'scan' as const, barcode: '049000028911' };
    let data = logFood(initialData(), custom, 1, 'breakfast', at(MON)).data;
    data = logFood(data, scanned, 1, 'snack', at(MON, 15)).data;
    data = logFood(data, custom, 1, 'breakfast', at(TUE)).data;
    expect(data.myFoods.map((f) => f.id)).toEqual(['custom:1', 'scan:049000028911']);
  });

  it('unlocks the top-grade and scanner milestones', () => {
    const top = logFood(initialData(), food('broccoli'), 1, 'dinner', at(MON));
    expect(top.toasts.map((t) => t.title)).toEqual(expect.arrayContaining(['First Bite', 'Top-Grade Fuel']));
    expect(recordScan(initialData(), at(MON)).toasts.map((t) => t.title)).toEqual(['Scanner Online']);
  });

  it('pays water XP only up to the goal and fills the tank', () => {
    let data = initialData();
    let toasts: string[] = [];
    for (let i = 0; i < 5; i += 1) {
      const out = logWater(data, 500, at(MON, 9 + i));
      data = out.data;
      toasts = toasts.concat(out.toasts.map((t) => t.title));
    }
    expect(getDay(data, MON).water).toHaveLength(5);
    expect(data.stats.VIT).toBe(2);
    expect(data.xp).toBe(20 + 15); // 20 for water, 15 for Full Tank
    expect(toasts).toEqual(['Full Tank']);
  });

  it('undoes the last water entry', () => {
    let data = logWater(initialData(), 250, at(MON)).data;
    data = logWater(data, 500, at(MON, 10)).data;
    data = undoWater(data, at(MON, 11)).data;
    expect(getDay(data, MON).water.map((w) => w.ml)).toEqual([250]);
    expect(data.xp).toBe(3);
    expect(undoWater(initialData(), at(MON)).data.xp).toBe(0);
  });

  it('counts calorie and protein goal days', () => {
    let data = setGoals(initialData(), { kcal: 500, protein: 60 });
    data = logFood(data, food('chicken-rice'), 1, 'dinner', at(MON)).data; // 480 kcal, 38 g
    expect(buildMilestoneContext(data)).toMatchObject({ calorieTargetDays: 1, proteinGoalDays: 0 });
    data = logFood(data, food('whey'), 1, 'snack', at(TUE)).data;
    data = logFood(data, food('chicken-breast'), 2, 'dinner', at(TUE)).data; // 86 g protein
    expect(buildMilestoneContext(data).proteinGoalDays).toBe(1);
  });

  it('ignores nonsense goal values', () => {
    const data = setGoals(initialData(), { kcal: -5, waterMl: Number.NaN, protein: 150.4 });
    expect(data.goals).toMatchObject({ kcal: 2200, waterMl: 2000, protein: 150 });
  });
});

describe('socials and eras', () => {
  it('links, cleans and unlinks a handle', () => {
    const linked = setSocial(initialData(), 'twitch', ' @@achievl ', at(MON));
    expect(linked.data.socials).toEqual({ twitch: 'achievl' });
    expect(linked.toasts.map((t) => t.title)).toEqual(['Party Up']);
    expect(setSocial(linked.data, 'twitch', '  ', at(MON)).data.socials).toEqual({});
  });

  it('remembers which eras were tried', () => {
    let data = setTheme(initialData(), 'wave', at(MON)).data;
    data = setTheme(data, 'wave', at(MON)).data;
    expect(data.counters.themesTried).toEqual(['blades', 'wave']);
    const third = setTheme(data, 'bit8', at(MON));
    expect(third.data.themeId).toBe('bit8');
    expect(third.toasts.map((t) => t.title)).toEqual(['Time Traveler']);
  });
});

describe('onboarding', () => {
  it('sets up the player, era and starter quests in one go', () => {
    const templates = QUEST_CATALOG.slice(0, 3);
    const { data } = completeOnboarding(initialData(), { name: '  Kei  ', themeId: 'wave', templates }, at(MON));
    expect(data.onboarded).toBe(true);
    expect(data.profile.name).toBe('Kei');
    expect(data.themeId).toBe('wave');
    expect(data.quests).toHaveLength(3);
    expect(getDay(data, MON).planned).toBe(3);
  });

  it('keeps the default name when none is given', () => {
    const { data } = completeOnboarding(initialData(), { name: '', themeId: 'blades', templates: [] }, at(MON));
    expect(data.profile.name).toBe('Player One');
  });
});

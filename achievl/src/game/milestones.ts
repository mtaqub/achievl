export type Tier = 'bronze' | 'silver' | 'gold' | 'platinum';

/** Everything a milestone can be measured against, computed from saved data. */
export interface MilestoneContext {
  questsCleared: number;
  bestStreak: number;
  perfectDays: number;
  customQuests: number;
  level: number;
  foodsLogged: number;
  topGradeFoods: number;
  scans: number;
  waterGoalDays: number;
  calorieTargetDays: number;
  proteinGoalDays: number;
  socialsLinked: number;
  shares: number;
  themesTried: number;
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  icon: string;
  tier: Tier;
  /** Bonus XP paid on unlock. */
  points: number;
  target: number;
  value: (ctx: MilestoneContext) => number;
}

/** Total number of eras, used by the "try them all" milestone. Kept in sync by a test. */
export const ERA_COUNT = 7;

const m = (
  id: string,
  tier: Tier,
  points: number,
  title: string,
  description: string,
  icon: string,
  target: number,
  value: Milestone['value']
): Milestone => ({ id, tier, points, title, description, icon, target, value });

export const MILESTONES: Milestone[] = [
  // Quests
  m('press-start', 'bronze', 10, 'Press Start', 'Clear your first quest.', 'play-circle', 1, (c) => c.questsCleared),
  m('warming-up', 'bronze', 15, 'Warming Up', 'Clear 10 quests.', 'fire', 10, (c) => c.questsCleared),
  m('grinder', 'silver', 30, 'Grinder', 'Clear 50 quests.', 'sword', 50, (c) => c.questsCleared),
  m('century', 'gold', 50, 'Century Club', 'Clear 100 quests.', 'medal-outline', 100, (c) => c.questsCleared),
  m('completionist', 'platinum', 150, 'Completionist', 'Clear 500 quests.', 'crown', 500, (c) => c.questsCleared),
  m('perfect-run', 'silver', 30, 'Perfect Run', 'Clear every quest in a day (3 or more).', 'check-all', 1, (c) => c.perfectDays),
  m('flawless-week', 'gold', 75, 'Flawless Week', 'Rack up 7 perfect days.', 'calendar-star', 7, (c) => c.perfectDays),
  m('quest-designer', 'bronze', 10, 'Quest Designer', 'Create a custom quest.', 'pencil-ruler', 1, (c) => c.customQuests),

  // Streaks
  m('combo-3', 'bronze', 15, 'Combo x3', 'Clear a quest 3 days in a row.', 'numeric-3-box-multiple', 3, (c) => c.bestStreak),
  m('week-one', 'silver', 40, 'Week One', 'Hold a 7-day streak.', 'calendar-week', 7, (c) => c.bestStreak),
  m('unbroken', 'gold', 100, 'Unbroken', 'Hold a 30-day streak.', 'link-variant', 30, (c) => c.bestStreak),

  // Levels
  m('tutorial-over', 'bronze', 20, 'Out of the Tutorial', 'Reach level 5 and Rank D.', 'chevron-double-up', 5, (c) => c.level),
  m('double-digits', 'silver', 40, 'Double Digits', 'Reach level 10 and Rank C.', 'chevron-triple-up', 10, (c) => c.level),
  m('high-roller', 'gold', 80, 'High Roller', 'Reach level 20 and Rank B.', 'medal', 20, (c) => c.level),
  m('legend', 'platinum', 200, 'Legend Status', 'Reach level 50 and Rank S.', 'trophy-award', 50, (c) => c.level),

  // Fuel
  m('first-bite', 'bronze', 10, 'First Bite', 'Log your first food.', 'silverware-fork-knife', 1, (c) => c.foodsLogged),
  m('food-critic', 'silver', 30, 'Food Critic', 'Log 50 foods.', 'clipboard-list', 50, (c) => c.foodsLogged),
  m('scanner-online', 'bronze', 15, 'Scanner Online', 'Scan a barcode.', 'barcode-scan', 1, (c) => c.scans),
  m('top-grade', 'bronze', 15, 'Top-Grade Fuel', 'Log an S-grade food.', 'star-circle', 1, (c) => c.topGradeFoods),
  m('full-tank', 'bronze', 15, 'Full Tank', 'Fill the water meter in a day.', 'cup-water', 1, (c) => c.waterGoalDays),
  m('hydro-habit', 'silver', 40, 'Hydro Habit', 'Fill the water meter on 7 days.', 'waves', 7, (c) => c.waterGoalDays),
  m('on-target', 'silver', 25, 'On Target', 'Land within 10% of your calorie goal.', 'bullseye-arrow', 1, (c) => c.calorieTargetDays),
  m('protein-loaded', 'bronze', 15, 'Protein Loaded', 'Hit your protein goal in a day.', 'arm-flex', 1, (c) => c.proteinGoalDays),

  // Social & eras
  m('party-up', 'bronze', 10, 'Party Up', 'Link a social account.', 'account-multiple-plus', 1, (c) => c.socialsLinked),
  m('show-off', 'bronze', 10, 'Show Off', 'Share an achievement or your player card.', 'share-variant', 1, (c) => c.shares),
  m('time-traveler', 'bronze', 15, 'Time Traveler', 'Try 3 different eras.', 'history', 3, (c) => c.themesTried),
  m('historian', 'silver', 30, 'Console Historian', 'Try every era.', 'bookshelf', ERA_COUNT, (c) => c.themesTried),
];

export const TIER_ORDER: Tier[] = ['bronze', 'silver', 'gold', 'platinum'];

export function milestoneProgress(milestone: Milestone, ctx: MilestoneContext): number {
  return Math.min(1, Math.max(0, milestone.value(ctx) / milestone.target));
}

export function milestoneById(id: string): Milestone | undefined {
  return MILESTONES.find((x) => x.id === id);
}

import { QuestCategory, QuestTemplate } from '@/game/types';

export const CATEGORY_INFO: Record<QuestCategory, { name: string; icon: string }> = {
  body: { name: 'Body', icon: 'dumbbell' },
  mind: { name: 'Mind', icon: 'brain' },
  home: { name: 'Home', icon: 'home-variant' },
  care: { name: 'Self-care', icon: 'heart-pulse' },
  social: { name: 'Social', icon: 'account-group' },
  fuel: { name: 'Fuel', icon: 'food-apple' },
};

export const CATEGORY_ORDER: QuestCategory[] = ['body', 'mind', 'home', 'care', 'social', 'fuel'];

/** Allowed point values, in the spirit of console achievement scores. */
export const POINT_VALUES = [5, 10, 15, 20, 25, 30, 40, 50] as const;

/** Icons offered when building a custom quest. */
export const QUEST_ICONS = [
  'star-four-points',
  'sword',
  'shield-star',
  'trophy-variant',
  'flag-checkered',
  'target',
  'lightning-bolt',
  'fire',
  'dumbbell',
  'run',
  'walk',
  'bike',
  'yoga',
  'meditation',
  'brain',
  'book-open-page-variant',
  'school',
  'pencil',
  'laptop',
  'music',
  'palette',
  'translate',
  'bed',
  'broom',
  'washing-machine',
  'chef-hat',
  'cart',
  'cash-check',
  'toothbrush',
  'pill',
  'shower-head',
  'white-balance-sunny',
  'phone',
  'message-text',
  'account-group',
  'hand-heart',
  'dog-side',
  'cat',
  'flower',
  'cup-water',
  'food-apple',
  'carrot',
] as const;

const t = (
  id: string,
  category: QuestCategory,
  title: string,
  description: string,
  icon: string,
  points: number,
  stat: QuestTemplate['stat'],
  slot: QuestTemplate['slot'] = 'anytime'
): QuestTemplate => ({ id, category, title, description, icon, points, stat, slot });

export const QUEST_CATALOG: QuestTemplate[] = [
  // Body
  t('stretch', 'body', 'Morning Stretch', 'Five minutes of stretching before the day starts.', 'human-handsup', 10, 'AGI', 'morning'),
  t('pushups', 'body', '20 Push-ups', 'Any variation. Break them up if you need to.', 'arm-flex', 15, 'STR'),
  t('walk', 'body', 'Take a Walk', 'Twenty minutes on foot, outside if you can.', 'walk', 15, 'AGI', 'afternoon'),
  t('steps', 'body', '10,000 Steps', 'Hit ten thousand steps before midnight.', 'shoe-print', 30, 'AGI'),
  t('workout', 'body', 'Workout Session', 'Thirty minutes or more of real training.', 'dumbbell', 40, 'STR'),
  t('run', 'body', 'Go for a Run', 'Any distance, any pace. Lace up and go.', 'run', 30, 'AGI'),
  t('yoga', 'body', 'Yoga Flow', 'A full session on the mat.', 'yoga', 20, 'AGI'),
  t('stairs', 'body', 'Take the Stairs', 'Skip the lift at least once today.', 'stairs-up', 5, 'AGI'),
  t('plank', 'body', 'Two-Minute Plank', 'Hold it for two minutes total.', 'timer-outline', 10, 'STR'),
  t('bike', 'body', 'Bike Ride', 'Get somewhere on two wheels.', 'bike', 25, 'AGI'),

  // Mind
  t('read', 'mind', 'Read 20 Pages', 'A real book, twenty pages.', 'book-open-page-variant', 20, 'INT', 'evening'),
  t('study', 'mind', 'Study Session', 'Forty-five focused minutes of study.', 'school', 30, 'INT'),
  t('deepwork', 'mind', 'Deep Work Block', 'Ninety minutes, one task, no distractions.', 'brain', 40, 'INT'),
  t('practice', 'mind', 'Practice a Skill', 'Instrument, language, art — put in the reps.', 'music', 20, 'INT'),
  t('journal', 'mind', 'Write in a Journal', 'A few honest lines about today.', 'notebook-edit', 10, 'INT', 'evening'),
  t('meditate', 'mind', 'Meditate', 'Ten quiet minutes.', 'meditation', 15, 'WIL', 'morning'),
  t('plan', 'mind', 'Plan Tomorrow', 'Write down the three things that matter most.', 'calendar-check', 10, 'WIL', 'evening'),
  t('inbox', 'mind', 'Inbox Zero', 'Clear or sort every unread message.', 'email-check', 15, 'WIL'),
  t('nophone', 'mind', 'No Phone First Hour', 'Stay off your phone for the first hour awake.', 'cellphone-off', 20, 'WIL', 'morning'),

  // Home
  t('bed', 'home', 'Make the Bed', 'First win of the day.', 'bed', 5, 'WIL', 'morning'),
  t('dishes', 'home', 'Do the Dishes', 'Empty sink before bed.', 'silverware-clean', 10, 'WIL', 'evening'),
  t('laundry', 'home', 'Laundry Run', 'Wash, dry and actually put it away.', 'washing-machine', 15, 'WIL'),
  t('tidy', 'home', 'Ten-Minute Tidy', 'Set a timer and reset one room.', 'broom', 10, 'WIL'),
  t('trash', 'home', 'Take Out the Trash', 'Bins out, bag replaced.', 'trash-can', 5, 'WIL'),
  t('cook', 'home', 'Cook at Home', 'Make a proper meal from scratch.', 'chef-hat', 20, 'VIT'),
  t('mealprep', 'home', 'Meal Prep', 'Batch-cook for the days ahead.', 'food-variant', 30, 'WIL'),
  t('plants', 'home', 'Water the Plants', 'Keep the party members alive.', 'watering-can', 5, 'WIL'),
  t('budget', 'home', 'Budget Check', 'Pay a bill or review your spending.', 'cash-check', 15, 'INT'),

  // Self-care
  t('brush-am', 'care', 'Brush & Floss (AM)', 'Morning teeth routine, floss included.', 'toothbrush', 5, 'VIT', 'morning'),
  t('brush-pm', 'care', 'Brush & Floss (PM)', 'Night teeth routine, floss included.', 'toothbrush-paste', 5, 'VIT', 'evening'),
  t('skincare', 'care', 'Skincare Routine', 'Cleanse, moisturise, sunscreen.', 'lotion', 5, 'VIT'),
  t('vitamins', 'care', 'Take Vitamins / Meds', 'Whatever is on your daily list.', 'pill', 5, 'VIT', 'morning'),
  t('sleep', 'care', 'Eight Hours of Sleep', 'Log it the morning after a full night.', 'sleep', 30, 'VIT', 'morning'),
  t('bedtime', 'care', 'In Bed by 11', 'Lights out before eleven.', 'bed-clock', 20, 'WIL', 'evening'),
  t('coldshower', 'care', 'Cold Shower', 'Finish with thirty seconds of cold.', 'shower-head', 15, 'WIL'),
  t('sun', 'care', 'Get Some Sun', 'Fifteen minutes of daylight.', 'white-balance-sunny', 10, 'VIT', 'afternoon'),
  t('screenfree', 'care', 'Screen-Free Hour', 'One hour with every screen off.', 'television-off', 20, 'WIL', 'evening'),

  // Social
  t('call', 'social', 'Call Family', 'A real call, not a text.', 'phone', 15, 'CHA'),
  t('message', 'social', 'Message a Friend', 'Check in on someone you have not talked to lately.', 'message-text', 10, 'CHA'),
  t('compliment', 'social', 'Give a Compliment', 'Say something kind and mean it.', 'hand-heart', 5, 'CHA'),
  t('hangout', 'social', 'Hang Out in Person', 'Time with people, face to face.', 'account-group', 25, 'CHA'),
  t('help', 'social', 'Help Someone Out', 'Do a favour without being asked.', 'handshake', 20, 'CHA'),
  t('coop', 'social', 'Co-op Session', 'Play something together with a friend.', 'controller', 15, 'CHA', 'evening'),

  // Fuel
  t('water8', 'fuel', 'Drink Eight Glasses', 'Fill the water meter all the way.', 'cup-water', 20, 'VIT'),
  t('veg', 'fuel', 'Eat a Vegetable', 'At least one real serving.', 'carrot', 10, 'VIT'),
  t('protein', 'fuel', 'Protein with Every Meal', 'Get some protein on every plate.', 'food-steak', 20, 'STR'),
  t('nosoda', 'fuel', 'No Sugary Drinks', 'Water, coffee or tea only.', 'cup-off', 15, 'WIL'),
  t('logmeals', 'fuel', 'Log Every Meal', 'Track everything you eat today.', 'clipboard-check', 15, 'WIL'),
  t('breakfast', 'fuel', 'Eat Breakfast', 'Start the day with real food.', 'egg-fried', 10, 'VIT', 'morning'),
  t('fruit', 'fuel', 'Fruit Snack', 'Swap one snack for a piece of fruit.', 'food-apple', 5, 'VIT'),
  t('nolatesnack', 'fuel', 'No Late-Night Snacks', 'Kitchen closes two hours before bed.', 'weather-night', 15, 'WIL', 'evening'),
];

/** Quests pre-selected on the first-run screen. */
export const STARTER_TEMPLATE_IDS = ['bed', 'stretch', 'water8', 'walk', 'read', 'veg', 'brush-pm'];

export function templateById(id: string): QuestTemplate | undefined {
  return QUEST_CATALOG.find((q) => q.id === id);
}

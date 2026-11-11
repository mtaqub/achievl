import { boxesEarned, boxesLeft, keysEarned, keysLeft } from '@/arcade/rules';
import { levelFromXp } from '@/game/leveling';
import { useArcade } from '@/store/useArcade';
import { useGame } from '@/store/useGame';

/** Keys, loot boxes and shards the player can spend right now. */
export function useWallet() {
  const xp = useGame((s) => s.data.xp);
  const milestones = useGame((s) => Object.keys(s.data.unlocked).length);
  const arcade = useArcade((s) => s.data);
  const earnedKeys = keysEarned(xp);
  const earnedBoxes = boxesEarned(levelFromXp(xp).level, milestones);
  return {
    earnedKeys,
    earnedBoxes,
    keys: keysLeft(arcade, earnedKeys),
    boxes: boxesLeft(arcade, earnedBoxes),
    shards: arcade.shards,
    plus: arcade.plus,
  };
}

import { expect, it } from 'vitest';
import { legacySave } from '../../tests/fixtures/progress-v1';
import { freshProgress, TABLE_ORDER, unlockedTables } from './model';
import { recoverFirstFourFriends } from './recovery';
import { parseBackup } from './storage';

it('recupera cuatro amigos y abre la siguiente tabla sin inventar aprendizaje ni perder la expedición', () => {
  const original = parseBackup(legacySave);
  const recovered = recoverFirstFourFriends(original);
  expect(recovered).toEqual({
    ...original,
    completed: [1, 2, 10, 5],
    decorations: { ...original.decorations, '10': 'flowers', '5': 'flowers' },
  });
  expect(unlockedTables(recovered)).toEqual([1, 2, 10, 5, 3]);
  expect(parseBackup(JSON.stringify(recovered))).toEqual(recovered);
  expect(original).toEqual(JSON.parse(legacySave));
});

it('permite recuperar desde cero y no reduce ni vuelve a conceder amigos', () => {
  const recovered = recoverFirstFourFriends(freshProgress());
  expect(recovered.completed).toHaveLength(4);
  expect(recovered.facts).toEqual({});
  expect(recoverFirstFourFriends(recovered)).toBe(recovered);
  const advanced = { ...recovered, completed: [...TABLE_ORDER] };
  expect(recoverFirstFourFriends(advanced)).toBe(advanced);
});

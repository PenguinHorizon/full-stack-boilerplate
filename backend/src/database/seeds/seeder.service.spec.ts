import { productionSeedPasswordProblem } from './seeder.service';

describe('productionSeedPasswordProblem', () => {
  it.each([
    ['Admin@123', /default admin password/],
    ['CHANGE_ME', /placeholder/],
    ['Change_Me_2026', /placeholder/],
    ['replace_me_Secret1', /placeholder/],
    ['short1A', /at least 8 characters/],
    ['alllowercase1', /upper- and lowercase/],
  ])('refuses %s', (password, problem) => {
    expect(productionSeedPasswordProblem(password)).toMatch(problem);
  });

  it('accepts a real password', () => {
    expect(productionSeedPasswordProblem('Tq7-vodka-Lantern-91')).toBeNull();
  });
});

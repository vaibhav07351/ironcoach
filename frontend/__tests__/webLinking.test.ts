import { webLinking } from '../app/navigation/webLinking';

type PathState = Parameters<NonNullable<typeof webLinking.getPathFromState>>[0];

describe('web linking', () => {
  const pathFor = (state: PathState): string => webLinking.getPathFromState!(state, webLinking.config);

  it('names the focused screen, nested tabs included', () => {
    const state = {
      index: 1,
      routes: [
        { name: 'TrainerTabs', state: { index: 1, routes: [{ name: 'Home' }, { name: 'Clients' }] } },
        { name: 'TraineeDetail', params: { trainee: { id: 'abc', name: 'Boss' } } },
      ],
    } as PathState;
    expect(pathFor(state)).toBe('/trainee-detail');

    const tabs = { routes: [{ name: 'TrainerTabs', state: { index: 1, routes: [{ name: 'Home' }, { name: 'Clients' }] } }] } as PathState;
    expect(pathFor(tabs)).toBe('/clients');
  });

  it('keeps params, including objects, out of the URL', () => {
    const state = {
      routes: [{ name: 'WorkoutLogForm', params: { traineeId: 'abc', log: { id: 'l1' } } }],
    } as PathState;
    expect(pathFor(state)).toBe('/workout-log-form');
  });

  it('never restores a screen from the URL', () => {
    expect(webLinking.getStateFromPath!('/trainee-detail', webLinking.config)).toBeUndefined();
  });
});

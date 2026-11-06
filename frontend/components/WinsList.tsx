import React from 'react';

import type { PREvent } from '../app/types/progress';
import { relativeDayLabel } from '../app/utils/date';
import { formatScore } from '../app/utils/exerciseFormat';
import { Avatar } from './Avatar';
import { Badge } from './Badge';
import { IconBadge } from './IconBadge';
import { ListRow } from './ListRow';
import { SectionHeader } from './SectionHeader';

type Props = {
  wins: PREvent[];
  onOpen: (traineeId: string, name: string) => void;
};

/** Recent personal records across the trainer's clients, so the coach can congratulate them. */
export function WinsList({ wins, onOpen }: Props): React.JSX.Element | null {
  if (wins.length === 0) return null;
  return (
    <>
      <SectionHeader title="Wins this week" right={<Badge label={String(wins.length)} tone="accent" />} />
      {wins.map((w) => {
        const name = w.trainee_name || 'Client';
        return (
          <ListRow
            key={`${w.trainee_id}-${w.exercise_id}-${w.date}`}
            leading={w.trainee_name ? <Avatar name={w.trainee_name} /> : <IconBadge name="trophy" tone="accent" />}
            title={`${name}: new PR`}
            subtitle={`${w.exercise}, ${formatScore(w.kind, w.value)} (was ${formatScore(w.kind, w.previous)}), ${relativeDayLabel(w.date).toLowerCase()}`}
            accessibilityLabel={`Open ${name}'s progress`}
            onPress={() => onOpen(w.trainee_id, name)}
          />
        );
      })}
    </>
  );
}

import React from 'react';

import { LoadingState } from '@/components/LoadingState';
import { Screen } from '@/components/Screen';

/** Shown while the saved session is restored. */
export default function SplashScreen(): React.JSX.Element {
  return (
    <Screen noHeader scroll={false}>
      <LoadingState />
    </Screen>
  );
}

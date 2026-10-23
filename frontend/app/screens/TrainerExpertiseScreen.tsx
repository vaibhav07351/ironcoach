import React from 'react';

import { OnboardingStep } from '@/components/OnboardingStep';
import { useAuth } from '../contexts/AuthContext';
import { completeTrainerExpertise } from '../services/authService';
import { errorMessage } from '../services/http';

/** Trainer onboarding: what they coach. Finishing it opens the trainer home automatically. */
export default function TrainerExpertiseScreen(): React.JSX.Element {
  const { setUser, signOut } = useAuth();

  return (
    <OnboardingStep
      title="What do you coach?"
      subtitle="Pick everything that applies. You can change this later in your profile."
      onSave={async (codes) => {
        try {
          await setUser(await completeTrainerExpertise(codes));
        } catch (e: unknown) {
          throw new Error(errorMessage(e));
        }
      }}
      onSignOut={() => void signOut()}
    />
  );
}

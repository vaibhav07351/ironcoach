import React from 'react';

import { OnboardingStep } from '@/components/OnboardingStep';
import { useAuth } from '../contexts/AuthContext';
import { updateClientInterests } from '../services/authService';
import { errorMessage } from '../services/http';

/** Client onboarding: what they train for. The next step (join a coach) opens automatically. */
export default function ClientInterestsScreen(): React.JSX.Element {
  const { user, setUser, signOut } = useAuth();

  return (
    <OnboardingStep
      title="What are you training for?"
      subtitle="Pick one or more. Your coach sees this when you join."
      initial={user?.interests}
      onSave={async (codes) => {
        try {
          await setUser(await updateClientInterests(codes));
        } catch (e: unknown) {
          throw new Error(errorMessage(e));
        }
      }}
      onSignOut={() => void signOut()}
    />
  );
}

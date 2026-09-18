export type UserRole = 'trainer' | 'client';

export type PublicUser = {
  id: string;
  email: string;
  name: string;
  picture?: string;
  role: UserRole;
  trainer_id?: string;
  trainee_id?: string;
  needs_onboarding: boolean;
  needs_invite: boolean;
};

export type AuthResponse = {
  token: string;
  user: PublicUser;
};

export type AdherenceSummary = {
  trainee_id: string;
  trainee_name?: string;
  week_start: string;
  workout_days: number;
  diet_days: number;
  expected_days: number;
  score: number;
  streak_days: number;
  at_risk: boolean;
  missed_yesterday: boolean;
};

export type Invite = {
  id: string;
  code: string;
  trainee_id: string;
  trainer_id: string;
  expires_at: string;
  created_at: string;
};

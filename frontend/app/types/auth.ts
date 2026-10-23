export type UserRole = 'trainer' | 'client';

export type PublicUser = {
  id: string;
  email: string;
  name: string;
  picture?: string;
  role: UserRole;
  /** The coach's user id (a trainer's own id for trainers). */
  trainer_id?: string;
  /** The client's linked client record (clients only). */
  trainee_id?: string;
  interests?: string[];
  /** IANA zone used by the server for "today", weeks and streaks. */
  timezone: string;
  needs_onboarding: boolean;
  needs_invite: boolean;
  needs_interests: boolean;
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
  /** Latest day with a workout or diet log (empty when none in the last ~4 months). */
  last_activity_date?: string;
  /** A workout was logged today (the owner's time zone). */
  trained_today: boolean;
};

export type Invite = {
  id: string;
  code: string;
  trainee_id: string;
  trainer_id: string;
  expires_at: string;
  created_at: string;
};

export type AppVersionConfig = {
  min_supported_version: string;
  latest_version: string;
};

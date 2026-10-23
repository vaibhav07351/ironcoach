import type { AdherenceSummary } from './auth';

export type PackageKind = 'sessions' | 'monthly';
export type PackageStatus = 'active' | 'used_up' | 'expired';

/** Amounts are whole paise (1 rupee = 100 paise); dates are YYYY-MM-DD. */
export type FeePackage = {
  id: string;
  trainee_id: string;
  kind: PackageKind;
  name: string;
  amount_paise: number;
  sessions?: number;
  start_date: string;
  end_date?: string;
  created_at: string;
  sessions_used: number;
  sessions_left: number;
  attended: number;
  status: PackageStatus;
};

export type Payment = {
  id: string;
  trainee_id: string;
  amount_paise: number;
  date: string;
  note?: string;
  created_at: string;
};

/** GET /fees/:trainee_id */
export type FeeSummary = {
  trainee_id: string;
  total_paise: number;
  paid_paise: number;
  due_paise: number;
  credit_paise: number;
  packages: FeePackage[];
  payments: Payment[];
};

export type PackageInput = {
  kind: PackageKind;
  name?: string;
  amount_paise: number;
  sessions?: number;
  start_date?: string;
  end_date?: string;
  client_id?: string;
};

export type PaymentInput = {
  amount_paise: number;
  date?: string;
  note?: string;
  client_id?: string;
};

export type DueItem = {
  trainee_id: string;
  name: string;
  phone_number?: string;
  due_paise: number;
};

export type TodayClient = {
  trainee_id: string;
  name: string;
};

/** GET /today (trainer). */
export type TodayOverview = {
  date: string;
  client_count: number;
  trained_today: TodayClient[];
  attended_today: TodayClient[];
  slipping: AdherenceSummary[];
  pending_requests: number;
  dues: DueItem[];
  dues_total_paise: number;
};

/** GET /dues (trainer). */
export type DuesList = {
  items: DueItem[];
  count: number;
  total_paise: number;
};

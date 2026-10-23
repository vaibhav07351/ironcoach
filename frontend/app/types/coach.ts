/** The signed-in trainer's own profile (GET /getTrainerDetails). */
export type TrainerProfile = {
  id: string;
  name: string;
  email: string;
  image_url?: string;
  bio?: string;
  speciality?: string;
  expertises?: string[];
  experience?: number;
  hourly_rate?: number;
  phone_number?: string;
  address?: string;
  headline?: string;
  city?: string;
  area?: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
  discovery_visible?: boolean;
  trainer_type?: string;
  availability?: string;
  social_handle?: string;
  /** UPI id (name@bank) used to build fee reminders. */
  upi_id?: string;
  rating?: number;
  rating_count?: number;
};

/** Fields a trainer may change on their profile. */
export type TrainerProfileUpdate = Partial<
  Pick<
    TrainerProfile,
    | 'name'
    | 'image_url'
    | 'bio'
    | 'speciality'
    | 'expertises'
    | 'experience'
    | 'hourly_rate'
    | 'phone_number'
    | 'address'
    | 'headline'
    | 'city'
    | 'area'
    | 'pincode'
    | 'latitude'
    | 'longitude'
    | 'discovery_visible'
    | 'trainer_type'
    | 'availability'
    | 'social_handle'
    | 'upi_id'
  >
>;

/** Public coach card shown to clients; never contains contact details or exact location. */
export type DiscoverTrainer = {
  id: string;
  name: string;
  image_url?: string;
  headline?: string;
  bio?: string;
  speciality?: string;
  expertises?: string[];
  experience: number;
  hourly_rate: number;
  trainer_type?: string;
  city?: string;
  area?: string;
  latitude?: number;
  longitude?: number;
  /** -1 when either side has no location. */
  distance_km: number;
  rating: number;
  rating_count?: number;
  match_tier?: 'match' | 'nearby';
};

export type CoachRequestStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled';

export type CoachRequest = {
  id: string;
  client_user_id: string;
  client_name?: string;
  client_email?: string;
  trainer_id: string;
  trainer_name?: string;
  status: CoachRequestStatus;
  created_at: string;
  resolved_at?: string;
};

export type RatingTarget = 'trainer' | 'client';

export type MyRating = {
  score: number | null;
  average: number;
  rating_count: number;
};

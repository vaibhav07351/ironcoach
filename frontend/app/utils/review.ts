/** Logged workouts needed before the app asks for a Play Store review. */
export const REVIEW_AFTER_WORKOUTS = 4;

/**
 * Ask for a review only at a success moment: the client has just logged (a workout today) and has
 * logged at least four in total. Never asks twice.
 */
export function shouldAskForReview(input: {
  workoutCount: number;
  trainedToday: boolean;
  alreadyAsked: boolean;
}): boolean {
  return !input.alreadyAsked && input.trainedToday && input.workoutCount >= REVIEW_AFTER_WORKOUTS;
}

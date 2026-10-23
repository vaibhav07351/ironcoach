/** Platform-independent shape of the Google sign-in hook (native and web implementations). */
export type GoogleSignInHook = {
  /** False until the sign-in flow can be started (web loads its request first). */
  ready: boolean;
  /**
   * Opens the Google account picker and resolves with an ID token, or null when the user
   * cancels. Throws an Error with a user-facing message on configuration or device problems.
   */
  promptIdToken: () => Promise<string | null>;
};

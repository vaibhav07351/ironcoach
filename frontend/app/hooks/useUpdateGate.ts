import { useEffect, useState } from 'react';

import { config } from '../config';
import { fetchAppVersionConfig } from '../services/accountService';
import { isUpdateRequired } from '../utils/version';

/**
 * Asks the server which app versions it supports. Returns true when this build must be updated.
 * Fails open: if the check cannot complete (offline), the app keeps working.
 */
export function useUpdateRequired(): boolean {
  const [required, setRequired] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchAppVersionConfig()
      .then((cfg) => {
        if (!cancelled) {
          setRequired(isUpdateRequired(config.appVersion, cfg.min_supported_version));
        }
      })
      .catch(() => {
        // Offline or server unreachable: do not block the app.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return required;
}

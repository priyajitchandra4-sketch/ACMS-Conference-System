import { useCallback, useEffect, useRef, useState } from 'react';
import { apiError } from '../utils/apiError';

/**
 * Autosave that never overlaps itself and can be "flushed".
 *
 *   const { status, lastSaved, error, flush } = useAutosave(values, saveFn, { delay: 1000, enabled: loaded });
 *
 *  - values:  the data to keep saved (title, abstract, ...). Saving starts `delay` ms after the last change.
 *  - saveFn:  async (values) => void. Throw when saving fails.
 *  - enabled: set to true only AFTER the data has been loaded. The values at that moment count as "already saved".
 *  - flush(): saves right now and waits until it is done. Call it before an action that needs the newest data
 *             (for example "Submit"). It rejects when saving fails, so the action can be cancelled.
 *
 * Only one save runs at a time. Changes made while a save is running are saved straight after it.
 * `status` is one of: idle | pending | saving | saved | error
 */
export function useAutosave(values, saveFn, { delay = 1000, enabled = true } = {}) {
  const [status, setStatus] = useState('idle');
  const [lastSaved, setLastSaved] = useState(null);
  const [error, setError] = useState('');

  const json = JSON.stringify(values);
  const latest = useRef(values);
  const saveRef = useRef(saveFn);
  const enabledRef = useRef(enabled);
  const baseline = useRef(null); // JSON of what the server already has (null until enabled)
  const timer = useRef(null);
  const queue = useRef(Promise.resolve());

  latest.current = values;
  saveRef.current = saveFn;
  enabledRef.current = enabled;

  const saveNow = useCallback(() => {
    const run = queue.current
      .catch(() => {}) // a failed earlier save must not block this one
      .then(async () => {
        const snapshot = latest.current; // read the newest values when it is this save's turn
        const snapshotJson = JSON.stringify(snapshot);
        if (baseline.current === null || snapshotJson === baseline.current) return;

        setStatus('saving');
        setError('');
        try {
          await saveRef.current(snapshot);
          baseline.current = snapshotJson;
          setLastSaved(new Date());
          setStatus(JSON.stringify(latest.current) === baseline.current ? 'saved' : 'pending');
        } catch (err) {
          setStatus('error');
          setError(apiError(err, 'Could not save your changes.'));
          throw err;
        }
      });
    queue.current = run;
    return run;
  }, []);

  // Schedule a save whenever the values change
  useEffect(() => {
    if (!enabled) return undefined;
    if (baseline.current === null) {
      baseline.current = json; // the values that were just loaded are already saved
      return undefined;
    }
    if (json === baseline.current) return undefined;

    setStatus('pending');
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      saveNow().catch(() => {});
    }, delay);
    return () => clearTimeout(timer.current);
  }, [json, enabled, delay, saveNow]);

  const flush = useCallback(() => {
    clearTimeout(timer.current);
    return saveNow();
  }, [saveNow]);

  // Leaving the page with unsaved changes: save them
  useEffect(
    () => () => {
      clearTimeout(timer.current);
      const dirty = baseline.current !== null && JSON.stringify(latest.current) !== baseline.current;
      if (enabledRef.current && dirty) saveNow().catch(() => {});
    },
    [saveNow]
  );

  // Closing the tab with unsaved changes: ask first
  useEffect(() => {
    if (status !== 'pending' && status !== 'saving' && status !== 'error') return undefined;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [status]);

  return { status, lastSaved, error, flush };
}
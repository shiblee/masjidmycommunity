import { useCallback, useEffect, useState } from "react";
import publicJobApi from "../services/publicJobApi.js";
import { getUserToken } from "../utils/userAuthStorage.js";

// Fired on every successful toggle so any mounted component (the Jobs
// page's ♥ Liked count chip, in particular) can react without a refetch —
// same cross-component-sync pattern as "mmc-user-session-updated".
export const JOB_FAVORITE_CHANGED_EVENT = "mmc-job-favorite-changed";

// Save/Unsave a job — mirrors useMasjidLike.js exactly (optimistic update
// with rollback on failure), used by JobCard.jsx and JobApplyPanel.jsx so
// the toggle behaves identically everywhere it appears.
export function useJobFavorite(jobId, { favorited: initialFavorited = false } = {}) {
  const [favorited, setFavorited] = useState(initialFavorited);
  const [busy, setBusy] = useState(false);

  useEffect(() => setFavorited(initialFavorited), [initialFavorited]);

  // The same job can render in more than one place at once (the main grid
  // and a "Recommended"/"Closing Soon" rail, Grid vs List view, ...) — each
  // mounts its own instance of this hook. Toggling one instance dispatches
  // the event above; every other instance for the same jobId listens here
  // and mirrors the change immediately, no refetch needed.
  useEffect(() => {
    const onFavoriteChanged = (e) => {
      if (e.detail.jobId === jobId) setFavorited(e.detail.favorited);
    };
    window.addEventListener(JOB_FAVORITE_CHANGED_EVENT, onFavoriteChanged);
    return () => window.removeEventListener(JOB_FAVORITE_CHANGED_EVENT, onFavoriteChanged);
  }, [jobId]);

  const toggle = useCallback(async () => {
    if (busy || !jobId) return { ok: false };
    if (!getUserToken()) return { ok: false, needsLogin: true };

    const next = !favorited;
    setFavorited(next);
    setBusy(true);
    try {
      if (next) await publicJobApi.post(`/${jobId}/favorite`);
      else await publicJobApi.delete(`/${jobId}/favorite`);
      window.dispatchEvent(new CustomEvent(JOB_FAVORITE_CHANGED_EVENT, { detail: { jobId, favorited: next } }));
      return { ok: true };
    } catch (err) {
      setFavorited(!next);
      return { ok: false, error: err };
    } finally {
      setBusy(false);
    }
  }, [busy, favorited, jobId]);

  return { favorited, toggle, busy };
}

export default useJobFavorite;

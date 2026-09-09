import { useCallback, useEffect, useState } from "react";
import publicJobApi from "../services/publicJobApi.js";
import { getUserToken } from "../utils/userAuthStorage.js";

// Save/Unsave a job — mirrors useMasjidLike.js exactly (optimistic update
// with rollback on failure), used by JobCard.jsx and JobApplyPanel.jsx so
// the toggle behaves identically everywhere it appears.
export function useJobFavorite(jobId, { favorited: initialFavorited = false } = {}) {
  const [favorited, setFavorited] = useState(initialFavorited);
  const [busy, setBusy] = useState(false);

  useEffect(() => setFavorited(initialFavorited), [initialFavorited]);

  const toggle = useCallback(async () => {
    if (busy || !jobId) return { ok: false };
    if (!getUserToken()) return { ok: false, needsLogin: true };

    const next = !favorited;
    setFavorited(next);
    setBusy(true);
    try {
      if (next) await publicJobApi.post(`/${jobId}/favorite`);
      else await publicJobApi.delete(`/${jobId}/favorite`);
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

import { useCallback, useEffect, useState } from "react";
import publicMasjidApi from "../services/publicMasjidApi.js";
import { getUserToken } from "../utils/userAuthStorage.js";

// One implementation of Like/Unlike, used everywhere a Like button appears
// (Grid/List/Map cards, Masjid Detail, My Masjid, Nearby, Liked Masjids,
// the Explore review modal) — optimistic update with rollback on failure,
// so the count feels instant without ever drifting from the server.
export function useMasjidLike(masjidId, { liked: initialLiked = false, likeCount: initialCount = 0 } = {}) {
  const [liked, setLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialCount);
  const [busy, setBusy] = useState(false);

  // Stay in sync when the parent's own data reloads with fresher numbers
  // (pagination, a list refetch, navigating between masjids).
  useEffect(() => setLiked(initialLiked), [initialLiked]);
  useEffect(() => setLikeCount(initialCount), [initialCount]);

  const toggle = useCallback(async () => {
    if (busy || !masjidId) return { ok: false };
    if (!getUserToken()) return { ok: false, needsLogin: true };

    const next = !liked;
    setLiked(next);
    setLikeCount((c) => Math.max(0, c + (next ? 1 : -1)));
    setBusy(true);
    try {
      if (next) await publicMasjidApi.post(`/${masjidId}/favorite`);
      else await publicMasjidApi.delete(`/${masjidId}/favorite`);
      return { ok: true };
    } catch (err) {
      setLiked(!next);
      setLikeCount((c) => Math.max(0, c + (next ? -1 : 1)));
      return { ok: false, error: err };
    } finally {
      setBusy(false);
    }
  }, [busy, liked, masjidId]);

  return { liked, likeCount, toggle, busy };
}

export default useMasjidLike;

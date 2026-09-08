import { useEffect } from "react";

// No modal in this app currently locks background scroll — the overlay is
// position:fixed (so it visually stays put), but the page behind it keeps
// scrolling on wheel/trackpad input, which can shift the footer or other
// content into view around/behind an open modal in a way that looks broken.
// A ref-counted lock (not a plain boolean) so two modals open at once
// (e.g. Donate then a nested confirmation) don't have the first one's
// unmount prematurely re-enable scrolling while the second is still open.
let lockCount = 0;
let previousOverflow = "";

export function useBodyScrollLock(locked = true) {
  useEffect(() => {
    if (!locked) return undefined;
    if (lockCount === 0) previousOverflow = document.body.style.overflow;
    lockCount += 1;
    document.body.style.overflow = "hidden";
    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) document.body.style.overflow = previousOverflow;
    };
  }, [locked]);
}

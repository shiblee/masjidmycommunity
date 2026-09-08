import { useEffect, useRef } from "react";

const FOCUSABLE = 'a[href], button:not([disabled]), textarea, input:not([disabled]), select, [tabindex]:not([tabindex="-1"])';

// Keeps Tab/Shift+Tab cycling inside a modal instead of leaking focus out to
// the page behind it, and returns focus to whatever triggered the modal once
// it closes. Returns a ref to attach to the modal's outermost element.
export function useFocusTrap(active = true) {
  const ref = useRef(null);

  useEffect(() => {
    if (!active) return undefined;
    const container = ref.current;
    if (!container) return undefined;

    const previouslyFocused = document.activeElement;
    const getFocusable = () => Array.from(container.querySelectorAll(FOCUSABLE));
    (getFocusable()[0] || container).focus();

    const onKeyDown = (e) => {
      if (e.key !== "Tab") return;
      const focusable = getFocusable();
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    container.addEventListener("keydown", onKeyDown);
    return () => {
      container.removeEventListener("keydown", onKeyDown);
      if (previouslyFocused?.focus) previouslyFocused.focus();
    };
  }, [active]);

  return ref;
}

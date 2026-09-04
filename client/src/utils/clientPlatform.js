// Trusted Web Activity / Custom Tabs launches from the installed Android app
// set document.referrer to "android-app://<package>" — a standard, documented
// way to detect that launch context with zero native code changes (the
// Android app itself is a Bubblewrap-generated TWA shell with no auth logic
// of its own; it just opens this same site inside real Chrome).
export const CLIENT_PLATFORM = document.referrer.startsWith("android-app://") ? "android-twa" : "web";

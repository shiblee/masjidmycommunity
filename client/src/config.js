// The backend always runs on port 5050. Deriving the origin from whatever
// host the page itself was loaded on (rather than hardcoding "localhost")
// means the app keeps working unchanged when opened via a LAN IP from
// another device (e.g. http://192.168.1.20:5173) instead of localhost.
export const API_ORIGIN = `http://${window.location.hostname}:5050`;
export const API_BASE = `${API_ORIGIN}/api`;

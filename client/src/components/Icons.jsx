import React from "react";

const ICONS = {
  mosque: { d: ["M4 21V11l8-6 8 6v10", "M9 21v-6a3 3 0 016 0v6", "M12 5V2"] },
  shieldCheck: { d: ["M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z", "M9 12l2 2 4-4"] },
  flag: { d: ["M5 3v18", "M5 4h12l-2.5 3L17 10H5"] },
  globe: { circle: { cx: 12, cy: 12, r: 9 }, d: ["M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18"] },
  heart: { d: ["M12 21s-6.7-4.35-9.3-8.1C.8 10.1 1.4 6.8 4 5.2c2-1.2 4.4-.6 5.7 1 .7.8 1.4 1.8 2.3 1.8s1.6-1 2.3-1.8c1.3-1.6 3.7-2.2 5.7-1 2.6 1.6 3.2 4.9 1.3 7.7C18.7 16.65 12 21 12 21z"] },
  chartUp: { d: ["M3 3v18h18", "M7 14l4-4 3 3 5-6"] },
  people: { circle: { cx: 9, cy: 7, r: 4 }, d: ["M17 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2", "M23 21v-2a4 4 0 00-3-3.87", "M16 3.13a4 4 0 010 7.75"] },
  book: { d: ["M2 4h7a3 3 0 013 3v13a2 2 0 00-2-2H2z", "M22 4h-7a3 3 0 00-3 3v13a2 2 0 012-2h8z"] },
  sun: { circle: { cx: 12, cy: 12, r: 4 }, d: ["M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"] },
  drop: { d: ["M12 2.5S5 11 5 15.5a7 7 0 0014 0C19 11 12 2.5 12 2.5z"] },
  monitor: { rect: { x: 2, y: 4, width: 20, height: 14, rx: 2 }, d: ["M8 21h8M12 18v3"] },
  bulb: { d: ["M9 18h6M10 22h4M12 2a6 6 0 00-6 6c0 2.5 1.5 3.8 2.5 5 .6.7 1 1.3 1 2h5c0-.7.4-1.3 1-2 1-1.2 2.5-2.5 2.5-5a6 6 0 00-6-6z"] },
  compass: { circle: { cx: 12, cy: 12, r: 9 }, d: ["M15.5 8.5l-2 5-5 2 2-5z"] },
  link: { d: ["M10 14a5 5 0 007.07 0l2.83-2.83a5 5 0 00-7.07-7.07L11.5 4.5", "M14 10a5 5 0 00-7.07 0L4.1 12.83a5 5 0 007.07 7.07L12.5 19.5"] },
};

export function Icon({ name, size = 24 }) {
  const def = ICONS[name];
  if (!def) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {def.rect && <rect x={def.rect.x} y={def.rect.y} width={def.rect.width} height={def.rect.height} rx={def.rect.rx} />}
      {def.circle && <circle cx={def.circle.cx} cy={def.circle.cy} r={def.circle.r} />}
      {def.d.map((d) => (
        <path d={d} key={d} />
      ))}
    </svg>
  );
}

export default Icon;

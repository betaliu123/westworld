// portraits.js — SVG portrait generator for all 12 named NPCs.
// Generates western-themed badge-style portraits and circular avatars.
// Exported as data URIs so no external image files are needed.

/**
 * Generate an SVG portrait data URI for an NPC.
 * @param {string} initials — 1-3 character NPC initials (e.g. "艾琳")
 * @param {string} bgColor — background hex
 * @param {string} accentColor — accent/badge hex
 * @param {string} textColor — text hex
 * @param {number} w — width
 * @param {number} h — height
 */
function _makeSvg(initials, bgColor, accentColor, textColor, w = 200, h = 240) {
  const cx = w / 2;
  const cy = h * 0.4;
  const r = w * 0.3;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${bgColor}" stop-opacity="1"/>
      <stop offset="100%" stop-color="${_darken(bgColor, 30)}" stop-opacity="1"/>
    </linearGradient>
    <linearGradient id="badge" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${accentColor}" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="${accentColor}" stop-opacity="0.15"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)" rx="8"/>
  <circle cx="${cx}" cy="${cy}" r="${r + 12}" fill="${accentColor}" opacity="0.12"/>
  <circle cx="${cx}" cy="${cy}" r="${r + 6}" fill="${accentColor}" opacity="0.25"/>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="${bgColor}" stroke="${accentColor}" stroke-width="3"/>
  <text x="${cx}" y="${cy + r * 0.12}" text-anchor="middle" fill="${textColor}"
    font-size="${r * 0.72}" font-family="Georgia,serif" font-weight="bold">${initials}</text>
  <rect x="12" y="${h * 0.82}" width="${w - 24}" height="2" fill="${accentColor}" opacity="0.4" rx="1"/>
  <text x="${cx}" y="${h * 0.92}" text-anchor="middle" fill="${textColor}"
    font-size="11" font-family="Georgia,serif" opacity="0.55" letter-spacing="3">WESTWORLD</text>
</svg>`;
  return "data:image/svg+xml," + encodeURIComponent(svg.trim());
}

function _makeAvatar(initials, bgColor, accentColor, textColor) {
  const s = 96;
  const r = 40;
  const cx = s / 2, cy = s / 2;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="${bgColor}" stroke="${accentColor}" stroke-width="2.5"/>
  <text x="${cx}" y="${cy + r * 0.12}" text-anchor="middle" fill="${textColor}"
    font-size="${r * 0.72}" font-family="Georgia,serif" font-weight="bold">${initials}</text>
</svg>`;
  return "data:image/svg+xml," + encodeURIComponent(svg.trim());
}

function _darken(hex, amt) {
  const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - amt);
  const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - amt);
  const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - amt);
  return "#" + [r, g, b].map(v => v.toString(16).padStart(2, "0")).join("");
}

const DEFS = [
  { id: "npc_erin",   initials: "艾琳", bg: "#2a5240", accent: "#5a9a70", text: "#d4e8d8" },
  { id: "npc_jack",   initials: "杰克", bg: "#5a3a1a", accent: "#c8a040", text: "#f0d8b0" },
  { id: "npc_martha", initials: "玛莎", bg: "#3a4a5a", accent: "#8ab8d8", text: "#e0eef8" },
  { id: "npc_noah",   initials: "诺亚", bg: "#4a4a48", accent: "#9a9a90", text: "#e8e8e0" },
  { id: "npc_silas",  initials: "塞拉", bg: "#1a1020", accent: "#8a3040", text: "#d8c8d0" },
  { id: "npc_victor", initials: "维克", bg: "#1a2530", accent: "#5a7a90", text: "#c8d8e0" },
  { id: "npc_rosa",   initials: "罗莎", bg: "#2a1038", accent: "#a060c0", text: "#e8d0f0" },
  { id: "npc_eli",    initials: "伊莱", bg: "#2a3020", accent: "#6a7a40", text: "#d8e0c0" },
  { id: "npc_hector", initials: "赫克", bg: "#4a3a1a", accent: "#c8a840", text: "#f8e8c8" },
  { id: "npc_amos",   initials: "阿莫", bg: "#1a2840", accent: "#4a78a8", text: "#d0dce8" },
  { id: "npc_bessie", initials: "贝西", bg: "#5a2a18", accent: "#d87840", text: "#f8e0d0" },
  { id: "npc_thomas", initials: "托马", bg: "#4a2a10", accent: "#d89040", text: "#f8e0c0" },
  { id: "npc_carl",    initials: "卡尔", bg: "#3a2a1a", accent: "#c89840", text: "#f0d8b0" },
  { id: "npc_wei",     initials: "老魏", bg: "#2a2a28", accent: "#8a7a5a", text: "#e0d8c8" },
  { id: "npc_lillian", initials: "莉莉", bg: "#3a1a2a", accent: "#c06080", text: "#f0d0d8" },
  { id: "npc_brown",   initials: "布朗", bg: "#1a2028", accent: "#5a6a7a", text: "#d0d8e0" },
  { id: "npc_mary",    initials: "玛丽", bg: "#2a3818", accent: "#7a9a40", text: "#d8e8c0" },
];

const PORTRAITS = {};
const AVATARS = {};
for (const d of DEFS) {
  PORTRAITS[d.id] = _makeSvg(d.initials, d.bg, d.accent, d.text);
  AVATARS[d.id] = _makeAvatar(d.initials, d.bg, d.accent, d.text);
}

export const NPC_PORTRAITS = PORTRAITS;          // full body portraits (200x240)
export const NPC_AVATARS = AVATARS;              // circular avatar thumbnails (96x96)

/** Get portrait URL for an NPC (falls back to gp2 image if exists, else SVG) */
export function getPortrait(npcId) {
  if (!npcId) return null;
  const GP2_MAP = {
    npc_jack: "assets/portraits/npc_jack_gpt2.png",
    npc_erin: "assets/portraits/npc_erin_gpt2.png",
    npc_bessie: "assets/portraits/npc_bessie_gpt2.png",
  };
  return GP2_MAP[npcId] || PORTRAITS[npcId] || null;
}

/** Get circular avatar URL for an NPC (for dialogue bubbles, phone contacts) */
export function getAvatar(npcId) {
  if (!npcId) return null;
  return AVATARS[npcId] || null;
}

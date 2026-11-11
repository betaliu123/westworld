// Shared authored portraits: visual assets do not grant knowledge of an identity.
const IDS = new Set(["qinghe","tea_host","traveler","gate_guard","gate_relief","old_constable","gate_merchant","scribe","fu","inspector","gang_boss","relay","prisoner","mei","matchmaker","merchant","thief","qing","chi","shen","su","gao","guard","bookseller","inn","tea","porter","elder","beggar"]);

export function portraitUrl(id) {
  return IDS.has(id) ? `./assets/npc-portraits/${id}.webp` : null;
}

export function npcPortrait(info = {}) {
  const src = !info.unknown && info.known !== false && portraitUrl(info.id);
  if (!src) return '<span class="npc-portrait npc-portrait-unknown" aria-hidden="true">？</span>';
  return `<img class="npc-portrait" src="${src}" width="80" height="80" alt="" aria-hidden="true" decoding="async">`;
}

export function npcPortraitSVG(info = {}) {
  const src = !info.unknown && info.known !== false && portraitUrl(info.id);
  if (src) return `<image class="npc-portrait-image" href="${src}" x="-40" y="-46" width="80" height="80" preserveAspectRatio="xMidYMid slice"/>`;
  const mark = info.id === 'vacancy' ? '缺' : info.id === 'player' ? '你' : '？';
  return `<rect x="-38" y="-44" width="76" height="76" class="npc-portrait-placeholder"/><text text-anchor="middle" y="9" class="unknown-mark">${mark}</text>`;
}

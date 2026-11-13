// Isolated audition page. No game state, credentials, or generation service calls.
const $ = id => document.getElementById(id);
const players = [...document.querySelectorAll('audio')];
const play = $('mix-play'), stop = $('mix-stop'), status = $('mix-status');
const volume = $('ambience-volume'), output = $('volume-value');
let context, bus, ambientGain, startedAt = 0, sources = [], timers = [], session = 0, running = false;
const decoded = new Map();
const schedule = [[2, 'prince-28', '锦衣客试探'], [10, 'hostess-28', '宋茶娘道谢']];
const baseGain = () => Number(volume.value) / 100;

async function bufferFor(id) {
  if (!decoded.has(id)) {
    const response = await fetch($(id).getAttribute('src'));
    if (!response.ok) throw new Error('音频文件读取失败');
    decoded.set(id, await context.decodeAudioData(await response.arrayBuffer()));
  }
  return decoded.get(id);
}
function stopMix(message = '已停止') {
  session++;
  running = false;
  timers.forEach(clearTimeout);
  timers = [];
  sources.forEach(source => { try { source.stop(); } catch {} source.disconnect(); });
  sources = [];
  ambientGain?.disconnect(); bus?.disconnect();
  ambientGain = null; bus = null;
  play.disabled = false; stop.disabled = true;
  status.textContent = message;
}
function shapeAmbience() {
  if (!ambientGain || !running) return;
  const now = context.currentTime;
  const gain = ambientGain.gain;
  const base = baseGain();
  gain.cancelScheduledValues(now);
  const relative = now - startedAt;
  const talking = schedule.some(([start,id]) => relative >= start - .2 && relative < start + decoded.get(id).duration);
  gain.setTargetAtTime(talking ? base * .32 : base, now, .12);
  for (const [offset, id] of schedule) {
    const begin = startedAt + offset, end = begin + decoded.get(id).duration;
    if (begin - .25 > now) {
      gain.setValueAtTime(base, begin - .25);
      gain.linearRampToValueAtTime(base * .32, begin);
    }
    if (end > now) {
      gain.setValueAtTime(base * .32, end);
      gain.linearRampToValueAtTime(base, end + .8);
    }
  }
}
play.addEventListener('click', async () => {
  stopMix('正在准备声音…');
  const currentSession = session;
  play.disabled = true; stop.disabled = false;
  players.forEach(player => player.pause());
  try {
    context ||= new AudioContext();
    await context.resume();
    const [city, prince, hostess] = await Promise.all(['city',...schedule.map(([,id]) => id)].map(bufferFor));
    if (currentSession !== session) return;
    bus = context.createGain(); bus.gain.value = .72; bus.connect(context.destination);
    ambientGain = context.createGain(); ambientGain.connect(bus);
    running = true; startedAt = context.currentTime + .08;
    function start(buffer, destination, at) {
      const source = context.createBufferSource();
      source.buffer = buffer; source.connect(destination); source.start(at);
      sources.push(source);
      return source;
    }
    const citySource = start(city, ambientGain, startedAt);
    start(prince, bus, startedAt + schedule[0][0]);
    start(hostess, bus, startedAt + schedule[1][0]);
    ambientGain.gain.value = baseGain();
    shapeAmbience();
    status.textContent = '街市环境';
    for (const [offset,id,label] of schedule) {
      timers.push(setTimeout(() => { status.textContent = label + ' · 环境声压低'; }, (offset + .08) * 1000));
      timers.push(setTimeout(() => { status.textContent = '街市环境 · 音量恢复'; }, (offset + decoded.get(id).duration + .9) * 1000));
    }
    citySource.onended = () => { if (currentSession === session) stopMix('试听完毕'); };
  } catch {
    if (currentSession === session) stopMix('声音未能播放，请重试或使用上方单独播放器。');
  }
});
stop.addEventListener('click', () => stopMix());
volume.addEventListener('input', () => { output.textContent = volume.value + '%'; shapeAmbience(); });
players.forEach(player => player.addEventListener('play', () => {
  if (running || play.disabled) stopMix('单独试听');
  players.forEach(other => { if (other !== player) other.pause(); });
}));
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { stopMix('已暂停'); players.forEach(player => player.pause()); }
});
window.addEventListener('pagehide', () => { stopMix(); context?.close(); });


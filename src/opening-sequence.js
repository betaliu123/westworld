export const OPENING_SHOTS = [
  {
    id: 'genyue',
    image: 'assets/opening/genyue-ink-v4.png',
    alt: '隔着秋色湖面，远眺云雾中的仙山艮岳与宫殿',
    // Brush-script titles: at most 8 characters each, glyphs bundled in vendor/fonts (see the opening font script).
    title: '蛊入骨髓',
    lines: [
      '遍访名医，人人摇头。',
      '听闻道君皇帝营建艮岳，招聚天下异人——仙山之上，必有解法。',
    ],
  },
  {
    id: 'linxi',
    image: 'assets/opening/linxi-gate-ink-v2.png',
    alt: '旅人扶着石栏，望向临溪城门与正在入城的花石纲车',
    title: '关门只为石开',
    lines: [
      '替艮岳运货、办差的人，都在临溪落脚。上山的路，就在这座城里。',
      '可黄旗一展，花石纲入城，关门在你面前合上了。',
    ],
  },
];

// Only a newly started game receives these background facts. Watching and skipping
// are identical; narration never grants an item, a name, an offer or a cure.
export function recordOpeningBackground(state) {
  state.opening = {version: 1, completed: true};
  state.facts.guPoisonKnown = true;
  state.facts.genyueCureRumor = true;
}

export function mountOpeningSequence() {
  const root = document.createElement('section');
  root.id = 'opening-sequence';
  root.hidden = true;
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-label', '初入江湖');
  root.tabIndex = -1;
  root.innerHTML = `<div class="opening-art"></div>
    <button type="button" class="opening-skip" aria-label="跳过开场">跳过</button>
    <div class="opening-content">
      <div class="opening-copy" aria-live="polite" aria-atomic="true"><h2 class="opening-title"></h2><p></p><p></p></div>
      <div class="opening-footer">
        <div class="opening-progress" role="progressbar" aria-label="开场进度" aria-valuemin="1" aria-valuemax="2"><i></i><i></i></div>
        <span class="opening-image-error" hidden>画面未能载入 <button type="button" class="opening-retry">重试</button></span>
        <button type="button" class="opening-next">继续</button>
      </div>
    </div>`;
  document.body.append(root);
  const art = root.querySelector('.opening-art');
  const copy = root.querySelector('.opening-copy');
  const title = copy.querySelector('.opening-title');
  const lines = [...copy.querySelectorAll('p')];
  const next = root.querySelector('.opening-next');
  const skip = root.querySelector('.opening-skip');
  const retry = root.querySelector('.opening-retry');
  const imageError = root.querySelector('.opening-image-error');
  const progress = root.querySelector('.opening-progress');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let active = false, shot = 0, revealed = false, timer = 0, resolvePlay, pending;
  const images = OPENING_SHOTS.map((frame, index) => {
    const img = document.createElement('img');
    img.alt = frame.alt;
    img.width = 1672;
    img.height = 941;
    img.decoding = 'async';
    img.draggable = false;
    img.addEventListener('error', () => {
      img.dataset.failed = 'true';
      if (active && shot === index) imageError.hidden = false;
    });
    img.addEventListener('load', () => {
      delete img.dataset.failed;
      if (active && shot === index) imageError.hidden = true;
    });
    img.src = frame.image;
    art.append(img);
    return img;
  });
  function reveal() {
    clearTimeout(timer);
    revealed = true;
    root.dataset.revealed = 'true';
    lines[1].textContent = OPENING_SHOTS[shot].lines[1];
    next.textContent = shot === OPENING_SHOTS.length - 1 ? '开始游戏' : '继续';
  }
  function show(index) {
    clearTimeout(timer);
    shot = index;
    revealed = false;
    root.dataset.shot = OPENING_SHOTS[shot].id;
    root.dataset.revealed = 'false';
    images.forEach((img, i) => {
      img.classList.toggle('current', i === shot);
      img.setAttribute('aria-hidden', String(i !== shot));
    });
    // Each character is its own span so the brush title can bleed in stroke by stroke.
    title.replaceChildren(...[...OPENING_SHOTS[shot].title].map((char, i) => Object.assign(document.createElement('span'), {textContent: char, style: `--i:${i}`})));
    title.setAttribute('aria-label', OPENING_SHOTS[shot].title);
    lines[0].textContent = OPENING_SHOTS[shot].lines[0];
    lines[0].style.animation = 'none'; void lines[0].offsetWidth; lines[0].style.animation = '';
    lines[1].textContent = '';
    progress.setAttribute('aria-valuenow', String(shot + 1));
    [...progress.children].forEach((dot, i) => dot.classList.toggle('current', i === shot));
    imageError.hidden = !images[shot].dataset.failed;
    next.textContent = '继续';
    if (reduced.matches) reveal();
    else timer = setTimeout(reveal, 2200);
  }
  function finish() {
    if (!active) return;
    active = false;
    clearTimeout(timer);
    root.hidden = true;
    document.body.classList.remove('opening-active');
    window.removeEventListener('keydown', onKey, true);
    document.removeEventListener('visibilitychange', onVisibility);
    root.contains(document.activeElement) && document.activeElement.blur();
    resolvePlay();
  }
  function advance() {
    if (!active) return;
    if (!revealed) reveal();
    else if (shot < OPENING_SHOTS.length - 1) show(shot + 1);
    else finish();
  }
  function onKey(event) {
    if (!active) return;
    // Stop movement / attacks behind the full-screen opening, including the key
    // that finishes it. The world clears held keys before returning control.
    event.stopImmediatePropagation();
    if (event.code === 'Tab') {
      event.preventDefault();
      const buttons = [skip, ...(!imageError.hidden ? [retry] : []), next];
      const index = buttons.indexOf(document.activeElement);
      buttons[(index + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length].focus();
      return;
    }
    event.preventDefault();
    if (event.repeat || event.isComposing) return;
    if (event.code === 'Escape') finish();
    if (['Enter', 'Space'].includes(event.code)) {
      if (document.activeElement === skip) finish();
      else if (document.activeElement === retry) retry.click();
      else advance();
    }
  }
  function onVisibility() {
    clearTimeout(timer);
    if (!document.hidden && active && !revealed) timer = setTimeout(reveal, 2200);
  }
  root.addEventListener('click', event => {
    event.stopPropagation();
    if (!event.target.closest('button')) advance();
  });
  next.addEventListener('click', advance);
  skip.addEventListener('click', finish);
  retry.addEventListener('click', () => {
    imageError.hidden = true;
    delete images[shot].dataset.failed;
    images[shot].src = OPENING_SHOTS[shot].image;
  });
  return {
    get active() { return active; },
    play() {
      if (active) return pending;
      active = true;
      pending = new Promise(resolve => { resolvePlay = resolve; });
      root.hidden = false;
      document.body.classList.add('opening-active');
      window.addEventListener('keydown', onKey, true);
      document.addEventListener('visibilitychange', onVisibility);
      show(0);
      next.focus({preventScroll: true});
      return pending;
    },
  };
}

// LawUI.js — 警长势力面板（K 键）。
//
// 必须让玩家看见的三件事：
//   ① 警长的四根支柱现在什么样（尤其廉洁 —— 它归零意味着交证据白交）
//   ② 下一档突袭还差什么（把"攒证据"变成有目标的行为）
//   ③ 他现在怎么看你（会不会来抓你）

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

const STANCE_CLASS = { ally: "ally", neutral: "neutral", wary: "wary", hostile: "hostile" };

export class LawUI {
  constructor(deps = {}) {
    this.law = deps.law;
    this.onAction = deps.onAction || (() => {});
    this.onClose = deps.onClose || (() => {});
    this._open = false;
    this._build();
    this._bind();
  }

  get isOpen() { return this._open; }

  _build() {
    document.getElementById("lawpanel")?.remove();
    const el = document.createElement("div");
    el.id = "lawpanel";
    el.className = "modal hidden";
    el.innerHTML = `
      <div class="law-frame panel-western">
        <div class="law-head">
          <div class="law-title">警长办公室 · <span id="law-name">赫克托·布恩</span></div>
          <div class="law-stance" id="law-stance"></div>
          <button class="law-close" id="law-close">✕</button>
        </div>
        <div class="law-body">
          <div class="law-pillars" id="law-pillars"></div>
          <div class="law-raid" id="law-raid"></div>
          <div class="law-acts" id="law-acts"></div>
        </div>
        <div class="law-foot" id="law-foot"></div>
      </div>`;
    document.body.appendChild(el);
    this.el = el;
    this.nameEl = el.querySelector("#law-name");
    this.stanceEl = el.querySelector("#law-stance");
    this.pillarsEl = el.querySelector("#law-pillars");
    this.raidEl = el.querySelector("#law-raid");
    this.actsEl = el.querySelector("#law-acts");
    this.footEl = el.querySelector("#law-foot");
  }

  _bind() {
    this.el.querySelector("#law-close").addEventListener("click", () => this.close());
    this.el.addEventListener("click", (e) => { if (e.target === this.el) this.close(); });
    this._onKey = (e) => {
      if (!this._open) return;
      if (e.key === "Escape" || e.key === "k" || e.key === "K") {
        e.preventDefault(); e.stopPropagation(); this.close();
      }
    };
    window.addEventListener("keydown", this._onKey, true);
  }

  toggle() { this._open ? this.close() : this.open(); }

  open() {
    this.refresh();
    this.el.classList.remove("hidden");
    this._open = true;
    if (document.pointerLockElement) document.exitPointerLock();
  }

  close() {
    if (!this._open) return;
    this._open = false;
    this.el.classList.add("hidden");
    this.onClose();
  }

  refresh() {
    const s = this.law?.snapshot?.();
    if (!s) return;
    this.nameEl.textContent = s.sheriffName;
    this.stanceEl.className = "law-stance " + (STANCE_CLASS[s.stance] || "neutral");
    this.stanceEl.innerHTML = `${esc(s.stanceLabel)} <span>${esc(s.stanceDesc)}</span>`;

    // 支柱条
    this.pillarsEl.innerHTML = s.pillars.map((p) => {
      const pct = Math.max(0, Math.min(100, p.value));
      const cls = p.collapsed ? "collapsed" : pct <= p.collapseAt + 15 ? "low" : "";
      return `
        <div class="law-pillar ${cls}">
          <div class="law-pillar-top">
            <span>${esc(p.label)}</span>
            <b>${p.value}${p.collapsed ? " · 已崩" : ""}</b>
          </div>
          <div class="law-bar"><i style="width:${pct}%"></i>
            <u style="left:${Math.max(0, Math.min(100, p.collapseAt))}%"></u></div>
        </div>`;
    }).join("");

    // 突袭进度
    if (s.bought) {
      this.raidEl.innerHTML = `<div class="law-warn">⚠ 警长已被买通 —— 你递上去的证据不会有下文。<br>
        想让他回头，得先把行贿的链条掐断（削黑蹄会的财富），或者曝光他与塞拉斯的停战协议把他逼到墙角。</div>`;
    } else if (s.readyRaid) {
      this.raidEl.innerHTML = `<div class="law-ready">⚖ 证据已够 —— 他今晚就会动手：<b>${esc(s.readyRaid.label)}</b></div>`;
    } else if (s.nextRaid) {
      this.raidEl.innerHTML = `<div class="law-next">下一步：<b>${esc(s.nextRaid.label)}</b>
        <span>${s.blockers.length ? esc(s.blockers.join(" · ")) : "条件已满足"}</span></div>`;
    } else {
      this.raidEl.innerHTML = `<div class="law-ready">⚖ 该查的都查了。</div>`;
    }

    // 玩家动作
    const acts = [
      { id: "feed_evidence", label: "递交证据", hint: "把手里的东西交上去（卧底情报也会自动折算）" },
      { id: "turn_in_thug", label: "交出逃犯", hint: "帮他补人手、长威信" },
      { id: "back_publicly", label: "公开支持", hint: "长威信，但会被黑蹄会记上一笔" },
      { id: "expose_truce", label: "曝光停战协议", hint: "重创他的廉洁与威信，同时打黑蹄会的威望", danger: true, once: s.truceExposed },
      { id: "bribe_sheriff", label: "自己行贿", hint: "让他对你睁眼瞎 —— 但廉洁越低他越可能被别人买走", danger: true },
    ];
    this.actsEl.innerHTML = acts.map((a) => `
      <button class="law-act ${a.danger ? "danger" : ""}" data-act="${a.id}" ${a.once ? "disabled" : ""}>
        <b>${esc(a.label)}${a.once ? "（已曝光）" : ""}</b><span>${esc(a.hint)}</span>
      </button>`).join("");
    for (const btn of this.actsEl.querySelectorAll(".law-act")) {
      btn.addEventListener("click", () => {
        if (btn.disabled) return;
        this.onAction(btn.dataset.act);
        this.refresh();
      });
    }

    const bits = [
      `与你的关系 ${s.rapport > 0 ? "+" : ""}${s.rapport}`,
      `已交证据 ${s.evidenceFed}`,
      `收贿 ${s.bribesTaken} 次`,
      `已突袭 ${s.raidsDone.length}/4`,
    ];
    if (s.canPursue) bits.push(`<b class="law-hot">正在追捕你（强度 ${s.pursuit}）</b>`);
    this.footEl.innerHTML = bits.join(" · ");
  }

  dispose() {
    window.removeEventListener("keydown", this._onKey, true);
    this.el?.remove();
  }
}

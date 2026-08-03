// InteractionSystem.js — RDR2 式交互系统
// 近身优先检测：玩家接近NPC/建筑/车辆时自动显示交互目标与动作菜单
// 支持对话模式：问候后左侧面板切换为对话动作（称赞/威胁/招募/勒索/走开）

import * as THREE from "three";

export class InteractionSystem {
  constructor(camera, scene) {
    this.camera = camera;
    this.scene = scene;
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = 20;
    this.raycaster.near = 0.1;

    this.currentTarget = null;     // { type, data, pos }
    this.dialogueNpc = null;       // 当前对话中的NPC（非null=对话模式）

    // 注入的外部引用
    this.npcManager = null;
    this.town = null;
    this.loot = null;
    this.vehicles = null;
    this.interiors = null;
  }

  setRefs({ npcManager, town, loot, vehicles, interiors }) {
    this.npcManager = npcManager;
    this.town = town;
    this.loot = loot;
    this.vehicles = vehicles;
    this.interiors = interiors;
  }

  /** 进入对话模式：左侧面板切换为对话动作 */
  setDialogueTarget(npc) { this.dialogueNpc = npc; }

  /** 退出对话模式 */
  clearDialogueTarget() { this.dialogueNpc = null; }

  /** 是否在对话中 */
  get isInDialogue() { return !!this.dialogueNpc; }

  /**
   * 每帧扫描：近身距离优先
   */
  scan(player, insideRoom, interiorData) {
    const ppos = player.pos;

    // 对话模式中，保持对话NPC为目标（不让其他NPC抢走）
    if (this.dialogueNpc) {
      const dlgNpc = this.dialogueNpc;
      // 必须仍在 TALK 状态：以前只查活着 + 距离 < 8，于是 NPC 已经因为耐心耗尽
      // 走回 WANDER/AT_PLACE 了，对话菜单还挂着、G 键还能继续加好感。
      const stillTalking = dlgNpc.brain?.state === "TALK";
      if (dlgNpc.alive && dlgNpc.brain.state !== "DOWN" && stillTalking) {
        const d = Math.hypot(dlgNpc.pos.x - ppos.x, dlgNpc.pos.z - ppos.z);
        if (d < 8.0) {
          const name = dlgNpc.phone?.owner || "镇民";
          this.currentTarget = {
            type: "dialogue",
            data: { npc: dlgNpc, name, id: name, dist: d },
            pos: dlgNpc.pos.clone(),
          };
          return;
        }
      }
      // 对话NPC消失/太远/已经不聊了，退出对话模式
      this.dialogueNpc = null;
      this.onDialogueDropped?.(dlgNpc);
    }

    const pfacing = player.facing;

    // —— NPC 检测：近身(≤6单位) + raycaster 双重检测 ——
    // 室内/室外均支持。室内时只检测同一房间内的NPC。
    if (this.npcManager) {
      let bestNpc = null;
      let bestNpcDist = Infinity;

      // 构建候选列表：室外NPC + 室内时加入室内patron
      let candidates = [...this.npcManager.all];
      let room = null;
      if (insideRoom && this.interiors) {
        room = this.interiors.get(insideRoom);
        if (room && room.npcs) {
          // room.npcs 是 addPatron 创建的对象，已包含 NPC-compatible 字段
          candidates = candidates.concat(room.npcs);
        }
      }

      for (const npc of candidates) {
        if (!npc.mesh || !npc.alive) continue;
        if (npc.brain && npc.brain.state === "DOWN") continue;
        // 室内时只检测同房间NPC
        if (insideRoom) {
          const sameInterior = (npc.insideRoom && npc.insideRoom.name === insideRoom) ||
                               (npc.insideHome && npc.insideHome.interiorName === insideRoom) ||
                               (npc.insideRoom && npc.insideRoom === room);
          if (!sameInterior) continue;
        }
        const d = Math.hypot(npc.pos.x - ppos.x, npc.pos.z - ppos.z);
        if (d < 6.0 && d < bestNpcDist) {
          bestNpcDist = d;
          bestNpc = npc;
        }
      }

      // raycaster 精准检测（补充）
      this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
      const meshes = [];
      for (const npc of candidates) {
        if (!npc.mesh || !npc.alive) continue;
        if (npc.brain && npc.brain.state === "DOWN") continue;
        if (insideRoom) {
          const sameInterior = (npc.insideRoom && npc.insideRoom.name === insideRoom) ||
                               (npc.insideHome && npc.insideHome.interiorName === insideRoom) ||
                               (npc.insideRoom === room);
          if (!sameInterior) continue;
        }
        npc.mesh.traverse((child) => {
          if (child.isMesh && child.geometry) meshes.push({ mesh: child, npc });
        });
      }
      const hits = this.raycaster.intersectObjects(
        meshes.map((m) => m.mesh), false
      );
      if (hits.length > 0) {
        const hit = hits[0];
        const entry = meshes.find((m) => m.mesh === hit.object);
        if (entry && hit.distance < this.raycaster.far) {
          const npc = entry.npc;
          const raydist = Math.hypot(npc.pos.x - ppos.x, npc.pos.z - ppos.z);
          if (raydist < bestNpcDist || !bestNpc) {
            bestNpc = npc;
            bestNpcDist = raydist;
          }
        }
      }

      if (bestNpc) {
        const name = bestNpc.phone?.owner || "镇民";
        const bumpDist = bestNpcDist < 1.6;
        this.currentTarget = {
          type: "npc",
          data: { npc: bestNpc, name, id: name, dist: bestNpcDist, bumpDist },
          pos: bestNpc.pos.clone(),
        };
        return;
      }
    }

    // —— 距离+角度混合检测（门/掉落物/车辆/室内藏物）——
    const targets = [];

    if (this.town) {
      for (const door of this.town.doors) {
        const dx = door.x - ppos.x;
        const dz = door.z - ppos.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 3.6) {
          const angle = Math.atan2(dx, dz);
          let facingDiff = Math.abs(angle - pfacing);
          if (facingDiff > Math.PI) facingDiff = Math.PI * 2 - facingDiff;
          if (facingDiff < 0.55 || dist < 2.4) {
            targets.push({
              type: "door",
              data: { door, name: door.name, isBack: door.isBack, dist },
              pos: new THREE.Vector3(door.x, 0, door.z),
            });
          }
        }
      }
    }

    if (!insideRoom && this.loot) {
      const nearest = this.loot.nearest(ppos, 3.5);
      if (nearest) {
        const d = Math.hypot(nearest.mesh.position.x - ppos.x, nearest.mesh.position.z - ppos.z);
        targets.push({ type: "loot", data: { loot: nearest, dist: d }, pos: nearest.mesh.position.clone() });
      }
    }

    if (!insideRoom && this.vehicles) {
      const nearest = this.vehicles.nearest(ppos, 5);
      if (nearest) {
        const d = Math.hypot(nearest.group.position.x - ppos.x, nearest.group.position.z - ppos.z);
        targets.push({ type: "vehicle", data: { vehicle: nearest, dist: d }, pos: nearest.group.position.clone() });
      }
    }

    if (insideRoom && interiorData?.home?.stashPoint && !interiorData.home.stashTaken) {
      const sp = interiorData.home.stashPoint;
      const d = Math.hypot(ppos.x - sp.x, ppos.z - sp.z);
      if (d < 2.8) targets.push({ type: "stash", data: { home: interiorData.home, dist: d }, pos: new THREE.Vector3(sp.x, 0, sp.z) });
    }

    if (insideRoom && interiorData?.room?.exit) {
      const ex = interiorData.room.exit;
      const d = Math.hypot(ppos.x - ex.x, ppos.z - ex.z);
      if (d < 2.8) targets.push({ type: "exit", data: { dist: d, isBack: false }, pos: new THREE.Vector3(ex.x, 0, ex.z) });
    }

    // 室内后门出口
    if (insideRoom && interiorData?.room?.hasBackDoor && interiorData.room.backDoorExit) {
      const bex = interiorData.room.backDoorExit;
      const bd = Math.hypot(ppos.x - bex.x, ppos.z - bex.z);
      if (bd < 2.8) targets.push({ type: "exit", data: { dist: bd, isBack: true }, pos: new THREE.Vector3(bex.x, 0, bex.z) });
    }

    targets.sort((a, b) => a.data.dist - b.data.dist);

    if (targets.length > 0) {
      this.currentTarget = targets[0];
      return;
    }

    this.currentTarget = null;
  }

  /**
   * 返回当前目标对应的动作列表
   */
  getActions() {
    if (!this.currentTarget) return [];
    const t = this.currentTarget;

    // 对话模式：显示对话动作（或职业特殊动作）
    if (t.type === "dialogue") {
      const npc = t.data.npc;
      // 检查是否有职业特殊互动
      if (npc?.brain?.hasRoleInteraction?.()) {
        const roleActions = npc.brain.getRoleActions();
        if (roleActions) return roleActions;
      }
      // 检查是否有职业跟进提问（搭话后 NPC 说的第二句话对应选项）
      const followUp = npc?.brain?.getJobFollowUp?.();
      if (followUp) {
        return [
          { action: "role_yes", icon: "✅", label: followUp.yes, key: "G", hint: `${t.data.name} · ${npc.personality.job}` },
          { action: "role_no", icon: "❌", label: followUp.no, key: "T", hint: "" },
          { action: "dlg_close", icon: "✕", label: "走开", key: "", hint: "" },
        ];
      }
      return [
        { action: "dlg_praise",  icon: "👍", label: "称赞", key: "G", hint: `${t.data.name} · 对话中` },
        { action: "dlg_threat",  icon: "😠", label: "威胁", key: "T", hint: "" },
        { action: "dlg_recruit", icon: "🤝", label: "招募", key: "R", hint: "" },
        { action: "dlg_extort",  icon: "🔫", label: "勒索", key: "Y", hint: "" },
        { action: "dlg_close",   icon: "✕",  label: "走开", key: "", hint: "" },
      ];
    }

    switch (t.type) {
      case "npc": {
        const npc = t.data.npc;
        // AI 剧场演员：把"搭戏"按钮并入原有 NPC 交互按钮区
        // 键位用 J（Z 已全局绑定睡觉，且 keyMap 里没有 KeyZ）
        const theaterAct = this.theaterDirector?.isActor?.(npc)
          ? { action: "theater_cue", icon: "🎭", label: "搭戏", key: "J", hint: `${t.data.name} · 正在街头演一场戏` }
          : null;
        // 正在打我、且没在逃 → 可以求饶
        const canBeg = npc?.brain?.state === "ANGRY" && !npc.brain.attackTargetNpc;
        const begAct = canBeg
          ? { action: "beg", icon: "🙏", label: "求饶", key: "R", hint: `${t.data.name} 正在攻击你 · 按 R 求饶` }
          : null;
        // 正在去报案 → 可以安抚
        const placateAct = npc?.brain?.isReporting
          ? { action: "placate", icon: "🤫", label: "安抚", key: "Y", hint: `${t.data.name} 要去报案 · 按 Y 劝住他` }
          : null;
        // 特殊职业 NPC：保留完整交互（招募/勒索等），不加攻击按钮
        if (npc?.brain?.hasRoleInteraction?.()) {
          const npcActions = [
            { action: "role_approach", icon: "💬", label: "搭话", key: "F", hint: `${t.data.name} · ${npc.personality.job} · 按 F` },
            { action: "profile", icon: "📋", label: "档案", key: "H", hint: "" },
          ];
          if (t.data.bumpDist) {
            npcActions.push({ action: "steal", icon: "🫳", label: "偷窃", key: "V", hint: "" });
          }
          if (begAct) npcActions.unshift(begAct);       // 命悬一线时放最前面
          if (placateAct) npcActions.unshift(placateAct);
          if (theaterAct) npcActions.push(theaterAct);
          return npcActions;
        }
        const actions = [
          { action: "greet",   icon: "👋", label: "问候", key: "F", hint: `${t.data.name} · 按 F 问候` },
          { action: "profile", icon: "📋", label: "档案", key: "H", hint: "" },
        ];
        if (t.data.bumpDist) {
          actions.push({ action: "steal", icon: "🫳", label: "偷窃", key: "V", hint: "" });
        }
        if (begAct) actions.unshift(begAct);
        if (placateAct) actions.unshift(placateAct);
        if (theaterAct) actions.push(theaterAct);
        return actions;
      }
      case "door":
        if (t.data.name === "银行") {
          return [
            { action: "enter", icon: "🚪", label: "进入", key: "E",
              hint: `银行 · 按 E 进入` },
            { action: "enter_stock", icon: "📈", label: "股市", key: "G",
              hint: "银行 · 按 G 查看股市" },
          ];
        }
        return [{ action: "enter", icon: "🚪", label: "进入", key: "E",
          hint: `${t.data.isBack ? "后门" : ""} ${t.data.name} · 按 E` }];
      case "loot":
        return [{ action: "pickup", icon: "💵", label: "拾取", key: "E", hint: "掉落物品 · 按 E 拾取" }];
      case "vehicle":
        return [{ action: "drive", icon: "🚗", label: "驾驶", key: "E", hint: "车辆 · 按 E 驾驶" }];
      case "stash":
        return [{ action: "steal_stash", icon: "🫳", label: "搜刮", key: "E", hint: "藏物柜 · 按 E 搜刮" }];
      case "exit":
        return [{ action: "exit_room", icon: "🚪", label: "出去", key: "E",
          hint: `${t.isBack ? "后门出口" : "出口"} · 按 E 出去`, isBack: t.isBack }];
      default:
        return [];
    }
  }

  /** 执行动作 */
  executeAction(action) {
    if (!this.currentTarget) return null;
    const t = this.currentTarget.data;

    // 对话动作 (dlg_* 或 role_* 或 story_choice_*)
    if (action.startsWith("dlg_") || action.startsWith("role_") || action.startsWith("story_choice_")) {
      const npc = t.npc || (this.dialogueNpc ? this.dialogueNpc : null);
      if (!npc) return null;
      if (action.startsWith("dlg_")) {
        const kind = action.replace("dlg_", "");
        return { type: "dlg_action", npc, kind };
      }
      // role_* 或 story_choice_* → 统一走 role_action
      return { type: "role_action", npc, kind: action };
    }

    switch (action) {
      case "greet":    return { type: "dialogue", npc: t.npc, kind: "greet" };
      case "beg":      return { type: "beg", npc: t.npc };
      case "placate":  return { type: "placate", npc: t.npc };
      case "profile":  return { type: "profile", npc: t.npc };
      case "attack":   return { type: "attack", npc: t.npc };
      case "steal":    return { type: "steal", npc: t.npc };
      case "enter":    return { type: "enter", door: t.door, name: t.name, isBack: t.isBack };
      case "enter_stock": return { type: "enter_stock", door: t.door, name: t.name, isBack: t.isBack };
      case "pickup":   return { type: "pickup", loot: t.loot };
      case "drive":    return { type: "drive", vehicle: t.vehicle };
      case "steal_stash": return { type: "steal_stash", home: t.home };
      case "exit_room":   return { type: "exit_room", isBack: t.isBack || false };
      default: return null;
    }
  }

  /** 检查快捷键输入 */
  handleInput(input, insideRoom) {
    if (!this.currentTarget) return null;
    const actions = this.getActions();

    const keyMap = {
      "KeyE": "E", "KeyF": "F", "KeyH": "H", "KeyJ": "J", "KeyS": "S",
      "KeyG": "G", "KeyT": "T", "KeyR": "R", "KeyY": "Y", "KeyV": "V",
    };
    for (const [code, key] of Object.entries(keyMap)) {
      if (input.wasPressed(code)) {
        const act = actions.find((a) => a.key === key);
        if (act) return this.executeAction(act.action);
      }
    }

    return null;
  }
}

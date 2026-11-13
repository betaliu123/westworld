# Drop 发布

当前展板：[江湖有回声 · 临溪镇](https://drop.apps-hp.danlu.netease.com/b/HW7oCWX0Fp0m/)

2026-11-12 已发布；账号 `liuchang06`。本机 `C:\Users\liuchang06\.local\bin\drop.cmd` 是 Windows 命令入口，调用同目录的官方 `drop-cli.mjs`。已与官网下载脚本比对 SHA-256 一致，`drop whoami` 验证登录有效。凭据由 CLI 保存在用户配置目录，不进入项目或发布目录。

## 日常命令

```powershell
drop whoami
drop login
drop upload <文件或目录>
drop update <展板链接> <文件或目录>
```

需要重新登录时，运行 `drop login`，由本人打开命令行打印的链接完成公司账号登录。

## 更新这个游戏

在项目根目录执行：

```powershell
python tools/build_drop.py
$dropRelease = (Get-Content .artifacts/drop/latest.json -Raw | ConvertFrom-Json).directory
drop update https://drop.apps-hp.danlu.netease.com/b/HW7oCWX0Fp0m/ $dropRelease
```

需要另建一块展板，则把最后一行换成：

```powershell
drop upload $dropRelease --name '江湖有回声 · 临溪镇'
```

构建每次生成一个新的 `.artifacts/drop/<时间>/` 目录，只复制入口、CSS、src、vendor 和运行素材；排除 `.env`、Git 数据、测试、日志、试玩存档、制作源文件和原始音频。主角实际使用的 `src/models/sumiro-motion.local.json` 必须包含；虽沿用 `.local` 文件名，已按用户要求恢复发布，不得当成临时文件排除。打包会核对走跑、跳跃、战斗和蹲行动作，缺失时停止。Drop CLI 不读取 `.gitignore`，不要把项目根目录直接交给 `drop upload`。

发布包在入口先载入 `drop-static.js`：将音频绝对路径映射到当前展板路径。有 `data-ai-relay` 时，将 `/api/status`、`/api/director`、`/api/reply-intent` 发往专用 HTTPS 转发；不发送浏览器 Cookie。未配置转发时使用本地回退。`/api/voice` 始终离线，仍只播放已有录音。

Drop 本身只托管静态文件，实时 DS 由单独的本机服务经临时隧道提供。服务端密钥不进入发布包；断网、超时或达到限额时沿用本地规则。更新展板会替换其文件，玩家浏览器的既有存档仍由游戏原逻辑管理。

## 2026-11-12 临时开启实时 DS

- 用户选择本机临时转发。`tools/ds_relay.py` 启动独立后端和 API 转发层，均仅监听回环地址；转发层使用系统分配的空闲端口，不依赖作者的 8091 试玩服务。Cloudflare Quick Tunnel 仅连接专用 API 端口。
- 只开放三个上述接口；项目文件、目录、`.env`、语音生成和任意上游地址均不可从转发访问。浏览器来源限定 Drop，验证 JSON、请求大小与模式；最多四个并发、每小时三百次，后端原有每分钟限流仍有效。地址中的随机路径用于减少误用，不替代个人账号鉴权；链接内的调用额度由此本机服务共用。
- Cloudflared 从官方 GitHub release 下载并校验官方 SHA-256，版本与摘要记录于 `.artifacts/ds-relay/bin/release.json`。程序、运行状态和日志在被 Git 忽略的 `.artifacts/ds-relay/`；日志不保存玩家输入或游戏状态。
- 本次发布以 `wuxia-20261112-hud-calligraphy` 为基底，仅改 `index.html` 与 `drop-static.js`，快照为 `wuxia-20261112-ds-relay`；不顺带发布工作区的其他游戏改动。保持同一展板与访问权限。
- 浏览器需要刷新以加载新连接。电脑关机、休眠、断网或停止隧道后，实时 DS 会失效，游戏使用本地回退。隧道重启会换地址，需重新验证并更新入口；这不是常驻托管服务。
- 后续 `python tools/build_drop.py` 默认读取 `.artifacts/ds-relay/public.json` 的已验证地址，也可显式传 `--ai-relay https://…/随机路径`。构建不会复制该状态目录或服务端文件。
- 需要停止本次转发时执行 `powershell -NoProfile -File tools/stop_ds_relay.ps1`；只停止本任务记录且身份吻合的两个进程，不停止其他本地游戏服务，并清除后续构建的自动转发配置。

## 本次验收

- 首次快照 `.artifacts/drop/wuxia-20261112` 漏发主角动作包，并通过静态适配器返回空动作，导致线上走跑、跳跃和战斗使用回退动作。已撤销该处理。
- 修复快照 `.artifacts/drop/wuxia-20261112-motion-restored`：547 个文件，142,672,370 字节；256 条清单音频路径均有实体文件，43 段主角动作和 2 段蹲行动作均已打包。
- 构建检查本地模块依赖和必需动作；静态适配、主角动作及 3C 测试共 15 项通过，43 段真实动作经 Three.js 解析校验通过。静态适配器现在正常加载真实动作文件，不再返回空包。
- 线上以 `?playtest=drop-smoke` 独立存档实际开局，场景、模型、HUD 与守卫正式对白正常。检查期间浏览器无运行错误与警告。
- 实景截图：`.artifacts/drop/published-game.png`。
- 主角动作修复后已更新同一展板；线上下载的动作包与本地文件 SHA-256 完全一致。使用 `?playtest=drop-motion-qa` 独立存档实际按键验证移动、Shift 疾跑、空格腾空和拔刀姿势；截图 `.artifacts/drop/motion-jump.png`。正常玩家存档未操作，已经打开的旧页面需刷新后加载新适配器。
- 最新快照 `.artifacts/drop/wuxia-20261112-qinghe-fast-pass` 已更新同一展板：548 个文件，142,678,879 字节，保留 256 条音频、43 段主角动作与 2 段蹲行动作。宋青禾身份核名成功立即放行，符祥先步行至公所，周大石随后拉车；守卫当场确认并更新后续问话。
- 本轮全量 1030 项通过、相关 35 项复验通过；独立试玩实际确认门栅隐藏、符祥先行、守卫改口、玩家按键穿过关口，浏览器无错误/警告。线上五个变更模块逐一下载，比对发布快照 SHA-256 全部一致，见 `.artifacts/drop/qinghe-fast-pass-verification.json`。线上本轮未重跑整条剧情，验证以本地实景加线上模块一致性为界。

## 2026-11-12 图标文字与毛笔过场更新

- 使用官方 `drop update` 将 `.artifacts/drop/wuxia-20261112-hud-calligraphy` 原地发布到同一展板，链接与访问权限不变。包内 548 个文件，142,678,879 字节；保留 256 条音频、43 段主角动作和 2 段蹲行动作。
- 右下角「点穴、探查、套索」显示名称；潜行时最左侧显示「潜行（Z键）」。小窗口底部统一排布，兼容饥饿、困倦同时出现。
- 出狱过场使用宣纸底、毛笔「三日后」，题字字体已包含三个实际字形；刑期结算规则不变。
- 发布前静态适配、技能与刑期相关 29 项测试通过；本地三档分辨率的布局验收见 `cc_task/2026-11-12-aim-labels/README.md`。
- 线上入口、三个 UI 模块、样式和题字字体共八个文件与发布包 SHA-256 一致。使用 `drop-hud-calligraphy`、`drop-prison-calligraphy` 独立试玩存档进行线上浏览器验收；结果 `.artifacts/drop/hud-calligraphy-verification.json`，截图 `.artifacts/drop/published-hud-calligraphy.png`、`.artifacts/drop/published-prison-calligraphy.png`。不操作玩家正式存档。

## 2026-11-12 两图求医开场

- 已通过官方 `drop update` 原地发布 `.artifacts/drop/wuxia-20261112-opening-ink`，同一链接与访问权限。基于 `wuxia-20261112-ds-relay`，仅更新开场相关六个文件，保留现有静态适配、实时 DS 转发与全部动作音频；不纳入工作区其他尚未发布的改动。
- 开场先仙山艮岳，再临溪城门，使用用户定稿字幕与最终轻水墨成图。移除三种出身选择，新档沿用原默认属性；支持点按补全/推进、跳过与 Esc。继续旧存档不重播或改属性。
- 快照含 552 个文件、147,813,365 字节。50 项相关回归通过；在发布包上通过三档窗口排版、正常观看、两幕跳过、旧档续玩、局内重开、减少动态效果及图片失败重试检查。
- 线上六个文件的 SHA-256 与发布包一致；独立试玩实际观看仙山→城门、接回关口、切换潜行、刷新续档通过，无浏览器运行错误。详见 `cc_task/2026-11-12-opening/README.md`、`release.json`、`published-verification.json` 及三张 `published-*.png`。已有页面需要刷新，新开局播放开场，继续存档直接进入游戏。

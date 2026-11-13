# 迁移记录

来源：betaliu123/westworld 的 511wuxia 分支，原提交 80f1138。

保留原模拟器与三维 World，使用 LinkeDOM 作为原界面逻辑的状态容器。原按钮回调仍调用真实规则；界面由原生离屏 Canvas 绘制，合成为 Three.js 纹理，主屏仅使用一个 WebGL Canvas。没有浏览器或 WebView 依赖。

适配补丁：Three CanvasTexture 取原生画布；ImageLoader 将逻辑资源 URL 映射到微信包内路径；WebGL2 通过上下文能力检测；World 末尾绘制移动 HUD；开场图片改用 JPEG；原 Web Audio 构造使用隔离环境中的微信上下文。构建器按模块注入隔离的平台环境，避免修改模拟器宿主全局对象。

资源：模型内贴图转 512 JPEG，GLB BufferView 重新对齐；保留骨骼映射及动画，主角重定向包目标哈希同步。主角 Sumiro 本地动作的再分发许可仍继承原文档的未确认状态；当前代码用于本地开发/预览，正式发布前需替换为授权动作或核实来源。来源 https://xikhar.github.io/sumiro/assets/player/player.glb 。NPC 原有 Mixamo 动作不变。

声音：保留压缩后的环境和动作录音，未纳入原完整 NPC 语音库；字幕不受缺失语音影响。生成接口离线返回不可用，由原游戏回退内容继续。

未执行：上传正式版本、审核、发布、手机真机验证；锁屏后未将最终对白界面误记为人工点按通过。

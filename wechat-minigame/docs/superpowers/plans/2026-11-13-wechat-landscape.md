# WeChat Landscape Migration Implementation Plan

**Goal:** 在当前微信小游戏框架中运行原版临溪三维游戏，横屏、多点触控、原剧情规则与微信本地存档。

**Architecture:** 保留 Simulation / World / main；LinkeDOM 保存原剧情 UI 的状态与事件，Canvas 原生绘制移动端 HUD，以 WebGL 纹理合成。平台适配层实现包内文件读取、图片、音频、存储和生命周期；资源压缩分包。

**Tech Stack:** Three.js 0.160、微信小游戏 API、LinkeDOM、fflate、esbuild。

- [x] 复制原引擎和测试，添加可复现构建与资源清单，主包只包含启动和逻辑。
- [x] 实现 runtime/platform.js：微信文件读取与 gzip 解压、Canvas/Image/DOM 适配、存储命名空间、切后台暂停/保存。
- [x] 实现 runtime/mobile-ui.js：安全区横屏布局，左摇杆、右拖镜头、攻击/跳跃/交互/蹲行/格挡/疾跑，多指隔离与取消释放。
- [x] 原 UI 对白和菜单按 44px 触控行绘制，可滚动，保留真实按钮事件、确认和取消；开场和背包接入同一绘制。
- [x] 构建、资源检查、输入测试与原规则回归；微信预览编译通过，模拟器验证开场、探索、NPC 入口、存档恢复；移动和真实对白投影通过自动测试，最终点按回归因电脑锁屏尚未完成。
- [x] 写入启动、分包、测试与尚需真机验证的操作文档。

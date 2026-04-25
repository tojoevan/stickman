# 《火柴人对决：像素进化版》视觉设计方案

## 1. 核心视觉定义
*   **美术风格**：现代精致像素 (Modern High-Definition Pixel Art)。
*   **分辨率标准**：基础部件 64x64 px，背景层 1920x1080 px 等比像素缩放。
*   **UI 视觉**：全像素化 (Pixelated UI)，配合 `Press Start 2P` 风格字体与 2px/4px 粗描边。

## 2. 渲染引擎架构
*   **资源加载器 (Asset Manager)**：新增 `AssetLoader` 逻辑，负责从 `/public/assets/` 或内联缓存中加载所有 PNG 切片。
*   **骨骼驱动 (Procedural Animation)**：
    *   保留现有物理关节计算逻辑。
    *   将原生路径绘图替换为 `ctx.drawImage` 绘制各肢体切片。
    *   **动态拉伸**：在肢体大幅度摆动时，允许图片在 X/Y 轴产生微小形变，模拟物理动感。

## 3. 场景与层级 (The Scene)
采用 **三层视差滚动系统**，每一层将独立受 `this.time` 和 `shake` 影响：
1.  **远景层 (Background)**：朦胧的赛博都市，支持动态霓虹闪烁。
2.  **中景层 (Midground)**：街道细节、雨水管道，与战斗节奏产生轻微位移。
3.  **战斗层 (Entity Layer)**：玩家与敌方角色，以及实时生成的像素粒子。

## 4. 特效与粒子系统
*   **像素粒子 (Pixel Particles)**：打击瞬间生成大量 2x2 或 4x4 的像素方块，受重力影响并带有随机初速度。
*   **动态天气 (Weather)**：
    *   **像素雨 (Digital Rain)**：斜向落下的半透明像素线条，落地后产生微小的像素溅射特效。
    *   **氛围光照 (Ambient Lighting)**：基于背景色调为角色添加实时色彩叠加效果。

## 5. 资源清单 (Asset Manifest)
我们需要准备以下切片：
*   角色：`char_head.png`, `char_torso.png`, `char_arm.png`, `char_leg.png`
*   武器：`weapon_sword.png`, `weapon_shield.png`
*   场景：`bg_far.png`, `bg_mid.png`, `bg_floor.png`

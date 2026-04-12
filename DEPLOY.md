# 《火柴人对决：战术进化》部署指南

本项是一个全栈 Web 应用，包含 React 前端和 Node.js 后端。

## 1. 快速启动 (本地开发)

确保你的机器已安装 [Node.js](https://nodejs.org/)。

### 步骤 A: 安装依赖
在项目根目录 `huocairen` 下执行：
```bash
npm install
```

### 步骤 B: 一键启动 (前端 + 后端)
我已配置好并发启动脚本，你只需执行：
```bash
npm run dev
```
*   **前端地址**: http://localhost:5173
*   **后端 API**: http://localhost:3001

## 2. 功能说明
*   **注册/登录**: 首次打开请先“注册新档案”，数据将持久化保存在 `server/game.db` (SQLite) 中。
*   **属性强化**: 升级后获得潜能点，在大厅点击属性数值即可强化。
*   **黑市**: 战斗获得的比特币 (BTC) 可在黑市购买至臻或史诗级装备。
*   **战术**: 根据“敌方情报”面板调整你的每轮装备。

## 3. 技术栈
*   **前端**: Vite, React, TypeScript, Tailwind CSS, HTML5 Canvas
*   **后端**: Express.js
*   **数据库**: SQLite3 (单文件持久化)
*   **认证**: JWT (JSON Web Token) + Bcrypt 密码加密

---
祝你在竞技场中披荆斩棘！

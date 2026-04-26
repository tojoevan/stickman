const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const Datastore = require('nedb-promises');

const app = express();
const PORT = 3002;
const SECRET_KEY = 'shadow_trace_secret_2026';

// 采用 NeDB 进行数据持久化，使用绝对路径确保可靠性
const dbDir = path.join(__dirname);
const db = {
  users: Datastore.create({ filename: path.join(dbDir, 'users.db'), autoload: true }),
  progress: Datastore.create({ filename: path.join(dbDir, 'progress.db'), autoload: true })
};

// 一次性迁移逻辑：将旧的 JSON 数据导入到 DB
const migrateData = async () => {
  const OLD_DB_PATH = path.join(__dirname, 'game_storage.json');
  if (fs.existsSync(OLD_DB_PATH)) {
    try {
      const data = JSON.parse(fs.readFileSync(OLD_DB_PATH, 'utf8'));
      
      // 迁移用户
      const existingUsers = await db.users.find({});
      if (existingUsers.length === 0 && data.users && data.users.length > 0) {
        console.log('🚚 正在迁移用户数据...');
        await db.users.insert(data.users);
      }

      // 迁移进度
      const existingProgress = await db.progress.find({});
      if (existingProgress.length === 0 && data.progress) {
        console.log('🚚 正在迁移游戏进度...');
        for (const [userId, gameData] of Object.entries(data.progress)) {
          await db.progress.insert({ userId: Number(userId), gameData });
        }
      }
      
      // 备份旧文件后删除
      fs.renameSync(OLD_DB_PATH, OLD_DB_PATH + '.bak');
      console.log('✅ 数据迁移完成，旧文件已重命名为 .bak');
    } catch (e) {
      console.error('❌ 数据迁移失败:', e);
    }
  }
};
migrateData();

app.use(cors());
app.use(express.json());

// 静态文件服务 (生产环境)
// 假设前端 build 后的文件在根目录的 dist 文件夹中
const distPath = path.join(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  console.log('🌐 生产环境模式: 已启用静态资源托管');
}

// 连通性测试
app.get('/api/health', (req, res) => res.json({ status: 'ok', message: '影迹战术后端引擎已启动 (生产级 DB 模式)' }));

// 令牌验证
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);
  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// 1. 注册
app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    const existingUser = await db.users.findOne({ username });
    if (existingUser) return res.status(400).json({ error: '档案代号已存在' });
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = { id: Date.now(), username, password: hashedPassword };
    await db.users.insert(newUser);
    res.json({ message: '档案建立成功' });
  } catch (e) {
    res.status(500).json({ error: '系统内部故障' });
  }
});

// 2. 登录
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await db.users.findOne({ username });
    if (!user) return res.status(400).json({ error: '档案不存在' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: '密钥错误' });

    const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY, { expiresIn: '7d' });
    res.json({ token, username: user.username });
  } catch (e) {
    res.status(500).json({ error: '登录验证失败' });
  }
});

// 3. 存档
app.post('/api/save', authenticateToken, async (req, res) => {
  try {
    const { gameData } = req.body;
    await db.progress.update(
      { userId: req.user.id },
      { $set: { userId: req.user.id, gameData } },
      { upsert: true }
    );
    res.json({ message: '同步成功' });
  } catch (e) {
    console.error('❌ [API Save Error]:', e.stack);
    res.status(500).json({ error: '同步失败' });
  }
});

// 4. 读档
app.get('/api/load', authenticateToken, async (req, res) => {
  try {
    const doc = await db.progress.findOne({ userId: req.user.id });
    res.json({ gameData: doc ? doc.gameData : null });
  } catch (e) {
    console.error('❌ [API Load Error]:', e);
    res.status(500).json({ error: '加载失败' });
  }
});

// 5. 管理员接口：设置指定用户的等级和储备
app.post('/api/admin/set-stats', async (req, res) => {
  try {
    const { username, level, gold, statPoints } = req.body;
    if (!username) return res.status(400).json({ error: '必须提供档案代号' });

    // 查找用户 ID
    const user = await db.users.findOne({ username });
    if (!user) return res.status(404).json({ error: '未找到该档案' });

    // 获取现有进度或创建新进度
    let progress = await db.progress.findOne({ userId: user.id });
    let gameData = progress ? progress.gameData : { 
      level: 1, xp: 0, gold: 100, 
      stats: { strength: 10, agility: 10, constitution: 12 }, 
      statPoints: 8, health: 250, maxHealth: 250,
      equipment: { weapon: '长剑', armor: '布衣', skill: '蓄能重击' },
      unlockedItems: { '长剑': 1, '长弓': 1, '重锤': 1, '布衣': 1, '铁盾': 1, '披风': 1, '蓄能重击': 1, '治疗': 1, '幻影连击': 1 },
      defeatCount: 0
    };

    // 确保 unlockedItems 存在
    if (!gameData.unlockedItems) {
      gameData.unlockedItems = { '长剑': 1, '长弓': 1, '重锤': 1, '布衣': 1, '铁盾': 1, '披风': 1, '蓄能重击': 1 };
    }

    // 深度克隆并更新数值
    const updatedGameData = JSON.parse(JSON.stringify(gameData));
    if (level !== undefined) updatedGameData.level = Number(level);
    if (gold !== undefined) updatedGameData.gold = Number(gold);
    if (statPoints !== undefined) updatedGameData.statPoints = Number(statPoints);

    await db.progress.update(
      { userId: user.id },
      { $set: { userId: user.id, gameData: updatedGameData } },
      { upsert: true }
    );

    console.log(`🛠️ 管理员操作成功: ${username} (ID: ${user.id})`);
    res.json({ message: '参数校准完成', currentStats: updatedGameData });
  } catch (e) {
    console.error('❌ [Admin Command Error]:', e.stack);
    res.status(500).json({ error: '系统内部故障', details: e.message });
  }
});

// 所有非 API 请求重定向到 index.html (支持 SPA 路由)
app.get(/.*/, (req, res) => {
  const indexPath = path.join(__dirname, '../dist/index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('未找到静态资源，请先执行 npm run build');
  }
});

// 6. 全局错误捕获
app.use((err, req, res, next) => {
  console.error('🔥 [Global Error]:', err.stack);
  res.status(500).json({ error: '服务器内部链路故障' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend Active: http://0.0.0.0:${PORT}`);
});

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const Datastore = require('nedb-promises');

const app = express();
const PORT = 5273;
const SECRET_KEY = 'shadow_trace_secret_2026';

// 采用 NeDB 进行数据持久化，确保生产环境数据隔离
const db = {
  users: Datastore.create({ filename: path.join(__dirname, 'users.db'), autoload: true }),
  progress: Datastore.create({ filename: path.join(__dirname, 'progress.db'), autoload: true })
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
      { userId: req.user.id, gameData },
      { upsert: true }
    );
    res.json({ message: '同步成功' });
  } catch (e) {
    res.status(500).json({ error: '同步失败' });
  }
});

// 4. 读档
app.get('/api/load', authenticateToken, async (req, res) => {
  try {
    const doc = await db.progress.findOne({ userId: req.user.id });
    res.json({ gameData: doc ? doc.gameData : null });
  } catch (e) {
    res.status(500).json({ error: '加载失败' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend Active: http://0.0.0.0:${PORT}`);
});

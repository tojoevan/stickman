const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3001;
const SECRET_KEY = 'shadow_trace_secret_2026';

// 采用最稳健的 JSON 文件存储，确保在任何 Linux/Docker/Mac 环境下无需编译即可运行
const DB_PATH = path.join(__dirname, 'game_storage.json');

// 初始化存储结构
if (!fs.existsSync(DB_PATH)) {
  fs.writeFileSync(DB_PATH, JSON.stringify({ users: [], progress: {} }));
}

const getData = () => JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
const saveData = (data) => fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization'] }));
app.use(express.json());

// 连通性测试
app.get('/api/health', (req, res) => res.json({ status: 'ok', message: '影迹战术后端引擎已启动 (超兼容 JSON 模式)' }));

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
    const data = getData();
    if (data.users.find(u => u.username === username)) return res.status(400).json({ error: '档案代号已存在' });
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = { id: Date.now(), username, password: hashedPassword };
    data.users.push(newUser);
    saveData(data);
    res.json({ message: '档案建立成功' });
  } catch (e) {
    res.status(500).json({ error: '系统内部故障' });
  }
});

// 2. 登录
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const data = getData();
    const user = data.users.find(u => u.username === username);
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
app.post('/api/save', authenticateToken, (req, res) => {
  const { gameData } = req.body;
  const data = getData();
  data.progress[req.user.id] = gameData;
  saveData(data);
  res.json({ message: '同步成功' });
});

// 4. 读档
app.get('/api/load', authenticateToken, (req, res) => {
  const data = getData();
  res.json({ gameData: data.progress[req.user.id] || null });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend Active: http://0.0.0.0:${PORT}`);
});

const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
const PORT = 3001;
const SECRET_KEY = 'stickman_secret_2026';

// 更加宽容的跨域配置
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// 增加基础连通性测试接口
app.get('/api/health', (req, res) => res.json({ status: 'ok', message: '影迹战术后端已连接' }));

// --- 数据库初始化 ---
const db = new sqlite3.Database(path.join(__dirname, 'game.db'), (err) => {
  if (err) console.error('Database connection error:', err);
  else console.log('Connected to SQLite database.');
});

db.serialize(() => {
  // 用户表
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT
  )`);

  // 游戏进度表
  db.run(`CREATE TABLE IF NOT EXISTS progress (
    user_id INTEGER PRIMARY KEY,
    game_data TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);
});

// --- 中间件：验证令牌 ---
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

// 增加请求日志
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// --- API 路由 ---

// 1. 注册
app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: '用户名和密码不能为空' });
    
    const hashedPassword = await bcrypt.hash(password, 10);
    db.run(`INSERT INTO users (username, password) VALUES (?, ?)`, [username, hashedPassword], function(err) {
      if (err) {
        console.error('Register Error:', err.message);
        return res.status(400).json({ error: '用户名已存在或注册失败' });
      }
      res.json({ message: '注册成功，请登录' });
    });
  } catch (e) {
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 2. 登录
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  db.get(`SELECT * FROM users WHERE username = ?`, [username], async (err, user) => {
    if (err) return res.status(500).json({ error: '数据库查询失败' });
    if (!user) return res.status(400).json({ error: '档案不存在' });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ error: '访问密码错误' });

    const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY, { expiresIn: '7d' });
    res.json({ token, username: user.username });
  });
});

// 3. 保存进度
app.post('/api/save', authenticateToken, (req, res) => {
  const { gameData } = req.body;
  const userId = req.user.id;

  db.run(`INSERT OR REPLACE INTO progress (user_id, game_data) VALUES (?, ?)`, 
    [userId, JSON.stringify(gameData)], 
    (err) => {
      if (err) return res.status(500).json({ error: '保存失败' });
      res.json({ message: '存档成功' });
    }
  );
});

// 4. 读取进度
app.get('/api/load', authenticateToken, (req, res) => {
  const userId = req.user.id;

  db.get(`SELECT game_data FROM progress WHERE user_id = ?`, [userId], (err, row) => {
    if (err) return res.status(500).json({ error: '读取失败' });
    if (!row) return res.json({ gameData: null });
    res.json({ gameData: JSON.parse(row.game_data) });
  });
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});

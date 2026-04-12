import React, { useState, useEffect, useRef } from 'react';

// --- 配置 ---
const API_URL = '/api';

// --- 辅助：处理请求报错 ---
const safeFetch = async (url: string, options: any) => {
  try {
    const res = await fetch(url, options);
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `服务器响应异常: ${res.status}`);
    }
    return res;
  } catch (err: any) {
    console.error('❌ 链路传输中断:', err.message);
    throw err;
  }
};

// --- 类型与数据定义 ---
type Stat = 'strength' | 'agility' | 'constitution';
type Rarity = 'common' | 'novel' | 'perfect' | 'epic';
type ItemTag = 'slashing' | 'crushing' | 'piercing' | 'energy' | 'light' | 'heavy' | 'medium';

interface Item {
  name: string;
  damage?: number;
  defense?: number;
  evasion?: number;
  mult?: number;
  icon: string;
  desc: string;
  cost?: number;
  rarity: Rarity;
  levelReq?: number;
  tag: ItemTag;
}

interface Battlefield {
  id: string;
  name: string;
  desc: string;
  effect: string;
  bgColor: string;
  accentColor: string;
}

const BATTLEFIELDS: Battlefield[] = [
  { id: 'neutral', name: '虚拟训练场', desc: '标准的模拟战斗环境。', effect: '无特殊修正。', bgColor: '#0f172a', accentColor: '#38bdf8' },
  { id: 'emp', name: '强磁雷暴区', desc: '强磁场使精密设备失灵。', effect: '史诗装备 -40%，普通装备 +60%。', bgColor: '#1e1b4b', accentColor: '#818cf8' },
  { id: 'narrow', name: '暗影狭廊', desc: '极度狭窄，施展不开重型武器。', effect: '重型武器 -50%，轻捷武器 +40%。', bgColor: '#18181b', accentColor: '#52525b' },
  { id: 'desert', name: '荒漠戈壁', desc: '视野开阔，风速稳定。', effect: '弓类武器 +60%，闪避率 +10%。', bgColor: '#451a03', accentColor: '#f59e0b' },
  { id: 'overload', name: '能源核心', desc: '空气中充斥着高能粒子。', effect: '技能倍率 +100%，受创 +30%。', bgColor: '#4c0519', accentColor: '#f43f5e' },
];

const ITEMS = {
  weapons: [
    { name: '长剑', damage: 15, icon: '⚔️', desc: '新手利刃', cost: 50, rarity: 'common', tag: 'slashing' },
    { name: '名刀', damage: 32, icon: '🎋', desc: '迅捷致命', cost: 150, rarity: 'novel', levelReq: 3, tag: 'slashing' },
    { name: '影刃', damage: 130, icon: '🔪', desc: '虚空之遗', cost: 8500, rarity: 'epic', levelReq: 40, tag: 'slashing' },
    
    { name: '长弓', damage: 12, icon: '🏹', desc: '远程精准', cost: 50, rarity: 'common', tag: 'piercing' },
    { name: '战术弩', damage: 28, icon: '🎯', desc: '半自动连发', cost: 200, rarity: 'novel', levelReq: 5, tag: 'piercing' },
    { name: '神龙弓', damage: 55, icon: '🐉', desc: '破空之箭', cost: 600, rarity: 'perfect', levelReq: 12, tag: 'piercing' },
    
    { name: '重锤', damage: 25, icon: '🔨', desc: '势大力沉', cost: 60, rarity: 'common', tag: 'crushing' },
    { name: '动力锤', damage: 48, icon: '🚜', desc: '工业级粉碎', cost: 450, rarity: 'novel', levelReq: 8, tag: 'crushing' },
    { name: '雷神锤', damage: 150, icon: '⚡', desc: '众神之怒', cost: 4500, rarity: 'epic', levelReq: 25, tag: 'crushing' },
    
    { name: '热能刀', damage: 18, icon: '🔥', desc: '分子切割', cost: 80, rarity: 'common', tag: 'energy' },
    { name: '等离子炮', damage: 75, icon: '🎇', desc: '高能聚合', cost: 1200, rarity: 'perfect', levelReq: 18, tag: 'energy' },
    { name: '激光剑', damage: 180, icon: '🔦', desc: '等离子刃', cost: 12000, rarity: 'epic', levelReq: 30, tag: 'energy' },
  ] as Item[],
  armors: [
    { name: '布衣', defense: 0, evasion: 0, icon: '👕', desc: '轻便无负重', cost: 40, rarity: 'common', tag: 'light' },
    { name: '披风', defense: 3, evasion: 20, icon: '🧥', desc: '幻影闪避', cost: 60, rarity: 'common', tag: 'light' },
    { name: '潜行特工服', defense: 15, evasion: 45, icon: '🕴️', desc: '光学迷彩', cost: 800, rarity: 'novel', levelReq: 4, tag: 'light' },
    
    { name: '凯夫拉', defense: 8, evasion: 0, icon: '🥋', desc: '防弹纤维', cost: 50, rarity: 'common', tag: 'medium' },
    { name: '动力装甲', defense: 45, evasion: 5, icon: '🤖', desc: '外骨骼增强', cost: 500, rarity: 'novel', levelReq: 5, tag: 'medium' },
    { name: '虚空甲', defense: 95, evasion: 10, icon: '🌌', desc: '暗物质抵挡', cost: 2000, rarity: 'perfect', levelReq: 15, tag: 'medium' },
    
    { name: '铁盾', defense: 12, evasion: -5, icon: '🛡️', desc: '稳固防御', cost: 60, rarity: 'common', tag: 'heavy' },
    { name: '合金护板', defense: 35, evasion: -10, icon: '⛓️', desc: '强化钢材', cost: 400, rarity: 'novel', levelReq: 7, tag: 'heavy' },
    { name: '复合重装', defense: 220, evasion: -20, icon: '🚜', desc: '移动堡垒', cost: 8000, rarity: 'perfect', levelReq: 22, tag: 'heavy' },
    
    { name: '干扰烟幕', defense: 5, evasion: 15, icon: '💨', desc: '电子波干扰', cost: 70, rarity: 'common', tag: 'field' },
    { name: '纳米蜂群', defense: 50, evasion: 60, icon: '🐝', desc: '微型机器人拦截', cost: 6500, rarity: 'epic', levelReq: 35, tag: 'field' },
    { name: '反物质盾', defense: 350, evasion: -15, icon: '💠', desc: '终极防御屏障', cost: 15000, rarity: 'epic', levelReq: 60, tag: 'field' },
  ] as Item[],
  skills: [
    { name: '蓄能重击', mult: 1.8, icon: '💥', desc: '牺牲攻速换取爆发，附加100%力量伤害', cost: 100, rarity: 'common', tag: 'crushing' },
    { name: '幻影连击', mult: 0.8, icon: '⚡', desc: '极速二次打击，敏捷大幅增幅伤害', cost: 300, rarity: 'novel', levelReq: 5, tag: 'slashing' },
    { name: '弱点扫描', mult: 1.2, icon: '🔍', desc: '解析对手防御，强制无视抗性修正', cost: 800, rarity: 'perfect', levelReq: 12, tag: 'piercing' },
    { name: '神经修复', mult: 0, icon: '✨', desc: '生物纳米修复，基于体质大量回血', cost: 500, rarity: 'novel', levelReq: 8, tag: 'light' },
    { name: '动能反射', mult: 0.5, icon: '🛡️', desc: '构建反击护盾，反弹受到的50%伤害', cost: 2000, rarity: 'perfect', levelReq: 20, tag: 'heavy' },
    { name: '系统过载', mult: 3.5, icon: '☢️', desc: '极限超频，极高伤害但会反噬自身', cost: 10000, rarity: 'epic', levelReq: 45, tag: 'energy' },
  ] as Item[]
};

const INITIAL_CHAR: Character = {
  username: 'Unknown',
  level: 1, xp: 0, gold: 100,
  stats: { strength: 10, agility: 10, constitution: 12 },
  statPoints: 8, health: 120, maxHealth: 120,
  equipment: { weapon: '长剑', armor: '布衣', skill: '斩击' },
  unlockedItems: { '长剑': 1, '长弓': 1, '重锤': 1, '热能刀': 1, '布衣': 1, '铁盾': 1, '披风': 1, '凯夫拉': 1, '干扰烟幕': 1, '斩击': 1, '治疗': 1, '连击': 1 },
  defeatCount: 0
};

const ENEMY_NAMES = ['Aegis-7', 'Phantom-X', 'Cerberus', 'Viper-9', 'Titan-2', 'Ghost-Protocol', 'Nova-Core', 'Shadow-Stalker', 'Cyber-Reaper', 'Iron-Wraith'];

const calcVal = (base: number, level: number) => Math.floor(base * (1 + 0.15 * (level - 1)));
const getAttackCounterMult = (wTag: string, aTag: string) => {
  if (wTag === 'slashing' && aTag === 'light') return 1.35;
  if (wTag === 'piercing' && aTag === 'medium') return 1.35;
  if (wTag === 'energy' && aTag === 'heavy') return 1.35;
  if (wTag === 'crushing' && aTag === 'field') return 1.35;
  return 1.0;
};
const getDefenseCounterMult = (aTag: string, wTag: string) => {
  if (aTag === 'light' && wTag === 'crushing') return 0.65;
  if (aTag === 'medium' && wTag === 'slashing') return 0.65;
  if (aTag === 'heavy' && wTag === 'piercing') return 0.65;
  if (aTag === 'field' && wTag === 'energy') return 0.65;
  return 1.0;
};

// --- 神经滚轮组件 (Native Scroll 版) ---
const NeuralPicker = ({ label, items, selected, onSelect, unlockedItems }: { label: string, items: any[], selected: string, onSelect: (name: string) => void, unlockedItems: Record<string, number> }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [spacerHeight, setSpacerHeight] = useState(0);
  const itemHeight = 64; 
  const tripleItems = [...items, ...items, ...items];
  const centerOffset = items.length * itemHeight;

  // 记录最后一次选中的索引，用于防抖
  const lastSelectedIndex = useRef(-1);

  // 初始化：计算居中所需的占位高度并设置初始滚动位置
  useEffect(() => {
    if (scrollRef.current) {
      const containerHeight = scrollRef.current.clientHeight;
      const sh = (containerHeight - itemHeight) / 2;
      setSpacerHeight(sh);

      const idx = items.findIndex(i => i.name === selected);
      // 初始滚动到中间组的对应项
      scrollRef.current.scrollTop = centerOffset + (idx * itemHeight);
    }
  }, [items.length]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const st = scrollRef.current.scrollTop;
    
    // 循环边界重置逻辑
    if (st < itemHeight) {
      scrollRef.current.scrollTop = st + centerOffset;
      return;
    } else if (st > centerOffset * 2 + itemHeight) {
      scrollRef.current.scrollTop = st - centerOffset;
      return;
    }

    // 精确计算当前中心项
    const relativeScroll = st - centerOffset;
    const currentIdx = Math.round(relativeScroll / itemHeight);
    const safeIdx = (currentIdx + items.length) % items.length;

    if (items[safeIdx] && lastSelectedIndex.current !== safeIdx) {
      lastSelectedIndex.current = safeIdx;
      onSelect(items[safeIdx].name);
    }
  };

  return (
    <div className="flex-1 flex flex-row items-center gap-4 min-w-0 h-full">
      <div className="flex-none flex flex-col items-center justify-center">
         <p className="text-[13px] font-black text-slate-400 uppercase tracking-[0.4em] [writing-mode:vertical-rl] py-4 border-r-2 border-slate-100 pr-3 leading-none italic">{label}</p>
      </div>
      <div className="flex-1 h-full bg-slate-900/[0.03] rounded-[2.5rem] relative border border-slate-100/50 overflow-hidden">
        {/* 中心指示器 */}
        <div className="absolute inset-x-2 h-[64px] top-1/2 -translate-y-1/2 bg-white shadow-sm border border-slate-100 rounded-2xl pointer-events-none z-0"></div>
        
        <div 
          ref={scrollRef}
          onScroll={handleScroll}
          className="relative z-10 h-full overflow-y-auto overflow-x-hidden custom-scrollbar snap-y snap-mandatory"
          style={{ scrollbarWidth: 'none' }}
        >
          {/* 上部占位 */}
          <div style={{ height: spacerHeight }} />
          
          {tripleItems.map((item, idx) => {
            const isMatch = item.name === selected;
            return (
              <div 
                key={`${item.name}-${idx}`}
                className={`h-[64px] flex flex-row items-center justify-center gap-3 snap-center transition-all duration-200 px-2 ${isMatch ? 'opacity-100 scale-110' : 'opacity-20 scale-90'}`}
              >
                <span className="text-3xl flex-none">{item.icon}</span>
                <div className="flex flex-col justify-center min-w-0">
                  <span className={`text-[14px] font-black truncate leading-tight ${isMatch ? 'text-slate-800' : 'text-slate-400'}`}>
                    {item.name}
                  </span>
                  <span className={`text-[9px] font-bold font-mono ${isMatch ? 'text-indigo-500' : 'text-slate-300'}`}>
                    Lv.{unlockedItems[item.name] || 1}
                  </span>
                </div>
              </div>
            );
          })}

          {/* 下部占位 */}
          <div style={{ height: spacerHeight }} />
        </div>
      </div>
    </div>
  );
};

interface BattleRoundRecord { round: number; pDmg: number; eDmg: number; pRemainingHp: number; eRemainingHp: number; }

class StickmanRenderer {
  private ctx: CanvasRenderingContext2D; private time: number = 0; public effects: any[] = []; private nextEffectId: number = 0;
  constructor(ctx: CanvasRenderingContext2D) { this.ctx = ctx; }
  addEffect(type: any, x: number, y: number, color: string = '#475569', count: number = 1) { 
    for (let i = 0; i < count; i++) { 
      if (type === 'charge') {
        const angle = Math.random() * Math.PI * 2;
        const dist = 120 + Math.random() * 80;
        this.effects.push({
          id: this.nextEffectId++, type,
          tx: x, ty: y - 45, // 手部目标点
          x: x + Math.cos(angle) * dist,
          y: (y - 45) + Math.sin(angle) * dist,
          vx: -Math.cos(angle) * 8, // 向中心加速
          vy: -Math.sin(angle) * 8,
          life: 1.0, color, size: Math.random() * 4 + 2
        });
      } else {
        this.effects.push({ 
          id: this.nextEffectId++, type, x, y, 
          vx: type === 'heal' ? (Math.random() - 0.5) * 4 : (Math.random() - 0.5) * 10, 
          vy: type === 'heal' ? -Math.random() * 5 : (Math.random() - 0.5) * 10, 
          life: 1.0, color, size: type === 'scan' ? 800 : Math.random() * 6 + 3 
        }); 
      }
    } 
  }
  advance() { 
    this.time += 0.04;
    this.effects = this.effects.filter(e => { 
      e.x += e.vx; e.y += e.vy; 
      const decay = (e.type === 'scan' || e.type === 'shield' || e.type === 'charge' ? 0.012 : 0.02);
      e.life -= decay; 
      if (e.type === 'arrow') e.vx = 20; 
      return e.life > 0; 
    }); 
  }
  drawBackground(field: Battlefield) {
    const ctx = this.ctx; ctx.save(); ctx.fillStyle = field.bgColor; ctx.fillRect(0, 0, 800, 400);
    if (field.id === 'neutral') { ctx.strokeStyle = field.accentColor; ctx.lineWidth = 1; ctx.globalAlpha = 0.2; for(let i=0; i<800; i+=40) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + Math.sin(this.time+i)*5, 400); ctx.stroke(); } }
    else if (field.id === 'emp') { ctx.strokeStyle = '#818cf8'; ctx.lineWidth = 2; for(let i=0; i<5; i++) { if (Math.random() > 0.8) { ctx.beginPath(); ctx.moveTo(Math.random()*800, 0); ctx.lineTo(Math.random()*800, 400); ctx.globalAlpha = 0.3; ctx.stroke(); } } }
    else if (field.id === 'narrow') { ctx.fillStyle = '#27272a'; ctx.fillRect(0, 0, 800, 60); ctx.fillRect(0, 340, 800, 60); }
    else if (field.id === 'overload') { ctx.strokeStyle = '#f43f5e'; ctx.lineWidth = 3; ctx.globalAlpha = Math.abs(Math.sin(this.time*2))*0.3; ctx.beginPath(); ctx.arc(400, 200, 150 + Math.sin(this.time)*20, 0, Math.PI * 2); ctx.stroke(); }
    ctx.restore();
  }
  drawCharacter(x: number, y: number, pose: any, flip: boolean = false, agility: number = 10, weaponIcon: string = '⚔️') {
    const ctx = this.ctx; const t = this.time * (1 + agility / 45); ctx.save(); ctx.translate(x, y); if (flip) ctx.scale(-1, 1);
    ctx.strokeStyle = pose === 'dead' ? '#cbd5e1' : '#f8fafc'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    const headSize = 18; const bodyHeight = 55; let armAngle = Math.sin(t) * 0.4; let legAngle = Math.cos(t) * 0.4;
    if (pose === 'attack') { armAngle = -1.8 + Math.sin(t * 8) * 1.2; ctx.translate(Math.sin(t * 8) * 20, 0); ctx.font = '32px serif'; ctx.fillText(weaponIcon, Math.cos(armAngle) * 40 - 15, -bodyHeight + Math.sin(armAngle) * 40); }
    else if (pose === 'hit') { ctx.strokeStyle = '#ef4444'; ctx.translate(Math.sin(this.time * 60) * 10, 0); }
    else if (pose === 'dead') { ctx.rotate(Math.PI / 2); ctx.translate(35, -15); armAngle = 0.5; legAngle = 0.2; }
    ctx.beginPath(); ctx.arc(0, -bodyHeight - headSize, headSize, 0, Math.PI * 2); ctx.moveTo(0, -bodyHeight); ctx.lineTo(0, 0); 
    ctx.moveTo(0, -bodyHeight + 8); ctx.lineTo(Math.cos(armAngle) * 35, -bodyHeight + 8 + Math.sin(armAngle) * 35);
    ctx.moveTo(0, -bodyHeight + 8); ctx.lineTo(Math.cos(-armAngle) * -30, -bodyHeight + 8 + Math.sin(-armAngle) * 30);
    ctx.moveTo(0, 0); ctx.lineTo(Math.sin(legAngle) * 30, 35); ctx.moveTo(0, 0); ctx.lineTo(Math.sin(-legAngle) * 30, 35);
    ctx.stroke(); ctx.restore();
  }
  renderEffects() {
    const ctx = this.ctx;
    this.effects.forEach(e => { 
      ctx.save();
      ctx.globalAlpha = Math.max(0, e.life);
      if (e.type === 'charge') {
        ctx.strokeStyle = e.color; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(e.x, e.y);
        ctx.lineTo(e.x + e.vx * 2, e.y + e.vy * 2); // 绘制汇聚光线
        ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.beginPath();
        ctx.arc(e.x, e.y, e.size * e.life, 0, Math.PI * 2); ctx.fill();
      }
      else if (e.type === 'scan') { 
        ctx.fillStyle = e.color || '#818cf8';
        const scanY = e.y + (1 - e.life) * 400 - 200;
        ctx.fillRect(0, scanY, 800, 6); 
        ctx.globalAlpha = e.life * 0.4;
        ctx.fillRect(0, scanY - 15, 800, 36); 
      }
      else if (e.type === 'shield') { 
        ctx.strokeStyle = e.color || '#ef4444'; ctx.lineWidth = 5; 
        ctx.beginPath(); ctx.arc(e.x, e.y - 40, 65, 0, Math.PI * 2); ctx.stroke(); 
        ctx.globalAlpha = e.life * 0.2; ctx.fillStyle = e.color; ctx.fill();
      }
      else if (e.type === 'heal') {
        ctx.fillStyle = '#10b981'; ctx.beginPath(); ctx.arc(e.x, e.y, e.size * e.life, 0, Math.PI * 2); ctx.fill();
      }
      else { 
        ctx.fillStyle = e.color || '#f59e0b'; ctx.beginPath(); ctx.arc(e.x, e.y, e.size * e.life, 0, Math.PI * 2); ctx.fill(); 
      }
      ctx.restore();
    });
  }
}

interface Character {
  username?: string;
  level: number; xp: number; gold: number;
  stats: Record<Stat, number>; statPoints: number; health: number; maxHealth: number;
  equipment: { weapon: string; armor: string; skill: string; };
  unlockedItems: Record<string, number>; defeatCount: number;
}

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  const [authForm, setAuthForm] = useState({ username: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [player, setPlayer] = useState<Character>(() => {
    const saved = localStorage.getItem('username');
    console.log('🏗️ [Init] Player 初始加载. LocalStorage username:', saved);
    return { 
      ...INITIAL_CHAR, 
      username: saved || INITIAL_CHAR.username 
    };
  });
  const [enemy, setEnemy] = useState<Character>(() => {
    const eName = ENEMY_NAMES[Math.floor(Math.random() * ENEMY_NAMES.length)];
    console.log('🏗️ [Init] Enemy 初始加载. Name:', eName);
    return { 
      ...INITIAL_CHAR, 
      username: eName, 
      stats: { strength: 8, agility: 7, constitution: 8 }, 
      health: 90, maxHealth: 90 
    };
  });
  const [gameState, setGameState] = useState<'lobby' | 'tactics' | 'battle' | 'shop' | 'victory' | 'defeat'>('lobby');
  const [round, setRound] = useState(1);
  const [battleLog, setBattleLog] = useState<string[]>(['等待连接...']);
  const [currentPose, setCurrentPose] = useState<{player: any, enemy: any}>({player: 'idle', enemy: 'idle'});
  const [previewItem, setPreviewItem] = useState<Item | null>(null);
  const [field, setField] = useState<Battlefield>(BATTLEFIELDS[0]);
  const [battleHistory, setBattleHistory] = useState<BattleRoundRecord[]>([]);
  const [shopTab, setShopTab] = useState<'weapons' | 'armors' | 'skills'>('weapons');
  const [activeSkill, setActiveSkill] = useState<{name: string, icon: string, isP: boolean} | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<StickmanRenderer | null>(null);
  const hasLoaded = useRef(false);

  // 确保渲染器尽早初始化
  useEffect(() => {
    if (canvasRef.current && !rendererRef.current) {
      rendererRef.current = new StickmanRenderer(canvasRef.current.getContext('2d')!);
    }
  }, []);

  const addLog = (msg: string) => setBattleLog(prev => [msg, ...prev].slice(0, 20));

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authView === 'register' && authForm.password !== authForm.confirmPassword) {
      alert('接入密钥不一致，请核对。');
      return;
    }
    try {
      const res = await safeFetch(`${API_URL}/${authView}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(authForm) });
      const data = await res.json();
      if (data.token) { 
        localStorage.setItem('token', data.token); 
        localStorage.setItem('username', data.username);
        setToken(data.token); 
        setPlayer(prev => ({ ...prev, username: data.username || prev.username }));
        addLog('神经链路已建立。'); 
        hasLoaded.current = true; // 登录成功视为已加载，允许后续保存
      } else setAuthView('login');
    } catch (err: any) { alert(err.message); }
  };

  useEffect(() => {
    if (token) {
      const savedUser = localStorage.getItem('username');
      console.log('🔍 [Load] Token 存在，尝试恢复档案. SavedUser:', savedUser);
      fetch(`${API_URL}/load`, { headers: { 'Authorization': `Bearer ${token}` } }).then(res => res.json()).then(data => { 
        console.log('🔍 [Load] 后端响应:', data);
        if (data.gameData) {
          const rawData = data.gameData; 
          if (Array.isArray(rawData.unlockedItems)) { 
            const m: any = {}; rawData.unlockedItems.forEach((n: any) => m[n] = 1); rawData.unlockedItems = m; 
          }
          setPlayer(prev => ({ 
            ...prev, 
            ...rawData, 
            username: savedUser || rawData.username || prev.username || INITIAL_CHAR.username 
          })); 
          addLog('档案同步成功。');
        } else if (savedUser) {
          setPlayer(prev => ({ ...prev, username: savedUser }));
        }
        // 关键：标记为已加载，只有加载完成后才允许保存
        setTimeout(() => { hasLoaded.current = true; }, 500);
      });
    }
  }, [token]);

  useEffect(() => { 
    if (token && hasLoaded.current) {
      console.log('💾 [Save] 正在同步数据至云端...', player.level);
      fetch(`${API_URL}/save`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, 
        body: JSON.stringify({ gameData: player }) 
      }); 
    }
  }, [player.level, player.gold, player.stats, player.unlockedItems]);

  useEffect(() => {
    let frame: number;
    const loop = () => {
      if (canvasRef.current) {
        if (!rendererRef.current) rendererRef.current = new StickmanRenderer(canvasRef.current.getContext('2d')!);
        
        const r = rendererRef.current;
        r.advance(); // 更新逻辑
        r.drawBackground(field);
        
        const pW = ITEMS.weapons.find(w => w.name === player.equipment.weapon);
        const eW = ITEMS.weapons.find(w => w.name === enemy.equipment.weapon);
        
        r.drawCharacter(240, 280, currentPose.player, false, player.stats.agility, pW?.icon); 
        r.drawCharacter(560, 280, currentPose.enemy, true, enemy.stats.agility, eW?.icon || '⚔️');
        
        r.renderEffects(); // 始终在最上层渲染
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [field, currentPose, player.equipment.weapon, enemy.equipment.weapon, player.stats.agility, enemy.stats.agility]);

  const buyItem = (item: Item) => setPreviewItem(item);
  const confirmPurchase = (item: Item) => {
    const curLvl = player.unlockedItems[item.name] || 0; const cost = Math.floor((item.cost || 0) * Math.pow(1.6, curLvl));
    if (player.gold >= cost) { setPlayer(prev => ({ ...prev, gold: prev.gold - cost, unlockedItems: { ...prev.unlockedItems, [item.name]: curLvl + 1 } })); addLog(`强化: ${item.name} [Lv.${curLvl+1}]`); setPreviewItem(null); }
  };

  const handleLevelUp = (stat: Stat) => { if (player.statPoints > 0) setPlayer(prev => { const nMax = stat === 'constitution' ? Math.floor(prev.maxHealth + 15) : prev.maxHealth; return { ...prev, stats: { ...prev.stats, [stat]: prev.stats[stat] + 1 }, statPoints: prev.statPoints - 1, maxHealth: nMax, health: nMax }; }); };

  const startRound = async () => {
    setGameState('battle'); addLog(`>>> 神经链路第 ${round} 轮同步`);
    let pHP = Math.floor(player.health); let eHP = Math.floor(enemy.health);
    let curP_Dmg = 0; let curE_Dmg = 0;
    
    const pS = ITEMS.skills.find(i => i.name === player.equipment.skill) || ITEMS.skills[0];
    const eS = ITEMS.skills.find(i => i.name === enemy.equipment.skill) || ITEMS.skills[0];

    // --- 阶段一：神经技能释放 ---
    const releaseSkill = async (isP: boolean) => {
      const s = isP ? pS : eS; const x = isP ? 240 : 560;
      if (!s) return;
      setActiveSkill({ name: s.name, icon: s.icon, isP });
      addLog(`${isP ? '>>' : '<<'} [准备] ${isP ? player.username : enemy.username}: ${s.name}`);
      
      if (s.name === '弱点扫描') rendererRef.current?.addEffect('scan', x, 200, '#818cf8', 1);
      if (s.name === '动能反射') rendererRef.current?.addEffect('shield', x, 280, '#ef4444', 1);
      if (s.name === '系统过载') rendererRef.current?.addEffect('spark', x, 250, '#f43f5e', 20);
      if (s.name === '蓄能重击') rendererRef.current?.addEffect('charge', x, 280, '#f59e0b', 40); 
      if (s.name === '幻影连击') rendererRef.current?.addEffect('spark', x, 280, '#6366f1', 30); // 为连击增加疾速粒子
      if (s.name === '神经修复') {
        const atk = isP ? player : enemy;
        const sL = isP ? (player.unlockedItems[s.name] || 1) : (enemy.unlockedItems[s.name] || 1);
        const heal = Math.floor((atk.maxHealth - (isP ? pHP : eHP)) * 0.25 + atk.stats.constitution * 0.5 * sL);
        rendererRef.current?.addEffect('heal', x, 280, '#10b981', 12);
        if (isP) { pHP = Math.min(player.maxHealth, pHP + heal); setPlayer(prev => ({...prev, health: pHP})); }
        else { eHP = Math.min(enemy.maxHealth, eHP + heal); setEnemy(prev => ({...prev, health: eHP})); }
        addLog(`${isP ? '>>' : '<<'} [修复] +${heal} HP`);
      }
      await new Promise(r => setTimeout(r, 800)); // 稍作延长以供观赏提示
      setActiveSkill(null);
      await new Promise(r => setTimeout(r, 200));
    };

    await releaseSkill(true);
    await releaseSkill(false);

    // --- 阶段二：战术交火 ---
    const executeTurn = async (isP: boolean) => {
      if ((isP && pHP <= 0) || (!isP && eHP <= 0)) return;

      const atk = isP ? player : enemy; const def = isP ? enemy : player;
      const wN = isP ? player.equipment.weapon : enemy.equipment.weapon; const aN = isP ? enemy.equipment.armor : player.equipment.armor;
      const w = ITEMS.weapons.find(i => i.name === wN)!; const a = ITEMS.armors.find(i => i.name === aN)!;
      const s = isP ? pS : eS;
      const wL = isP ? (player.unlockedItems[w.name] || 1) : (enemy.unlockedItems[w.name] || 1);
      const sL = isP ? (player.unlockedItems[s.name] || 1) : (enemy.unlockedItems[s.name] || 1);
      
      const x = isP ? 240 : 560; const tx = isP ? 560 : 240;
      const numHits = s.name === '幻影连击' ? 2 : 1;

      for (let h = 0; h < numHits; h++) {
        setCurrentPose(prev => ({ ...prev, [isP ? 'player' : 'enemy']: 'attack' }));
        if (w.name.includes('弓')) rendererRef.current?.addEffect('arrow', isP ? 280 : 520, 230, isP ? '#6366f1' : '#94a3b8', 1);
        await new Promise(r => setTimeout(r, 400)); // 缩短至 400ms

        let attackBonus = getAttackCounterMult(w.tag, a.tag);
        let defenseReduction = getDefenseCounterMult(a.tag, w.tag);
        if (s.name === '弱点扫描') { defenseReduction = 1.0; }
        
        let dmg = (calcVal(w.damage!, wL) + atk.stats.strength * (isP ? 1.0 : 1.5)) * attackBonus * defenseReduction;
        if (s.mult) {
          let sMult = s.mult * (1 + 0.1 * (sL - 1));
          if (s.name === '蓄能重击') dmg += atk.stats.strength * 1.5 * sL;
          dmg *= sMult;
        }

        const fD = Math.floor(field.id === 'overload' ? dmg * 1.3 : dmg);
        rendererRef.current?.addEffect('spark', tx, 250, isP ? '#f59e0b' : '#ef4444', 15);
        
        if (isP) { eHP = Math.max(0, eHP - fD); setEnemy(prev => ({ ...prev, health: eHP })); curP_Dmg += fD; addLog(`>>打击: ${fD}`); } 
        else { pHP = Math.max(0, pHP - fD); setPlayer(prev => ({ ...prev, health: pHP })); curE_Dmg += fD; addLog(`<<受创: ${fD}`); }

        // 反伤 (仅在受创方有反射技能时触发)
        const defenderSkill = isP ? eS : pS;
        if (defenderSkill.name === '动能反射' && fD > 0) {
          const reflect = Math.floor(fD * 0.5);
          if (isP) { pHP = Math.max(0, pHP - reflect); setPlayer(prev => ({...prev, health: pHP})); addLog(`<< [反馈] -${reflect} HP`); }
          else { eHP = Math.max(0, eHP - reflect); setEnemy(prev => ({...prev, health: eHP})); addLog(`>> [反馈] -${reflect} HP`); }
        }

        // 过载
        if (s.name === '系统过载') {
          const backlash = Math.floor(atk.maxHealth * 0.1);
          if (isP) { pHP = Math.max(0, pHP - backlash); setPlayer(prev => ({...prev, health: pHP})); }
          else { eHP = Math.max(0, eHP - backlash); setEnemy(prev => ({...prev, health: eHP})); }
          addLog(`!! [过载] -${backlash} HP`);
        }

        setCurrentPose(prev => ({ ...prev, [isP ? 'enemy' : 'player']: 'hit' }));
        await new Promise(r => setTimeout(r, 200)); // 缩短至 200ms
      }
      setCurrentPose({player: 'idle', enemy: 'idle'});
      await new Promise(r => setTimeout(r, 300));
    };

    await executeTurn(true);
    await executeTurn(false);

    // 结算逻辑
    setBattleHistory(prev => [...prev, { round, pDmg: curP_Dmg, eDmg: curE_Dmg, pRemainingHp: pHP, eRemainingHp: eHP }]);
    
    const finalize = (isW: boolean) => {
      const gR = isW ? (60 + player.level * 25) : (20 + player.level * 10); const xR = isW ? (70 + player.level * 10) : 0;
      if (isW) { setPlayer(prev => { let nX = prev.xp + xR; let nL = prev.level; let nS = prev.statPoints; if (nX >= nL * 100) { nX -= nL * 100; nL += 1; nS += 3; } return { ...prev, gold: prev.gold + gR, xp: nX, level: nL, statPoints: nS, health: prev.maxHealth, defeatCount: 0 }; }); setGameState('victory'); } 
      else { setPlayer(prev => ({ ...prev, gold: prev.gold + gR, defeatCount: (prev.defeatCount || 0) + 1 })); setGameState('defeat'); }
    };

    if (pHP <= 0) finalize(false); else if (eHP <= 0) finalize(true); 
    else if (round >= 3) finalize(pHP > eHP); 
    else { 
      const aW = ITEMS.weapons.filter(w => (w.levelReq || 0) <= player.level);
      const aA = ITEMS.armors.filter(a => (a.levelReq || 0) <= player.level);
      const aS = ITEMS.skills.filter(s => (s.levelReq || 0) <= player.level);
      const rw = aW[Math.floor(Math.random() * aW.length)];
      const ra = aA[Math.floor(Math.random() * aA.length)];
      const rs = aS[Math.floor(Math.random() * aS.length)];
      const eL = Math.max(1, Math.floor(player.level / 2.2));
      setEnemy(prev => ({ ...prev, equipment: { weapon: rw.name, armor: ra.name, skill: rs.name }, unlockedItems: { [rw.name]: eL, [ra.name]: eL, [rs.name]: eL } }));
      addLog(`>>> 目标正在重新校准战术单元...`);
      setRound(prev => prev + 1); setGameState('tactics'); 
    }
  };

  const resetGame = () => {
    const oF = BATTLEFIELDS.filter(f => f.id !== field.id); const nF = oF[Math.floor(Math.random() * oF.length)]; setField(nF);
    const pW = ITEMS.weapons.find(w => w.name === player.equipment.weapon)!; const pA = ITEMS.armors.find(a => a.name === player.equipment.armor)!;
    const wL = player.unlockedItems[pW.name] || 1; const aL = player.unlockedItems[pA.name] || 1;
    const pP = (player.stats.strength + player.stats.agility + player.stats.constitution) + calcVal(pW.damage!, wL) + calcVal(pA.defense!, aL);
    const dM = (1 + (pP / 750)) * Math.max(0.5, 1 - (player.defeatCount * 0.12));
    const aW = ITEMS.weapons.filter(w => (w.levelReq || 0) <= player.level); const aA = ITEMS.armors.filter(a => (a.levelReq || 0) <= player.level); const aS = ITEMS.skills.filter(s => (s.levelReq || 0) <= player.level);
    const rw = aW[Math.floor(Math.random() * aW.length)]; const ra = aA[Math.floor(Math.random() * aA.length)]; const rs = aS[Math.floor(Math.random() * aS.length)];
    setPlayer(prev => ({...prev, health: prev.maxHealth}));
    const bS = player.level === 1 ? 0.5 : 0.8; const eS = { strength: Math.floor(player.stats.strength * bS * dM), agility: Math.floor(player.stats.agility * 0.7 * dM), constitution: Math.floor(player.stats.constitution * 0.8 * dM) };
    const eH = Math.floor(player.maxHealth * (player.level === 1 ? 0.75 : 0.95) * (1 + (pP / 3000)) * Math.max(0.5, 1 - (player.defeatCount * 0.12)));
    const eL = Math.max(1, Math.floor(player.level / 2.2));
    const eName = ENEMY_NAMES[Math.floor(Math.random() * ENEMY_NAMES.length)];
    setEnemy({ username: eName, level: player.level, xp: 0, gold: 0, stats: eS, equipment: { weapon: rw.name, armor: ra.name, skill: rs.name }, health: eH, maxHealth: eH, unlockedItems: { [rw.name]: eL, [ra.name]: eL, [rs.name]: eL }, defeatCount: 0, statPoints: 0 });
    setRound(1); setGameState('lobby'); setCurrentPose({player: 'idle', enemy: 'idle'}); setBattleHistory([]); addLog(`部署至: ${nF.name} | 对手: ${eName}`);
  };

  return (
    <div className="h-screen w-full bg-slate-50 text-slate-800 p-4 font-sans overflow-hidden flex flex-col gap-4 relative">
      {/* 登录遮罩层 */}
      {!token && (
        <div className="absolute inset-0 z-[1000] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-500">
          <div className="absolute inset-0 tactical-stripes opacity-20 pointer-events-none"></div>
          <div className="w-full max-w-md bg-white rounded-[2.5rem] p-10 shadow-2xl relative z-10 animate-in zoom-in-95 duration-300">
            <div className="mb-10 text-center">
              <h1 className="text-4xl font-black italic text-indigo-600 mb-2 uppercase tracking-tighter">神经链路 · 接入层</h1>
              <p className="text-slate-400 text-[11px] font-black uppercase tracking-[0.3em]">Neural Interface v1.0.4</p>
            </div>
            
            <form onSubmit={handleAuth} className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">档案代号 / USERNAME</label>
                <input 
                  type="text" required placeholder="请输入档案代号..."
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-slate-800 font-bold focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all"
                  value={authForm.username}
                  onChange={e => setAuthForm(prev => ({ ...prev, username: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">接入密钥 / PASSWORD</label>
                <div className="relative">
                  <input 
                    type={showPassword ? 'text' : 'password'} required placeholder="请输入密钥..."
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-slate-800 font-bold focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all"
                    value={authForm.password}
                    onChange={e => setAuthForm(prev => ({ ...prev, password: e.target.value }))}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-indigo-500 transition-colors text-xl">
                    {showPassword ? '👁️' : '🕶️'}
                  </button>
                </div>
              </div>
              {authView === 'register' && (
                <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">确认密钥 / CONFIRM</label>
                  <input 
                    type="password" required placeholder="请再次输入以确认..."
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-slate-800 font-bold focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all"
                    value={authForm.confirmPassword}
                    onChange={e => setAuthForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  />
                </div>
              )}
              <button type="submit" className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-[15px] shadow-2xl active:scale-[0.98] transition-all mt-4 uppercase tracking-widest border-b-4 border-indigo-800">
                {authView === 'login' ? '建立神经连接' : '初始化新档案'}
              </button>
            </form>
            
            <div className="mt-10 pt-8 border-t border-slate-50 flex flex-col items-center gap-5">
               <button onClick={() => setAuthView(authView === 'login' ? 'register' : 'login')} className="text-slate-400 hover:text-indigo-600 font-black text-[12px] transition-colors uppercase tracking-wider">
                 {authView === 'login' ? '还没有档案？申请新链路' : '已有授权？返回接入层'}
               </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center bg-white border border-slate-200 px-6 py-4 rounded-2xl shadow-sm flex-none">
        <div className="flex items-center gap-12">
          <div className="flex items-center gap-4 border-r border-slate-100 pr-8">
            <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-black text-lg shadow-lg shadow-indigo-100 italic">
              {player.username?.[0]?.toUpperCase() || 'U'}
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Neural Profile</p>
              <p className="text-[16px] font-black text-slate-800 leading-none">{player.username}</p>
            </div>
          </div>
          <div className="flex flex-col items-center"><span className="text-[13px] text-slate-400 font-bold uppercase tracking-widest">神经等级</span><span className="text-2xl font-black text-indigo-600">LV.{player.level}</span></div>
          <div className="space-y-2"><div className="flex gap-6 text-[13px] font-bold text-slate-600"><span className="flex items-center gap-1.5">力 <b className="text-rose-500">{player.stats.strength}</b></span><span className="flex items-center gap-1.5">敏 <b className="text-emerald-500">{player.stats.agility}</b></span><span className="flex items-center gap-1.5">体 <b className="text-sky-500">{player.stats.constitution}</b></span></div><div className="flex items-center gap-3"><div className="w-56 h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className="bg-indigo-500 h-full transition-all duration-500" style={{ width: `${(player.xp / (player.level * 100)) * 100}%` }} /></div><span className="text-[11px] font-mono text-slate-400 font-bold">{player.xp} / {player.level * 100} XP</span></div></div>
        </div>
        <div className="flex items-center gap-8"><div className="text-right"><span className="text-[13px] text-slate-400 font-bold uppercase block">储备</span><span className="text-2xl font-black text-amber-500 leading-none">₿ {player.gold}</span></div><div className="flex gap-2"><button onClick={() => setGameState('shop')} className="px-5 py-2.5 bg-slate-800 text-white text-[13px] font-bold rounded-xl hover:bg-slate-700 shadow-lg shadow-slate-200">黑市</button><button onClick={() => { localStorage.removeItem('token'); localStorage.removeItem('username'); setToken(''); }} className="px-3 py-2.5 bg-slate-100 text-slate-400 text-[11px] font-bold rounded-xl hover:bg-slate-200">退出</button></div></div>
      </div>

      <div className="flex-none h-[46vh] flex gap-4 min-h-0">
        <div className="flex-1 bg-white rounded-3xl border border-slate-200 relative overflow-hidden shadow-sm">
          <canvas ref={canvasRef} width={800} height={400} className="w-full h-full object-contain" />
          <div className="absolute top-6 inset-x-10 flex justify-between pointer-events-none">
            <div className="w-64"><div className="h-2.5 bg-slate-50 rounded-full border border-slate-100 overflow-hidden"><div className="bg-rose-500 h-full transition-all duration-1000" style={{ width: `${(player.health / player.maxHealth) * 100}%` }} /></div><p className="text-[13px] mt-2 text-rose-600 font-black uppercase">{player.username}: {Math.floor(player.health)} HP</p></div>
            <div className="w-64 text-right"><div className="h-2.5 bg-slate-50 rounded-full border border-slate-100 overflow-hidden"><div className="bg-slate-800 h-full transition-all duration-1000" style={{ width: `${(enemy.health / enemy.maxHealth) * 100}%` }} /></div><p className="text-[13px] mt-2 text-slate-500 font-black uppercase">{enemy.username || 'UNIT'}: {Math.floor(enemy.health)} HP</p></div>
          </div>
          <div className="absolute bottom-4 left-4 bg-black/40 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 animate-in slide-in-from-left-4 duration-500"><p className="text-[9px] font-black text-white/40 uppercase tracking-widest">当前战场</p><p className="text-[14px] font-black text-white">{field.name}</p></div>
          
          {/* 技能释放提示 */}
          {activeSkill && (
            <div className={`absolute bottom-16 inset-x-0 flex justify-center z-[200] animate-in slide-in-from-bottom-4 duration-300`}>
              <div className={`px-10 py-4 rounded-[2rem] border-2 backdrop-blur-xl shadow-2xl flex items-center gap-4 ${activeSkill.isP ? 'bg-indigo-600/90 border-indigo-400 text-white' : 'bg-rose-600/90 border-rose-400 text-white'}`}>
                <span className="text-4xl animate-bounce">{activeSkill.icon}</span>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60 italic">{activeSkill.isP ? 'Neural Link Active' : 'Enemy Skill Detected'}</span>
                  <span className="text-2xl font-black italic tracking-tighter uppercase">{activeSkill.name}</span>
                </div>
              </div>
            </div>
          )}

          {(gameState === 'victory' || gameState === 'defeat') && (
            <div className={`absolute inset-0 z-[150] flex flex-col items-center justify-center p-4 animate-in fade-in duration-300 overflow-hidden bg-slate-50`}>
              <div className="absolute inset-0 tactical-stripes opacity-100 z-0"></div>
              <div className={`absolute inset-0 ${gameState === 'victory' ? 'bg-emerald-500/5' : 'bg-rose-500/5'} z-10`}></div>
              <div className="w-full max-w-lg flex flex-col items-center max-h-full relative z-20">
                <h1 className={`text-5xl font-black italic uppercase tracking-tighter mb-6 drop-shadow-sm flex-none ${gameState === 'victory' ? 'text-emerald-600' : 'text-rose-600'}`}>{gameState === 'victory' ? 'SUCCESS' : 'FAILURE'}</h1>
                <div className="w-full bg-white/40 border border-slate-200/50 rounded-[2rem] p-6 shadow-xl backdrop-blur-md mb-8 flex flex-col min-h-0 overflow-hidden">
                  <div className="flex justify-between items-center gap-4 mb-5 border-b border-slate-200/30 pb-5 flex-none">
                    <div className="flex-1"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Neural Unit</p><div className="text-[13px] font-black text-slate-800"><p className="truncate">{player.equipment.weapon} <span className="text-indigo-500 font-mono text-[11px]">Lv.{player.unlockedItems[player.equipment.weapon]}</span></p><p className="text-slate-400 font-bold text-[10px] truncate">{player.equipment.armor}</p></div></div>
                    <div className="px-4 py-1 bg-slate-800 text-white rounded-lg flex-none shadow-lg"><span className="text-[11px] font-black italic tracking-tighter">DATA REV.</span></div>
                    <div className="flex-1 text-right"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Target Host</p><div className="text-[13px] font-black text-slate-800"><p className="truncate"><span className="text-rose-500 font-mono text-[11px]">Lv.{enemy.unlockedItems[enemy.equipment.weapon] || 1}</span> {enemy.equipment.weapon}</p><p className="text-slate-400 font-bold text-[10px] truncate">{enemy.equipment.armor}</p></div></div>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
                    <div className="flex gap-2">
                      {battleHistory.map((h, i) => (
                        <div key={i} className="flex-1 bg-white/30 rounded-xl py-2 px-3 border border-white/50 text-center shadow-sm">
                          <p className="text-[9px] font-black text-slate-400 mb-1">ROUND {h.round}</p>
                          <div className="flex items-center justify-center gap-1 font-mono text-[14px] font-black">
                            <span className="text-rose-600">-{h.pDmg}</span>
                            <span className="text-slate-300">/</span>
                            <span className="text-indigo-600">-{h.eDmg}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <button onClick={() => { setGameState('lobby'); resetGame(); }} className={`group px-20 py-4 text-white font-black rounded-2xl shadow-2xl transition-all active:scale-95 text-[15px] flex items-center gap-4 flex-none border-b-4 ${gameState === 'victory' ? 'bg-emerald-600 border-emerald-800 hover:bg-emerald-500' : 'bg-rose-600 border-rose-800 hover:bg-rose-500'}`}>{gameState === 'victory' ? 'CONTINUE TASK' : 'RETRY NEURAL LINK'}<span className="group-hover:translate-x-1 transition-transform">➜</span></button>
              </div>
            </div>
          )}
        </div>
        <div className="w-72 bg-white border border-slate-200 rounded-3xl p-5 flex flex-col shadow-sm">
           <h3 className="text-[13px] font-black text-slate-300 uppercase mb-4 tracking-widest border-b border-slate-50 pb-2">链路日志</h3>
           <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
              {battleLog.map((log, i) => ( <p key={i} className={`text-[13px] leading-relaxed border-l-2 pl-3 ${log.includes('压制') ? 'text-rose-600 font-bold border-rose-200' : log.includes('抵抗') ? 'text-sky-600 font-bold border-sky-200' : log.includes('造成') || log.includes('受创') ? 'text-indigo-600 border-indigo-100' : 'text-slate-400 border-slate-100'}`}>{log}</p> ))}
           </div>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-3xl border border-slate-200 p-6 relative shadow-sm overflow-hidden flex flex-col">
        {(gameState === 'lobby' || gameState === 'victory' || gameState === 'defeat') && (
          <div className="h-full flex flex-col gap-3">
            <div className="flex justify-between items-center flex-none"><h3 className="text-[13px] font-black text-slate-400 uppercase tracking-widest">属性强化系统</h3><span className="text-[13px] bg-indigo-50 text-indigo-600 px-4 py-0.5 rounded-full font-bold border border-indigo-100">潜能: {player.statPoints}</span></div>
            <div className="grid grid-cols-3 gap-6 flex-1 min-h-0">{(['strength', 'agility', 'constitution'] as Stat[]).map(s => (<button key={s} onClick={() => handleLevelUp(s)} disabled={player.statPoints === 0 || gameState !== 'lobby'} className="group bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col justify-center items-center hover:border-indigo-300 transition-all disabled:opacity-50 active:scale-95"><p className="text-[13px] text-slate-400 font-bold uppercase mb-2">{s === 'strength' ? '力量 STR' : s === 'agility' ? '敏捷 AGI' : '体质 CON'}</p><p className="text-5xl font-black text-slate-800 leading-none">{player.stats[s]}</p></button>))}</div>
            <button onClick={() => setGameState('tactics')} disabled={gameState !== 'lobby'} className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-xl shadow-xl active:scale-95 flex-none mt-1 disabled:grayscale">进入部署阶段</button>
          </div>
        )}

        {gameState === 'shop' && (
          <div className="h-full flex flex-col animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex justify-between items-center mb-4 flex-none">
              <h3 className="text-xl font-black italic text-amber-500 tracking-widest uppercase">地下黑市 · 战术中心</h3>
              
              <div className="flex bg-slate-100 p-1 rounded-2xl gap-1 border border-slate-200 shadow-inner">
                {[
                  { id: 'weapons', label: '主武器库', icon: '⚔️' },
                  { id: 'armors', label: '防御矩阵', icon: '🛡️' },
                  { id: 'skills', label: '神经技能', icon: '⚡' }
                ].map(tab => (
                  <button 
                    key={tab.id}
                    onClick={() => setShopTab(tab.id as any)}
                    className={`px-6 py-2 rounded-xl flex items-center gap-2 transition-all font-black text-[13px] ${shopTab === tab.id ? 'bg-white text-slate-800 shadow-md scale-105' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    <span>{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </div>

              <button onClick={() => setGameState('lobby')} className="text-[13px] font-bold text-slate-400 hover:text-slate-800 underline flex items-center gap-1 group">
                <span className="group-hover:-translate-x-1 transition-transform">⇠</span> 返回
              </button>
            </div>

            <div className="flex-1 grid grid-cols-6 gap-4 pr-2 content-start overflow-y-auto custom-scrollbar pt-2">
              {ITEMS[shopTab].map(item => {
                const rc = { common: { color: 'bg-slate-400' }, novel: { color: 'bg-blue-500' }, perfect: { color: 'bg-emerald-500' }, epic: { color: 'bg-amber-500' } }[item.rarity];
                const itemLvl = player.unlockedItems[item.name] || 0; 
                const isLocked = player.level < (item.levelReq || 0); 
                const cost = Math.floor((item.cost || 0) * Math.pow(1.6, itemLvl));
                
                return ( 
                  <button 
                    key={item.name} 
                    onClick={() => buyItem(item)} 
                    className={`group p-4 rounded-[2rem] border-2 text-left transition-all relative flex flex-col items-center gap-3 ${isLocked ? 'bg-slate-50 grayscale opacity-60' : 'bg-white hover:border-indigo-300 hover:shadow-xl hover:-translate-y-1 active:scale-95'}`}
                  >
                    <span className="text-4xl mb-1 group-hover:scale-110 transition-transform">{item.icon}</span>
                    <div className="text-center w-full">
                      <p className="font-black text-[12px] text-slate-700 truncate mb-1">{item.name}</p>
                      <div className="flex flex-col items-center gap-1.5">
                        {itemLvl > 0 ? (
                          <span className="text-[10px] font-black text-white bg-indigo-500 rounded-full px-2 py-0.5 shadow-sm">Lv.{itemLvl}</span>
                        ) : (
                          <span className="text-[10px] font-black text-slate-400 bg-slate-100 rounded-full px-2 py-0.5 italic">未获取</span>
                        )}
                        <p className="text-amber-600 font-black text-[13px] flex items-center gap-1">
                          <span className="text-[10px] opacity-60 italic">₿</span> {cost}
                        </p>
                      </div>
                    </div>
                    {/* 稀有度圆点 */}
                    <div className={`absolute top-3 right-3 w-2.5 h-2.5 rounded-full ring-4 ring-white ${rc.color}`}></div>
                    
                    {/* 克制提示标签 */}
                    {item.tag && !isLocked && (
                      <div className="absolute -bottom-2 px-3 py-0.5 bg-slate-800 text-white text-[9px] font-black rounded-full uppercase tracking-tighter shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                        {item.tag}
                      </div>
                    )}
                  </button> 
                );
              })}
            </div>
            {previewItem && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] p-4 flex items-center justify-center animate-in fade-in duration-200" onClick={() => setPreviewItem(null)}>
                <div className="bg-white text-slate-900 p-8 rounded-[2.5rem] shadow-2xl w-full max-w-sm relative animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                  <div className="text-6xl mb-6 text-center">{previewItem.icon}</div>
                  <h2 className="text-2xl font-black text-center mb-1 uppercase tracking-tighter">{previewItem.name}</h2>
                  <p className="text-slate-400 text-center text-[13px] font-bold mb-6 italic">"{previewItem.desc}"</p>
                  <div className="space-y-2 bg-slate-50 p-5 rounded-3xl border border-slate-100 mb-8 text-[13px]">
                    <div className="flex justify-between border-b border-slate-200/50 pb-2 mb-2"><span className="text-slate-400 font-bold uppercase tracking-wider">强化阶段</span><div className="flex items-center gap-2"><span className="text-slate-400 font-black">Lv.{player.unlockedItems[previewItem.name] || 0}</span><span className="text-indigo-300">➜</span><span className="text-indigo-600 font-black">Lv.{(player.unlockedItems[previewItem.name] || 0) + 1}</span></div></div>
                    {previewItem.levelReq && (<div className="flex justify-between items-center"><span className="text-slate-400 font-bold">要求等级</span><span className={`${player.level >= previewItem.levelReq ? 'text-emerald-400' : 'text-rose-400'} font-black`}>LV.{previewItem.levelReq}</span></div>)}
                    {previewItem.damage && (<div className="flex justify-between"><span className="text-slate-400 font-bold">基础威力</span><div className="flex items-center gap-2"><span className="text-slate-400">{calcVal(previewItem.damage, player.unlockedItems[previewItem.name] || 1)}</span><span className="text-rose-300">➜</span><span className="text-rose-500 font-black">+{calcVal(previewItem.damage, (player.unlockedItems[previewItem.name] || 0) + 1)}</span></div></div>)}
                    {previewItem.defense && (<div className="flex justify-between"><span className="text-slate-400 font-bold">防御力</span><div className="flex items-center gap-2"><span className="text-slate-400">{calcVal(previewItem.defense, player.unlockedItems[previewItem.name] || 1)}</span><span className="text-sky-300">➜</span><span className="text-sky-500 font-black">+{calcVal(previewItem.defense, (player.unlockedItems[previewItem.name] || 0) + 1)}</span></div></div>)}
                    {previewItem.mult ? (<div className="flex justify-between"><span className="text-slate-400 font-bold">技能倍率</span><div className="flex items-center gap-2"><span className="text-slate-400">x{(previewItem.mult * (1 + 0.1 * Math.max(0, (player.unlockedItems[previewItem.name] || 1) - 1))).toFixed(1)}</span><span className="text-indigo-300">➜</span><span className="text-indigo-600 font-black">x{(previewItem.mult * (1 + 0.1 * (player.unlockedItems[previewItem.name] || 0))).toFixed(1)}</span></div></div>) : null}
                  </div>
                  <div className="flex gap-3"><button onClick={() => setPreviewItem(null)} className="flex-1 py-4 bg-slate-100 text-slate-400 font-black rounded-2xl hover:bg-slate-200">取消</button><button onClick={() => confirmPurchase(previewItem)} disabled={player.level < (previewItem.levelReq || 0) || player.gold < Math.floor((previewItem.cost || 0) * Math.pow(1.6, player.unlockedItems[previewItem.name] || 0))} className="flex-[2] py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl active:scale-95 disabled:opacity-30">{player.unlockedItems[previewItem.name] ? '神经强化' : '立即获取'}</button></div>
                </div>
              </div>
            )}
          </div>
        )}

        {gameState === 'tactics' && (
          <div className="h-full flex flex-col animate-in zoom-in-95 duration-300">
             <div className="flex items-center gap-4 mb-4 flex-none bg-slate-900/5 p-2 rounded-2xl border border-slate-200/50">
                <div className="flex items-center gap-3 border-r border-slate-200 pr-4">
                  <h3 className="text-xl font-black italic text-indigo-600 uppercase tracking-tighter whitespace-nowrap">战术部署</h3>
                </div>

                <div className="flex-1 flex items-center gap-4 min-w-0">
                  <div className="flex-[0.8] flex flex-col justify-center min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-1.5 py-0.5 rounded">环境修正</span>
                    </div>
                    <p className="text-[13px] font-black text-slate-700 leading-tight line-clamp-2">{field.desc} <span className="text-rose-500">{field.effect}</span></p>
                  </div>
                  
                  <div className="w-[1px] h-10 bg-slate-200 flex-none"></div>
                  
                  <div className="flex-[1.2] flex items-center gap-4 bg-indigo-600 px-5 py-3 rounded-2xl shadow-inner relative overflow-hidden min-w-0">
                    <div className="absolute inset-0 bg-white/5 animate-pulse pointer-events-none"></div>
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-tighter whitespace-nowrap flex-none relative z-10">神经探测:</p>
                    <div className="flex items-center gap-4 text-white font-black text-[13px] min-w-0 relative z-10">
                      <div className="flex items-center gap-2 flex-none">
                        <span className="text-xl">{ITEMS.weapons.find(w=>w.name===enemy.equipment.weapon)?.icon}</span>
                        <span className="whitespace-nowrap">{enemy.equipment.weapon}</span>
                        <b className="text-indigo-300 font-mono text-[10px] whitespace-nowrap">Lv.{enemy.unlockedItems[enemy.equipment.weapon] || 1}</b>
                        {getAttackCounterMult(player.equipment.weapon ? ITEMS.weapons.find(w=>w.name===player.equipment.weapon)!.tag : '', ITEMS.armors.find(a=>a.name===enemy.equipment.armor)!.tag) > 1 && (
                          <span className="px-1.5 py-0.5 bg-emerald-400 text-emerald-950 text-[9px] rounded-md animate-bounce">压制</span>
                        )}
                      </div>
                      <span className="w-[1px] h-4 bg-white/20"></span>
                      <div className="flex items-center gap-2 flex-none">
                        <span className="text-xl">{ITEMS.armors.find(a=>a.name===enemy.equipment.armor)?.icon}</span>
                        <span className="whitespace-nowrap">{enemy.equipment.armor}</span>
                        <b className="text-indigo-300 font-mono text-[10px] whitespace-nowrap">Lv.{enemy.unlockedItems[enemy.equipment.armor] || 1}</b>
                        {getDefenseCounterMult(player.equipment.armor ? ITEMS.armors.find(a=>a.name===player.equipment.armor)!.tag : '', ITEMS.weapons.find(w=>w.name===enemy.equipment.weapon)!.tag) < 1 && (
                          <span className="px-1.5 py-0.5 bg-sky-400 text-sky-950 text-[9px] rounded-md animate-bounce">防御</span>
                        )}
                      </div>
                      <span className="w-[1px] h-4 bg-white/20"></span>
                      <div className="flex items-center gap-2 flex-none">
                        <span className="text-xl">{ITEMS.skills.find(s=>s.name===enemy.equipment.skill)?.icon}</span>
                        <span className="whitespace-nowrap">{enemy.equipment.skill}</span>
                        <b className="text-indigo-300 font-mono text-[10px] whitespace-nowrap">Lv.{enemy.unlockedItems[enemy.equipment.skill] || 1}</b>
                      </div>
                    </div>
                  </div>
                </div>

                <button onClick={startRound} className="px-12 py-4 bg-indigo-600 text-white font-black rounded-xl hover:bg-indigo-500 active:scale-95 transition-all text-[16px] shadow-xl shadow-indigo-200 flex-none ml-2 border-b-4 border-indigo-800 uppercase tracking-widest">开始出击 ➜</button>
             </div>

             <div className="flex-1 flex gap-4 min-h-0 h-full pb-2">
                <NeuralPicker label="主武器库" items={ITEMS.weapons.filter(w => player.unlockedItems[w.name])} selected={player.equipment.weapon} onSelect={(v) => setPlayer(p => ({...p, equipment: {...p.equipment, weapon: v}}))} unlockedItems={player.unlockedItems} />
                <NeuralPicker label="防御矩阵" items={ITEMS.armors.filter(a => player.unlockedItems[a.name])} selected={player.equipment.armor} onSelect={(v) => setPlayer(p => ({...p, equipment: {...p.equipment, armor: v}}))} unlockedItems={player.unlockedItems} />
                <NeuralPicker label="神经技能" items={ITEMS.skills.filter(s => player.unlockedItems[s.name])} selected={player.equipment.skill} onSelect={(v) => setPlayer(p => ({...p, equipment: {...p.equipment, skill: v}}))} unlockedItems={player.unlockedItems} />
             </div>
          </div>
        )}

        {gameState === 'battle' && (
          <div className="h-full flex flex-col items-center justify-center animate-pulse">
            <div className="text-7xl font-black italic text-slate-100 tracking-tighter uppercase">Analyzing...</div>
            <p className="text-[13px] text-slate-400 font-bold uppercase mt-6 tracking-[0.8em]">参数实时校准</p>
          </div>
        )}
      </div>

      <style>{`
        .tactical-stripes {
          background-image: repeating-linear-gradient(
            45deg,
            transparent,
            transparent 30px,
            rgba(0, 0, 0, 0.03) 30px,
            rgba(0, 0, 0, 0.03) 60px
          );
          background-size: 200% 200%;
          animation: slide-stripes 40s linear infinite;
        }
        @keyframes slide-stripes {
          from { background-position: 0 0; }
          to { background-position: 100% 100%; }
        }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slide-in-from-left-4 { from { transform: translateX(-1rem); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes zoom-in-95 { from { transform: scale(0.98); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .animate-in { animation-fill-mode: forwards; }
        .fade-in { animation-name: fade-in; }
        .slide-in-from-left-4 { animation-name: slide-in-from-left-4; }
        .zoom-in-95 { animation-name: zoom-in-95; }
      `}</style>
    </div>
  );
}

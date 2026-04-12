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

interface Character {
  level: number;
  xp: number; gold: number;
  stats: Record<Stat, number>;
  statPoints: number; health: number; maxHealth: number;
  equipment: { weapon: string; armor: string; skill: string; };
  unlockedItems: Record<string, number>;
  defeatCount: number;
}

const ITEMS = {
  weapons: [
    { name: '长剑', damage: 15, icon: '⚔️', desc: '新手利刃', cost: 50, rarity: 'common' },
    { name: '长弓', damage: 12, icon: '🏹', desc: '远程精准', cost: 50, rarity: 'common' },
    { name: '重锤', damage: 25, icon: '🔨', desc: '势大力沉', cost: 60, rarity: 'common' },
    { name: '名刀', damage: 32, icon: '🎋', desc: '迅捷致命', cost: 150, rarity: 'novel', levelReq: 3 },
    { name: '神龙弓', damage: 55, icon: '🐉', desc: '破空之箭', cost: 600, rarity: 'perfect', levelReq: 8 },
    { name: '激光剑', damage: 85, icon: '🔦', desc: '等离子刃', cost: 1500, rarity: 'epic', levelReq: 15 },
    { name: '雷神锤', damage: 150, icon: '⚡', desc: '众神之怒', cost: 4500, rarity: 'epic', levelReq: 25 },
    { name: '影刃', damage: 130, icon: '🔪', desc: '虚空之遗', cost: 8500, rarity: 'epic', levelReq: 40 },
  ] as Item[],
  armors: [
    { name: '布衣', defense: 0, evasion: 0, icon: '👕', desc: '轻便无负重', cost: 40, rarity: 'common' },
    { name: '铁盾', defense: 12, evasion: -5, icon: '🛡️', desc: '稳固防御', cost: 60, rarity: 'common' },
    { name: '披风', defense: 3, evasion: 20, icon: '🧥', desc: '幻影闪避', cost: 60, rarity: 'common' },
    { name: '动力装甲', defense: 45, evasion: 5, icon: '🤖', desc: '外骨骼增强', cost: 500, rarity: 'novel', levelReq: 5 },
    { name: '虚空甲', defense: 95, evasion: 10, icon: '🌌', desc: '暗物质抵挡', cost: 2000, rarity: 'perfect', levelReq: 15 },
    { name: '纳米蜂群', defense: 50, evasion: 60, icon: '🐝', desc: '微型机器人拦截', cost: 6500, rarity: 'epic', levelReq: 35 },
    { name: '反物质盾', defense: 350, evasion: -15, icon: '💠', desc: '终极防御屏障', cost: 15000, rarity: 'epic', levelReq: 60 },
  ] as Item[],
  skills: [
    { name: '斩击', mult: 1.2, icon: '💥', desc: '标准攻击', cost: 40, rarity: 'common' },
    { name: '治疗', mult: 0, icon: '✨', desc: '生物修复', cost: 50, rarity: 'common' },
    { name: '连击', mult: 0.8, icon: '⚡', desc: '速度幻影', cost: 80, rarity: 'novel' },
    { name: '超新星', mult: 3.5, icon: '☢️', desc: '能量释放', cost: 1000, rarity: 'perfect', levelReq: 10 },
    { name: '黑洞', mult: 8.0, icon: '🕳️', desc: '吞噬一切', cost: 8000, rarity: 'epic', levelReq: 45 },
    { name: '时间倒流', mult: 0, icon: '⏳', desc: '因果重塑', cost: 12000, rarity: 'epic', levelReq: 70 },
  ] as Item[]
};

const INITIAL_CHAR: Character = {
  level: 1, xp: 0, gold: 100,
  stats: { strength: 10, agility: 10, constitution: 12 },
  statPoints: 8, health: 120, maxHealth: 120,
  equipment: { weapon: '长剑', armor: '布衣', skill: '斩击' },
  unlockedItems: { '长剑': 1, '长弓': 1, '重锤': 1, '布衣': 1, '铁盾': 1, '披风': 1, '斩击': 1, '治疗': 1, '连击': 1 },
  defeatCount: 0
};

const calcVal = (base: number, level: number) => Math.floor(base * (1 + 0.15 * (level - 1)));

interface BattleRoundRecord {
  round: number;
  pDmg: number;
  eDmg: number;
  pRemainingHp: number;
  eRemainingHp: number;
}

class StickmanRenderer {
  private ctx: CanvasRenderingContext2D;
  private time: number = 0;
  private effects: any[] = [];
  private nextEffectId: number = 0;
  constructor(ctx: CanvasRenderingContext2D) { this.ctx = ctx; }
  addEffect(type: any, x: number, y: number, color: string = '#475569', count: number = 1) {
    for (let i = 0; i < count; i++) { this.effects.push({ id: this.nextEffectId++, type, x, y, vx: (Math.random() - 0.5) * 12, vy: (Math.random() - 0.5) * 12, life: 1.0, color, size: Math.random() * 4 + 2 }); }
  }
  drawBackground(field: Battlefield) {
    const ctx = this.ctx; const t = this.time; ctx.save(); ctx.fillStyle = field.bgColor; ctx.fillRect(0, 0, 800, 400);
    if (field.id === 'neutral') {
      ctx.strokeStyle = field.accentColor; ctx.lineWidth = 1; ctx.globalAlpha = 0.2;
      for(let i=0; i<800; i+=40) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + Math.sin(t+i)*5, 400); ctx.stroke(); }
    } else if (field.id === 'emp') {
      ctx.strokeStyle = '#818cf8'; ctx.lineWidth = 2; for(let i=0; i<5; i++) { if (Math.random() > 0.8) { ctx.beginPath(); ctx.moveTo(Math.random()*800, 0); ctx.lineTo(Math.random()*800, 400); ctx.globalAlpha = 0.3; ctx.stroke(); } }
    } else if (field.id === 'narrow') {
      ctx.fillStyle = '#27272a'; ctx.fillRect(0, 0, 800, 60); ctx.fillRect(0, 340, 800, 60);
    } else if (field.id === 'desert') {
      ctx.fillStyle = '#78350f'; ctx.globalAlpha = 0.3; for(let i=0; i<3; i++) { ctx.beginPath(); ctx.moveTo(0, 300+i*20); for(let x=0; x<=800; x+=20) { ctx.lineTo(x, 300+i*20 + Math.sin(x*0.01 + t + i)*10); } ctx.lineTo(800, 400); ctx.lineTo(0, 400); ctx.fill(); }
    } else if (field.id === 'overload') {
      ctx.strokeStyle = '#fb7185'; ctx.lineWidth = 3; ctx.globalAlpha = Math.abs(Math.sin(t*2))*0.3; ctx.beginPath(); ctx.arc(400, 200, 150 + Math.sin(t)*20, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }
  updateEffects() { this.effects = this.effects.filter(e => { e.x += e.vx; e.y += e.vy; e.life -= 0.04; if (e.type === 'arrow') e.vx = 18; return e.life > 0; }); }
  draw(x: number, y: number, pose: any, flip: boolean = false, agility: number = 10, weaponIcon: string = '⚔️') {
    const ctx = this.ctx; const t = this.time * (1 + agility / 45); ctx.save(); ctx.translate(x, y); if (flip) ctx.scale(-1, 1);
    ctx.strokeStyle = pose === 'dead' ? '#cbd5e1' : '#f8fafc'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    const headSize = 18; const bodyHeight = 55; let armAngle = Math.sin(t) * 0.4; let legAngle = Math.cos(t) * 0.4;
    if (pose === 'attack') { armAngle = -1.8 + Math.sin(t * 8) * 1.2; ctx.translate(Math.sin(t * 8) * 20, 0); ctx.font = '32px serif'; ctx.fillText(weaponIcon, Math.cos(armAngle) * 40 - 15, -bodyHeight + Math.sin(armAngle) * 40); }
    else if (pose === 'hit') { ctx.strokeStyle = '#ef4444'; ctx.translate(Math.sin(this.time * 60) * 10, 0); }
    else if (pose === 'dead') { ctx.rotate(Math.PI / 2); ctx.translate(35, -15); armAngle = 0.5; legAngle = 0.2; }
    ctx.beginPath(); 
    // 绘制头部
    ctx.arc(0, -bodyHeight - headSize, headSize, 0, Math.PI * 2); 
    // 绘制躯干
    ctx.moveTo(0, -bodyHeight); ctx.lineTo(0, 0); 
    // 绘制手臂
    ctx.moveTo(0, -bodyHeight + 8); ctx.lineTo(Math.cos(armAngle) * 35, -bodyHeight + 8 + Math.sin(armAngle) * 35);
    ctx.moveTo(0, -bodyHeight + 8); ctx.lineTo(Math.cos(-armAngle) * -30, -bodyHeight + 8 + Math.sin(-armAngle) * 30);
    // 绘制腿部
    ctx.moveTo(0, 0); ctx.lineTo(Math.sin(legAngle) * 30, 35); 
    ctx.moveTo(0, 0); ctx.lineTo(Math.sin(-legAngle) * 30, 35);
    ctx.stroke(); ctx.restore();
    this.effects.forEach(e => { ctx.globalAlpha = e.life; ctx.fillStyle = e.color; if (e.type === 'arrow') { ctx.fillRect(e.x, e.y, 12, 2); } else { ctx.beginPath(); ctx.arc(e.x, e.y, e.size * e.life, 0, Math.PI * 2); ctx.fill(); } });
    ctx.globalAlpha = 1; this.updateEffects(); this.time += 0.04;
  }
}

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  const [authForm, setAuthForm] = useState({ username: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [player, setPlayer] = useState<Character>(INITIAL_CHAR);
  const [enemy, setEnemy] = useState<Character>({ ...INITIAL_CHAR, stats: { strength: 8, agility: 7, constitution: 8 }, health: 90, maxHealth: 90 });
  const [gameState, setGameState] = useState<'lobby' | 'tactics' | 'battle' | 'shop' | 'victory' | 'defeat'>('lobby');
  const [round, setRound] = useState(1);
  const [battleLog, setBattleLog] = useState<string[]>(['等待连接...']);
  const [currentPose, setCurrentPose] = useState<{player: any, enemy: any}>({player: 'idle', enemy: 'idle'});
  const [previewItem, setPreviewItem] = useState<Item | null>(null);
  const [field, setField] = useState<Battlefield>(BATTLEFIELDS[0]);
  const [battleHistory, setBattleHistory] = useState<BattleRoundRecord[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<StickmanRenderer | null>(null);

  const addLog = (msg: string) => setBattleLog(prev => [msg, ...prev].slice(0, 20));

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await safeFetch(`${API_URL}/${authView}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(authForm) });
      const data = await res.json();
      if (data.token) { localStorage.setItem('token', data.token); setToken(data.token); addLog('神经链路已建立。'); } else { setAuthView('login'); alert('档案已建立，请验证。'); }
    } catch (err: any) { alert(err.message); }
  };

  useEffect(() => {
    if (token) {
      fetch(`${API_URL}/load`, { headers: { 'Authorization': `Bearer ${token}` } }).then(res => res.json()).then(data => { if (data.gameData) {
        const rawData = data.gameData; if (Array.isArray(rawData.unlockedItems)) { const m: any = {}; rawData.unlockedItems.forEach((n: any) => m[n] = 1); rawData.unlockedItems = m; }
        setPlayer({ ...INITIAL_CHAR, ...rawData }); addLog('神经档案同步成功。');
      }});
    }
  }, [token]);

  useEffect(() => { if (token && player !== INITIAL_CHAR) fetch(`${API_URL}/save`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ gameData: player }) }); }, [player.level, player.gold, player.stats, player.unlockedItems]);

  useEffect(() => {
    let frame: number; const loop = () => { if (canvasRef.current && !rendererRef.current) rendererRef.current = new StickmanRenderer(canvasRef.current.getContext('2d')!);
      if (rendererRef.current) { rendererRef.current.drawBackground(field);
        const pW = ITEMS.weapons.find(w => w.name === player.equipment.weapon); const eW = ITEMS.weapons.find(w => w.name === enemy.equipment.weapon);
        rendererRef.current.draw(240, 280, currentPose.player, false, player.stats.agility, pW?.icon); rendererRef.current.draw(560, 280, currentPose.enemy, true, enemy.stats.agility, eW?.icon || '⚔️');
      } frame = requestAnimationFrame(loop); }; frame = requestAnimationFrame(loop); return () => cancelAnimationFrame(frame);
  }, [token, currentPose, player.stats.agility, enemy.stats.agility, player.equipment.weapon, enemy.equipment.weapon, field]);

  const buyItem = (item: Item) => setPreviewItem(item);
  const confirmPurchase = (item: Item) => {
    const curLvl = player.unlockedItems[item.name] || 0; const cost = Math.floor((item.cost || 0) * Math.pow(1.6, curLvl));
    if (player.gold >= cost) { setPlayer(prev => ({ ...prev, gold: prev.gold - cost, unlockedItems: { ...prev.unlockedItems, [item.name]: curLvl + 1 } })); addLog(`强化成功: ${item.name} [Lv.${curLvl+1}]`); setPreviewItem(null); } else alert("储备不足。");
  };

  const handleLevelUp = (stat: Stat) => { if (player.statPoints > 0) setPlayer(prev => { const nMax = stat === 'constitution' ? Math.floor(prev.maxHealth + 15) : prev.maxHealth; return { ...prev, stats: { ...prev.stats, [stat]: prev.stats[stat] + 1 }, statPoints: prev.statPoints - 1, maxHealth: nMax, health: nMax }; }); };

  const startRound = async () => {
    setGameState('battle'); addLog(`>>> 第 ${round} 回合开始`);
    let pHP = Math.floor(player.health); let eHP = Math.floor(enemy.health);
    let currentRoundP_Dmg = 0; let currentRoundE_Dmg = 0;

    const executeTurn = async (isP: boolean) => {
      const atk = isP ? player : enemy; const wN = isP ? player.equipment.weapon : enemy.equipment.weapon;
      const w = ITEMS.weapons.find(i => i.name === wN)!; const s = ITEMS.skills.find(i => i.name === (isP ? player.equipment.skill : enemy.equipment.skill))!;
      const wL = isP ? (player.unlockedItems[w.name] || 1) : (enemy.unlockedItems[w.name] || 1);
      const sL = isP ? (player.unlockedItems[s.name] || 1) : (enemy.unlockedItems[s.name] || 1);
      setCurrentPose(prev => ({ ...prev, [isP ? 'player' : 'enemy']: 'attack' }));
      if (w.name.includes('弓')) rendererRef.current?.addEffect('arrow', isP ? 280 : 520, 230, isP ? '#6366f1' : '#94a3b8', 1);
      await new Promise(r => setTimeout(r, 600));
      let baseDmg = calcVal(w.damage!, wL); let sMult = s?.mult || 1;
      if (field.id === 'emp') { if (w.rarity === 'epic' || w.rarity === 'perfect') baseDmg *= 0.6; else if (w.rarity === 'common') baseDmg *= 1.6; }
      else if (field.id === 'narrow') { if (w.name.includes('锤')) baseDmg *= 0.5; else if (w.name.includes('刀') || w.name.includes('剑')) baseDmg *= 1.4; }
      else if (field.id === 'desert') { if (w.name.includes('弓')) baseDmg *= 1.6; }
      else if (field.id === 'overload') { sMult *= 2.0; }
      let dmg = (baseDmg + atk.stats.strength * (isP ? 0.8 : 1.2)) * sMult; if (s.mult) dmg *= (1 + 0.1 * (sL - 1));
      const rawDmg = Math.floor(dmg); rendererRef.current?.addEffect('spark', isP ? 560 : 240, 250, isP ? '#f59e0b' : '#ef4444', 12);
      if (isP) { let fD = Math.floor(field.id === 'overload' ? rawDmg * 1.3 : rawDmg); eHP = Math.max(0, eHP - fD); setEnemy(prev => ({ ...prev, health: eHP })); currentRoundP_Dmg = fD; addLog(`>> 造成 ${fD} 伤害`); } else { 
        const a = ITEMS.armors.find(i => i.name === player.equipment.armor)!; const aL = player.unlockedItems[a.name] || 1;
        const minDmg = Math.floor(rawDmg * 0.15); let finalDmg = Math.max(minDmg, rawDmg - calcVal(a.defense!, aL));
        if (field.id === 'overload') finalDmg *= 1.3; finalDmg = Math.floor(Math.max(1, finalDmg)); pHP = Math.max(0, pHP - finalDmg); setPlayer(prev => ({ ...prev, health: pHP })); currentRoundE_Dmg = finalDmg; addLog(`<< 受创 ${finalDmg} 伤害`);
      }
      setCurrentPose(prev => ({ ...prev, [isP ? 'enemy' : 'player']: 'hit' })); await new Promise(r => setTimeout(r, 400)); setCurrentPose({player: 'idle', enemy: 'idle'});
    };
    await executeTurn(true); if (eHP > 0) await executeTurn(false);
    setBattleHistory(prev => [...prev, { round, pDmg: currentRoundP_Dmg, eDmg: currentRoundE_Dmg, pRemainingHp: pHP, eRemainingHp: eHP }]);
    const finalize = (isW: boolean, isK: boolean) => {
      const gR = isW ? (60 + player.level * 25) : (20 + player.level * 10); const xR = isW ? (70 + player.level * 10) : 0;
      if (isW) { setPlayer(prev => { let nX = prev.xp + xR; let nL = prev.level; let nS = prev.statPoints; if (nX >= nL * 100) { nX -= nL * 100; nL += 1; nS += 3; addLog('神经等级提升！'); } return { ...prev, gold: prev.gold + gR, xp: nX, level: nL, statPoints: nS, health: prev.maxHealth, defeatCount: 0 }; }); setGameState('victory'); } 
      else { setPlayer(prev => ({ ...prev, gold: prev.gold + gR, defeatCount: (prev.defeatCount || 0) + 1 })); setGameState('defeat'); }
    };
    if (pHP <= 0) finalize(false, true); else if (eHP <= 0) finalize(true, true); else if (round >= 3) finalize(pHP > eHP, false); else { setRound(prev => prev + 1); setGameState('tactics'); }
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
    setEnemy({ level: player.level, xp: 0, gold: 0, stats: eS, equipment: { weapon: rw.name, armor: ra.name, skill: rs.name }, health: eH, maxHealth: eH, unlockedItems: { [rw.name]: eL, [ra.name]: eL, [rs.name]: eL }, defeatCount: 0 });
    setRound(1); setGameState('lobby'); setCurrentPose({player: 'idle', enemy: 'idle'}); setBattleHistory([]); addLog(`部署至: ${nF.name}`);
  };

  if (!token) {
    return (
      <div className="h-screen w-full bg-slate-100 flex items-center justify-center p-4 font-sans text-slate-800">
        <div className="bg-white p-8 rounded-[3rem] shadow-2xl border border-slate-200 w-full max-w-md animate-in zoom-in-95 duration-300">
          <div className="text-center mb-6"><h1 className="text-4xl font-black italic text-indigo-600 tracking-tighter">影迹战术</h1><p className="text-slate-400 font-bold text-[11px] uppercase tracking-[0.2em] mt-2">IDENTITY AUTHENTICATION</p></div>
          <form onSubmit={handleAuth} className="space-y-3">
            <div className="space-y-1"><label className="text-[11px] font-black text-slate-400 ml-2 uppercase">用户名</label><input type="text" placeholder="档案代号" className="w-full px-6 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:border-indigo-400 font-bold text-[14px]" value={authForm.username} onChange={e => setAuthForm({...authForm, username: e.target.value})} /></div>
            <div className="space-y-1"><label className="text-[11px] font-black text-slate-400 ml-2 uppercase">密码</label><input type={showPassword ? "text" : "password"} placeholder="加密密钥" className="w-full px-6 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:border-indigo-400 font-bold text-[14px]" value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} /></div>
            {authView === 'register' && (<div className="space-y-1 animate-in slide-in-from-top-2 duration-200"><label className="text-[11px] font-black text-slate-400 ml-2 uppercase">确认密码</label><input type={showPassword ? "text" : "password"} placeholder="确认密钥" className="w-full px-6 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:border-indigo-400 font-bold text-[14px]" value={authForm.confirmPassword} onChange={e => setAuthForm({...authForm, confirmPassword: e.target.value})} /></div>)}
            <div className="flex items-center gap-2 ml-2 py-1"><input type="checkbox" id="show-pass" className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600" checked={showPassword} onChange={e => setShowPassword(e.target.checked)} /><label htmlFor="show-pass" className="text-[12px] font-bold text-slate-500 cursor-pointer">显示原文</label></div>
            <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-indigo-100 hover:bg-indigo-500 transition-all mt-2 active:scale-95">{authView === 'login' ? '进入系统' : '建立档案'}</button>
          </form>
          <p className="mt-6 text-center text-[13px] text-slate-400 font-bold">{authView === 'login' ? '尚未分配编号?' : '已有现存档案?'} <button className="text-indigo-600 ml-2 underline hover:text-indigo-800 font-black" onClick={() => { setAuthView(authView === 'login' ? 'register' : 'login'); setAuthForm({username: '', password: '', confirmPassword: ''}); }}>{authView === 'login' ? '注册新档案' : '返回验证'}</button></p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-slate-50 text-slate-800 p-4 font-sans overflow-hidden flex flex-col gap-4">
      <div className="flex justify-between items-center bg-white border border-slate-200 px-6 py-4 rounded-2xl shadow-sm flex-none">
        <div className="flex items-center gap-12"><div className="flex flex-col items-center"><span className="text-[13px] text-slate-400 font-bold uppercase tracking-widest">神经等级</span><span className="text-2xl font-black text-indigo-600">LV.{player.level}</span></div>
          <div className="space-y-2"><div className="flex gap-6 text-[13px] font-bold text-slate-600"><span className="flex items-center gap-1.5">力 <b className="text-rose-500">{player.stats.strength}</b></span><span className="flex items-center gap-1.5">敏 <b className="text-emerald-500">{player.stats.agility}</b></span><span className="flex items-center gap-1.5">体 <b className="text-sky-500">{player.stats.constitution}</b></span></div><div className="flex items-center gap-3"><div className="w-56 h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className="bg-indigo-500 h-full transition-all duration-500" style={{ width: `${(player.xp / (player.level * 100)) * 100}%` }} /></div><span className="text-[11px] font-mono text-slate-400 font-bold">{player.xp} / {player.level * 100} XP</span></div></div>
        </div>
        <div className="flex items-center gap-8"><div className="text-right"><span className="text-[13px] text-slate-400 font-bold uppercase block">储备</span><span className="text-2xl font-black text-amber-500 leading-none">₿ {player.gold}</span></div><div className="flex gap-2"><button onClick={() => setGameState('shop')} className="px-5 py-2.5 bg-slate-800 text-white text-[13px] font-bold rounded-xl hover:bg-slate-700 shadow-lg shadow-slate-200">黑市</button><button onClick={() => { localStorage.removeItem('token'); setToken(''); }} className="px-3 py-2.5 bg-slate-100 text-slate-400 text-[11px] font-bold rounded-xl hover:bg-slate-200">退出</button></div></div>
      </div>

      <div className="flex-none h-[46vh] flex gap-4 min-h-0">
        <div className="flex-1 bg-white rounded-3xl border border-slate-200 relative overflow-hidden shadow-sm">
          <canvas ref={canvasRef} width={800} height={400} className="w-full h-full object-contain" />
          <div className="absolute top-6 inset-x-10 flex justify-between pointer-events-none">
            <div className="w-64"><div className="h-2.5 bg-slate-50 rounded-full border border-slate-100 overflow-hidden"><div className="bg-rose-500 h-full transition-all duration-1000" style={{ width: `${(player.health / player.maxHealth) * 100}%` }} /></div><p className="text-[13px] mt-2 text-rose-600 font-black uppercase">PLAYER: {Math.floor(player.health)} HP</p></div>
            <div className="w-64 text-right"><div className="h-2.5 bg-slate-50 rounded-full border border-slate-100 overflow-hidden"><div className="bg-slate-800 h-full transition-all duration-1000" style={{ width: `${(enemy.health / enemy.maxHealth) * 100}%` }} /></div><p className="text-[13px] mt-2 text-slate-500 font-black uppercase">UNIT: {Math.floor(enemy.health)} HP</p></div>
          </div>
          <div className="absolute bottom-4 left-4 bg-black/40 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 animate-in slide-in-from-left-4 duration-500"><p className="text-[9px] font-black text-white/40 uppercase tracking-widest">当前战场</p><p className="text-[14px] font-black text-white">{field.name}</p></div>
          {(gameState === 'victory' || gameState === 'defeat') && (
            <div className={`absolute inset-0 ${gameState === 'victory' ? 'bg-emerald-950/20' : 'bg-rose-950/20'} backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-300 z-[150]`}>
              <h1 className={`text-6xl font-black italic uppercase tracking-tighter mb-4 drop-shadow-2xl ${gameState === 'victory' ? 'text-emerald-400' : 'text-rose-400'}`}>{gameState === 'victory' ? 'SUCCESS' : 'FAILURE'}</h1>
              <div className="w-full max-w-lg bg-black/40 border border-white/10 rounded-[2rem] p-5 shadow-2xl backdrop-blur-2xl mb-6">
                <div className="flex justify-between items-start gap-4 mb-4 border-b border-white/5 pb-4">
                  <div className="flex-1"><p className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] mb-1.5">You</p><div className="space-y-0.5 text-[12px] font-bold text-white/80"><p>{player.equipment.weapon} <span className="text-indigo-400">Lv.{player.unlockedItems[player.equipment.weapon]}</span></p><p className="text-white/40">{player.equipment.armor} <span className="text-white/20 text-[10px]">Lv.{player.unlockedItems[player.equipment.armor]}</span></p></div></div>
                  <div className="text-center px-4 py-1 bg-white/5 rounded-full border border-white/5"><span className="text-[10px] font-black text-white/40 uppercase">V S</span></div>
                  <div className="flex-1 text-right"><p className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] mb-1.5">Opponent</p><div className="space-y-0.5 text-[12px] font-bold text-white/80"><p><span className="text-rose-400">Lv.{enemy.unlockedItems[enemy.equipment.weapon] || 1}</span> {enemy.equipment.weapon}</p><p className="text-white/40"><span className="text-white/20 text-[10px]">Lv.{enemy.unlockedItems[enemy.equipment.armor] || 1}</span> {enemy.equipment.armor}</p></div></div>
                </div>
                <div className="space-y-1.5"><p className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] text-center mb-2">Neural Combat Review</p>
                  {battleHistory.map((h, i) => (<div key={i} className="group flex items-center justify-between px-4 py-2 hover:bg-white/5 rounded-xl transition-colors"><span className="text-[10px] font-black text-white/20">R{h.round}</span><div className="flex items-center gap-3"><span className="text-rose-400 font-black text-[14px]">-{h.pDmg}</span><div className="w-12 h-[1px] bg-gradient-to-r from-rose-500/50 to-indigo-500/50"></div><span className="text-indigo-400 font-black text-[14px]">-{h.eDmg}</span></div><span className="text-[10px] font-mono text-white/40">HP {Math.floor(h.pRemainingHp)}:{Math.floor(h.eRemainingHp)}</span></div>))}
                </div>
              </div>
              <button onClick={() => { setGameState('lobby'); resetGame(); }} className={`group px-16 py-4 text-white font-black rounded-full shadow-2xl transition-all active:scale-95 text-[14px] flex items-center gap-3 ${gameState === 'victory' ? 'bg-emerald-500 hover:bg-emerald-400' : 'bg-rose-500 hover:bg-rose-400'}`}>{gameState === 'victory' ? 'PROCEED' : 'REBOOT SYSTEM'}<span className="opacity-50 group-hover:translate-x-1 transition-transform">➜</span></button>
            </div>
          )}
        </div>
        <div className="w-72 bg-white border border-slate-200 rounded-3xl p-5 flex flex-col shadow-sm">
           <h3 className="text-[13px] font-black text-slate-300 uppercase mb-4 tracking-widest border-b border-slate-50 pb-2">链路日志</h3>
           <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
              {battleLog.map((log, i) => ( <p key={i} className={`text-[13px] leading-relaxed border-l-2 pl-3 ${log.includes('造成') || log.includes('伤害') ? 'text-indigo-600 font-bold border-indigo-200' : log.includes('成功') || log.includes('强化') ? 'text-amber-500 border-amber-200' : 'text-slate-400 border-slate-100'}`}>{log}</p> ))}
           </div>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-3xl border border-slate-200 p-6 relative shadow-sm overflow-hidden flex flex-col">
        {gameState === 'lobby' && (
          <div className="h-full flex flex-col gap-3">
            <div className="flex justify-between items-center flex-none"><h3 className="text-[13px] font-black text-slate-400 uppercase tracking-widest">属性强化系统</h3><span className="text-[13px] bg-indigo-50 text-indigo-600 px-4 py-0.5 rounded-full font-bold">可用潜能: {player.statPoints}</span></div>
            <div className="grid grid-cols-3 gap-6 flex-1 min-h-0">{(['strength', 'agility', 'constitution'] as Stat[]).map(s => (<button key={s} onClick={() => handleLevelUp(s)} disabled={player.statPoints === 0} className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col justify-center items-center hover:border-indigo-300 transition-all disabled:opacity-50 active:scale-95"><p className="text-[13px] text-slate-400 font-bold uppercase mb-2">{s === 'strength' ? '力量 STR' : s === 'agility' ? '敏捷 AGI' : '体质 CON'}</p><p className="text-5xl font-black text-slate-800 leading-none">{player.stats[s]}</p></button>))}</div>
            <button onClick={() => setGameState('tactics')} className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-xl shadow-xl active:scale-95 flex-none mt-1">进入部署阶段</button>
          </div>
        )}

        {gameState === 'shop' && (
          <div className="h-full flex flex-col animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex justify-between items-center mb-4 flex-none"><h3 className="text-xl font-black italic text-amber-500 tracking-widest uppercase flex-1 text-center ml-10">地下黑市 · 战术中心</h3><button onClick={() => setGameState('lobby')} className="text-[13px] font-bold text-slate-400 hover:text-slate-800 underline">返回</button></div>
            <div className="flex-1 grid grid-cols-6 gap-3 pr-2 content-start overflow-y-auto custom-scrollbar">
              {[...ITEMS.weapons, ...ITEMS.armors, ...ITEMS.skills].map(item => {
                const rc = { common: { color: 'bg-slate-400' }, novel: { color: 'bg-blue-500' }, perfect: { color: 'bg-emerald-500' }, epic: { color: 'bg-amber-500' } }[item.rarity];
                const itemLvl = player.unlockedItems[item.name] || 0; const isLocked = player.level < (item.levelReq || 0); const cost = Math.floor((item.cost || 0) * Math.pow(1.6, itemLvl));
                return ( <button key={item.name} onClick={() => buyItem(item)} className={`p-2 rounded-xl border text-left transition-all relative flex flex-col items-center ${isLocked ? 'bg-slate-50 grayscale opacity-60' : 'bg-white hover:border-indigo-300 active:scale-95'}`}><span className="text-2xl mb-1">{item.icon}</span><div className="text-center w-full"><p className="font-black text-[10px] text-slate-700 truncate">{item.name}</p>{itemLvl > 0 && <p className="text-[9px] font-black text-indigo-500 bg-indigo-50 rounded-full px-1.5 py-0.5 inline-block mb-0.5">Lv.{itemLvl}</p>}<p className="text-amber-600 font-black text-[10px]">₿ {cost}</p></div><div className={`absolute top-1 right-1 w-2 h-2 rounded-full ${rc.color}`}></div></button> );
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
             <div className="flex justify-between items-center mb-3 flex-none">
                <div className="flex items-center gap-4">
                  <h3 className="text-xl font-black italic text-indigo-600 tracking-widest uppercase">战术部署</h3>
                  <div className="flex items-center gap-2 bg-indigo-50 px-4 py-1.5 rounded-2xl border border-indigo-100"><span className="text-[11px] font-black text-indigo-400 uppercase tracking-tighter">当前战场:</span><span className="text-[13px] font-black text-indigo-600">{field.name}</span></div>
                </div>
                <button onClick={startRound} className="px-12 py-2 bg-slate-800 text-white font-black rounded-xl hover:bg-slate-700 active:scale-95 transition-all text-[15px]">出击</button>
             </div>
             <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl mb-3 flex-none"><p className="text-[13px] font-bold text-slate-600 leading-relaxed"><b className="text-indigo-500">{field.name}：</b>{field.desc} <span className="ml-2 text-rose-500 font-black underline decoration-rose-200 underline-offset-4">{field.effect}</span></p></div>
             <div className="flex-1 grid grid-cols-3 gap-4 min-h-0">
                <div className="flex flex-col gap-1 min-h-0 h-full border-r border-slate-50 pr-2">
                  <p className="text-[11px] font-black text-slate-300 uppercase tracking-widest mb-1">主武器</p>
                  <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1">
                    {ITEMS.weapons.filter(w => player.unlockedItems[w.name]).map(w => ( <button key={w.name} onClick={() => setPlayer(p => ({...p, equipment: {...p.equipment, weapon: w.name}}))} className={`w-full text-left py-2 px-3 rounded-xl border text-[12px] font-bold transition-all ${player.equipment.weapon === w.name ? 'border-indigo-400 bg-indigo-50 text-indigo-600 shadow-sm' : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200'}`}>{w.icon} {w.name} <span className="float-right text-[10px] opacity-60">Lv.{player.unlockedItems[w.name]}</span></button> ))}
                  </div>
                </div>
                <div className="flex flex-col gap-1 min-h-0 h-full border-r border-slate-50 pr-2">
                  <p className="text-[11px] font-black text-slate-300 uppercase tracking-widest mb-1">防御件</p>
                  <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1">
                    {ITEMS.armors.filter(a => player.unlockedItems[a.name]).map(a => ( <button key={a.name} onClick={() => setPlayer(p => ({...p, equipment: {...p.equipment, armor: a.name}}))} className={`w-full text-left py-2 px-3 rounded-xl border text-[12px] font-bold transition-all ${player.equipment.armor === a.name ? 'border-indigo-400 bg-indigo-50 text-indigo-600 shadow-sm' : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200'}`}>{a.icon} {a.name} <span className="float-right text-[10px] opacity-60">Lv.{player.unlockedItems[a.name]}</span></button> ))}
                  </div>
                </div>
                <div className="flex flex-col gap-1 min-h-0 h-full">
                  <p className="text-[11px] font-black text-slate-300 uppercase tracking-widest mb-1">技能组</p>
                  <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1">
                    {ITEMS.skills.filter(s => player.unlockedItems[s.name]).map(s => ( <button key={s.name} onClick={() => setPlayer(p => ({...p, equipment: {...p.equipment, skill: s.name}}))} className={`w-full text-left py-2 px-3 rounded-xl border text-[12px] font-bold transition-all ${player.equipment.skill === s.name ? 'border-indigo-400 bg-indigo-50 text-indigo-600 shadow-sm' : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200'}`}>{s.icon} {s.name} <span className="float-right text-[10px] opacity-60">Lv.{player.unlockedItems[s.name]}</span></button> ))}
                  </div>
                </div>
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

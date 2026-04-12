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
    { name: '长弓', damage: 12, icon: '🏹', desc: '远程精准', cost: 50, rarity: 'common', tag: 'piercing' },
    { name: '重锤', damage: 25, icon: '🔨', desc: '势大力沉', cost: 60, rarity: 'common', tag: 'crushing' },
    { name: '名刀', damage: 32, icon: '🎋', desc: '迅捷致命', cost: 150, rarity: 'novel', levelReq: 3, tag: 'slashing' },
    { name: '神龙弓', damage: 55, icon: '🐉', desc: '破空之箭', cost: 600, rarity: 'perfect', levelReq: 8, tag: 'piercing' },
    { name: '激光剑', damage: 85, icon: '🔦', desc: '等离子刃', cost: 1500, rarity: 'epic', levelReq: 15, tag: 'energy' },
    { name: '雷神锤', damage: 150, icon: '⚡', desc: '众神之怒', cost: 4500, rarity: 'epic', levelReq: 25, tag: 'crushing' },
    { name: '影刃', damage: 130, icon: '🔪', desc: '虚空之遗', cost: 8500, rarity: 'epic', levelReq: 40, tag: 'slashing' },
  ] as Item[],
  armors: [
    { name: '布衣', defense: 0, evasion: 0, icon: '👕', desc: '轻便无负重', cost: 40, rarity: 'common', tag: 'light' },
    { name: '铁盾', defense: 12, evasion: -5, icon: '🛡️', desc: '稳固防御', cost: 60, rarity: 'common', tag: 'heavy' },
    { name: '披风', defense: 3, evasion: 20, icon: '🧥', desc: '幻影闪避', cost: 60, rarity: 'common', tag: 'light' },
    { name: '动力装甲', defense: 45, evasion: 5, icon: '🤖', desc: '外骨骼增强', cost: 500, rarity: 'novel', levelReq: 5, tag: 'medium' },
    { name: '虚空甲', defense: 95, evasion: 10, icon: '🌌', desc: '暗物质抵挡', cost: 2000, rarity: 'perfect', levelReq: 15, tag: 'medium' },
    { name: '纳米蜂群', defense: 50, evasion: 60, icon: '🐝', desc: '微型机器人拦截', cost: 6500, rarity: 'epic', levelReq: 35, tag: 'light' },
    { name: '反物质盾', defense: 350, evasion: -15, icon: '💠', desc: '终极防御屏障', cost: 15000, rarity: 'epic', levelReq: 60, tag: 'heavy' },
  ] as Item[],
  skills: [
    { name: '斩击', mult: 1.2, icon: '💥', desc: '标准攻击', cost: 40, rarity: 'common', tag: 'slashing' },
    { name: '治疗', mult: 0, icon: '✨', desc: '生物修复', cost: 50, rarity: 'common', tag: 'light' },
    { name: '连击', mult: 0.8, icon: '⚡', desc: '速度幻影', cost: 80, rarity: 'novel', tag: 'slashing' },
    { name: '超新星', mult: 3.5, icon: '☢️', desc: '能量释放', cost: 1000, rarity: 'perfect', levelReq: 10, tag: 'energy' },
    { name: '黑洞', mult: 8.0, icon: '🕟', desc: '吞噬一切', cost: 8000, rarity: 'epic', levelReq: 45, tag: 'energy' },
    { name: '时间倒流', mult: 0, icon: '⏳', desc: '因果重塑', cost: 12000, rarity: 'epic', levelReq: 70, tag: 'energy' },
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
const getAttackCounterMult = (wTag: string, aTag: string) => {
  if (wTag === 'slashing' && aTag === 'light') return 1.35;
  if (wTag === 'crushing' && aTag === 'heavy') return 1.35;
  if (wTag === 'piercing' && aTag === 'medium') return 1.35;
  return 1.0;
};
const getDefenseCounterMult = (aTag: string, wTag: string) => {
  if (aTag === 'heavy' && wTag === 'slashing') return 0.65;
  if (aTag === 'medium' && wTag === 'piercing') return 0.65;
  return 1.0;
};

// --- 神经滚轮组件 (Native Scroll 版) ---
const NeuralPicker = ({ label, items, selected, onSelect, unlockedItems }: { label: string, items: any[], selected: string, onSelect: (name: string) => void, unlockedItems: Record<string, number> }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const itemHeight = 48; 
  const tripleItems = [...items, ...items, ...items];
  const centerOffset = items.length * itemHeight;

  // 记录最后一次选中的索引，用于防抖
  const lastSelectedIndex = useRef(-1);

  useEffect(() => {
    if (scrollRef.current) {
      const idx = items.findIndex(i => i.name === selected);
      scrollRef.current.scrollTop = centerOffset + (idx * itemHeight);
    }
  }, [items.length]); // 只有当项目数量变化时重置

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const st = scrollRef.current.scrollTop;
    
    // 循环边界重置
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
    <div className="flex-1 flex flex-row items-center gap-2 min-w-0 h-full">
      <div className="flex-none flex flex-col items-center justify-center">
         <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] [writing-mode:vertical-lr] rotate-180 py-2 border-r border-slate-100 pr-1.5">{label}</p>
      </div>
      <div className="flex-1 h-36 bg-slate-900/[0.03] rounded-3xl relative border border-slate-100/50 overflow-hidden">
        <div className="absolute inset-x-2 h-[48px] top-1/2 -translate-y-1/2 bg-white shadow-sm border border-slate-100 rounded-2xl pointer-events-none z-0"></div>
        
        <div 
          ref={scrollRef}
          onScroll={handleScroll}
          className="relative z-10 h-full overflow-y-auto custom-scrollbar snap-y snap-mandatory"
        >
          <div style={{ height: (144 - itemHeight) / 2 }} />
          {tripleItems.map((item, idx) => {
            // 改进：基于名称匹配判定高亮，确保快速滑动时视觉连贯
            const isMatch = item.name === selected;
            return (
              <div 
                key={`${item.name}-${idx}`}
                className={`h-[48px] flex flex-row items-center justify-center gap-3 snap-center transition-all duration-200 ${isMatch ? 'opacity-100 scale-105' : 'opacity-20 scale-95'}`}
              >
                <span className="text-xl flex-none">{item.icon}</span>
                <div className="flex flex-row items-center gap-2 min-w-0">
                  <span className={`text-[12px] font-black truncate ${isMatch ? 'text-slate-800' : 'text-slate-400'}`}>
                    {item.name}
                  </span>
                  <span className={`text-[9px] font-bold font-mono ${isMatch ? 'text-indigo-500' : 'text-slate-300'}`}>
                    Lv.{unlockedItems[item.name] || 1}
                  </span>
                </div>
              </div>
            );
          })}
          <div style={{ height: (144 - itemHeight) / 2 }} />
        </div>
      </div>
    </div>
  );
};

interface BattleRoundRecord { round: number; pDmg: number; eDmg: number; pRemainingHp: number; eRemainingHp: number; }

class StickmanRenderer {
  private ctx: CanvasRenderingContext2D; private time: number = 0; private effects: any[] = []; private nextEffectId: number = 0;
  constructor(ctx: CanvasRenderingContext2D) { this.ctx = ctx; }
  addEffect(type: any, x: number, y: number, color: string = '#475569', count: number = 1) { for (let i = 0; i < count; i++) { this.effects.push({ id: this.nextEffectId++, type, x, y, vx: (Math.random() - 0.5) * 12, vy: (Math.random() - 0.5) * 12, life: 1.0, color, size: Math.random() * 4 + 2 }); } }
  drawBackground(field: Battlefield) {
    const ctx = this.ctx; const t = this.time; ctx.save(); ctx.fillStyle = field.bgColor; ctx.fillRect(0, 0, 800, 400);
    if (field.id === 'neutral') { ctx.strokeStyle = field.accentColor; ctx.lineWidth = 1; ctx.globalAlpha = 0.2; for(let i=0; i<800; i+=40) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + Math.sin(t+i)*5, 400); ctx.stroke(); } }
    else if (field.id === 'emp') { ctx.strokeStyle = '#818cf8'; ctx.lineWidth = 2; for(let i=0; i<5; i++) { if (Math.random() > 0.8) { ctx.beginPath(); ctx.moveTo(Math.random()*800, 0); ctx.lineTo(Math.random()*800, 400); ctx.globalAlpha = 0.3; ctx.stroke(); } } }
    else if (field.id === 'narrow') { ctx.fillStyle = '#27272a'; ctx.fillRect(0, 0, 800, 60); ctx.fillRect(0, 340, 800, 60); }
    else if (field.id === 'desert') { ctx.fillStyle = '#78350f'; ctx.globalAlpha = 0.3; for(let i=0; i<3; i++) { ctx.beginPath(); ctx.moveTo(0, 300+i*20); for(let x=0; x<=800; x+=20) { ctx.lineTo(x, 300+i*20 + Math.sin(x*0.01 + t + i)*10); } ctx.lineTo(800, 400); ctx.lineTo(0, 400); ctx.fill(); } }
    else if (field.id === 'overload') { ctx.strokeStyle = '#fb7185'; ctx.lineWidth = 3; ctx.globalAlpha = Math.abs(Math.sin(t*2))*0.3; ctx.beginPath(); ctx.arc(400, 200, 150 + Math.sin(t)*20, 0, Math.PI * 2); ctx.stroke(); }
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
    ctx.beginPath(); ctx.arc(0, -bodyHeight - headSize, headSize, 0, Math.PI * 2); ctx.moveTo(0, -bodyHeight); ctx.lineTo(0, 0); 
    ctx.moveTo(0, -bodyHeight + 8); ctx.lineTo(Math.cos(armAngle) * 35, -bodyHeight + 8 + Math.sin(armAngle) * 35);
    ctx.moveTo(0, -bodyHeight + 8); ctx.lineTo(Math.cos(-armAngle) * -30, -bodyHeight + 8 + Math.sin(-armAngle) * 30);
    ctx.moveTo(0, 0); ctx.lineTo(Math.sin(legAngle) * 30, 35); ctx.moveTo(0, 0); ctx.lineTo(Math.sin(-legAngle) * 30, 35);
    ctx.stroke(); ctx.restore();
    this.effects.forEach(e => { ctx.globalAlpha = e.life; ctx.fillStyle = e.color; if (e.type === 'arrow') { ctx.fillRect(e.x, e.y, 12, 2); } else { ctx.beginPath(); ctx.arc(e.x, e.y, e.size * e.life, 0, Math.PI * 2); ctx.fill(); } });
    ctx.globalAlpha = 1; this.updateEffects(); this.time += 0.04;
  }
}

interface Character {
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
      if (data.token) { localStorage.setItem('token', data.token); setToken(data.token); addLog('神经链路已建立。'); } else setAuthView('login');
    } catch (err: any) { alert(err.message); }
  };

  useEffect(() => {
    if (token) {
      fetch(`${API_URL}/load`, { headers: { 'Authorization': `Bearer ${token}` } }).then(res => res.json()).then(data => { if (data.gameData) {
        const rawData = data.gameData; if (Array.isArray(rawData.unlockedItems)) { const m: any = {}; rawData.unlockedItems.forEach((n: any) => m[n] = 1); rawData.unlockedItems = m; }
        setPlayer({ ...INITIAL_CHAR, ...rawData }); addLog('档案同步成功。');
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
    if (player.gold >= cost) { setPlayer(prev => ({ ...prev, gold: prev.gold - cost, unlockedItems: { ...prev.unlockedItems, [item.name]: curLvl + 1 } })); addLog(`强化: ${item.name} [Lv.${curLvl+1}]`); setPreviewItem(null); }
  };

  const handleLevelUp = (stat: Stat) => { if (player.statPoints > 0) setPlayer(prev => { const nMax = stat === 'constitution' ? Math.floor(prev.maxHealth + 15) : prev.maxHealth; return { ...prev, stats: { ...prev.stats, [stat]: prev.stats[stat] + 1 }, statPoints: prev.statPoints - 1, maxHealth: nMax, health: nMax }; }); };

  const startRound = async () => {
    setGameState('battle'); addLog(`>>> 回合开始`);
    let pHP = Math.floor(player.health); let eHP = Math.floor(enemy.health);
    let curP_Dmg = 0; let curE_Dmg = 0;

    const executeTurn = async (isP: boolean) => {
      const atk = isP ? player : enemy; const def = isP ? enemy : player;
      const wN = isP ? player.equipment.weapon : enemy.equipment.weapon; const aN = isP ? enemy.equipment.armor : player.equipment.armor;
      const w = ITEMS.weapons.find(i => i.name === wN)!; const a = ITEMS.armors.find(i => i.name === aN)!;
      const s = ITEMS.skills.find(i => i.name === (isP ? player.equipment.skill : enemy.equipment.skill))!;
      const wL = isP ? (player.unlockedItems[w.name] || 1) : (enemy.unlockedItems[w.name] || 1);
      const sL = isP ? (player.unlockedItems[s.name] || 1) : (enemy.unlockedItems[s.name] || 1);
      setCurrentPose(prev => ({ ...prev, [isP ? 'player' : 'enemy']: 'attack' }));
      if (w.name.includes('弓')) rendererRef.current?.addEffect('arrow', isP ? 280 : 520, 230, isP ? '#6366f1' : '#94a3b8', 1);
      await new Promise(r => setTimeout(r, 600));
      let baseDmg = calcVal(w.damage!, wL); let sMult = s?.mult || 1;
      const attackBonus = getAttackCounterMult(w.tag, a.tag);
      const defenseReduction = getDefenseCounterMult(a.tag, w.tag);
      if (attackBonus > 1) addLog(`${isP ? '>>' : '<<'} [压制] ${w.name} 穿透了 ${a.name}`);
      if (defenseReduction < 1) addLog(`${isP ? '>>' : '<<'} [抵抗] ${a.name} 削弱了 ${w.name}`);
      if (field.id === 'emp') { if (w.rarity === 'epic' || w.rarity === 'perfect') baseDmg *= 0.6; else if (w.rarity === 'common') baseDmg *= 1.6; }
      else if (field.id === 'narrow') { if (w.name.includes('锤')) baseDmg *= 0.5; else if (w.name.includes('刀') || w.name.includes('剑')) baseDmg *= 1.4; }
      else if (field.id === 'desert') { if (w.name.includes('弓')) baseDmg *= 1.6; }
      else if (field.id === 'overload') { sMult *= 2.0; }
      let dmg = (baseDmg + atk.stats.strength * (isP ? 0.8 : 1.2)) * sMult * attackBonus * defenseReduction; 
      if (s.mult) dmg *= (1 + 0.1 * (sL - 1));
      const rawDmg = Math.floor(dmg); rendererRef.current?.addEffect('spark', isP ? 560 : 240, 250, isP ? '#f59e0b' : '#ef4444', 12);
      if (isP) { let fD = Math.floor(field.id === 'overload' ? rawDmg * 1.3 : rawDmg); eHP = Math.max(0, eHP - fD); setEnemy(prev => ({ ...prev, health: eHP })); curP_Dmg = fD; addLog(`>> 造成 ${fD} 伤害`); } 
      else { const aL = player.unlockedItems[a.name] || 1; const minDmg = Math.floor(rawDmg * 0.15); let fD = Math.max(minDmg, rawDmg - calcVal(a.defense!, aL)); if (field.id === 'overload') fD *= 1.3; fD = Math.floor(Math.max(1, fD)); pHP = Math.max(0, pHP - fD); setPlayer(prev => ({ ...prev, health: pHP })); curE_Dmg = fD; addLog(`<< 受创 ${fD} 伤害`); }
      setCurrentPose(prev => ({ ...prev, [isP ? 'enemy' : 'player']: 'hit' })); await new Promise(r => setTimeout(r, 400)); setCurrentPose({player: 'idle', enemy: 'idle'});
    };
    await executeTurn(true); if (eHP > 0) await executeTurn(false);
    setBattleHistory(prev => [...prev, { round, pDmg: curP_Dmg, eDmg: curE_Dmg, pRemainingHp: pHP, eRemainingHp: eHP }]);
    const finalize = (isW: boolean, isK: boolean) => {
      const gR = isW ? (60 + player.level * 25) : (20 + player.level * 10); const xR = isW ? (70 + player.level * 10) : 0;
      if (isW) { setPlayer(prev => { let nX = prev.xp + xR; let nL = prev.level; let nS = prev.statPoints; if (nX >= nL * 100) { nX -= nL * 100; nL += 1; nS += 3; } return { ...prev, gold: prev.gold + gR, xp: nX, level: nL, statPoints: nS, health: prev.maxHealth, defeatCount: 0 }; }); setGameState('victory'); } 
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
                  <div className="flex items-center gap-2 bg-indigo-50 px-4 py-1.5 rounded-2xl border border-indigo-100">
                    <span className="text-[11px] font-black text-indigo-400 uppercase tracking-tighter">当前战场:</span>
                    <span className="text-[13px] font-black text-indigo-600">{field.name}</span>
                  </div>
                </div>
                <button onClick={startRound} className="px-12 py-2 bg-slate-800 text-white font-black rounded-xl hover:bg-slate-700 active:scale-95 transition-all text-[15px] shadow-lg shadow-slate-200">开始出击</button>
             </div>
             <div className="grid grid-cols-2 gap-3 mb-4 flex-none">
                <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">环境修正</p>
                  <p className="text-[12px] font-bold text-slate-600 leading-snug">{field.desc} <span className="text-rose-500">{field.effect}</span></p>
                </div>
                <div className="bg-indigo-600 border border-indigo-500 p-3 rounded-2xl shadow-inner relative overflow-hidden group">
                  <div className="absolute inset-0 bg-white/5 animate-pulse pointer-events-none"></div>
                  <p className="text-[10px] font-black text-white/50 uppercase mb-1 tracking-widest relative z-10">神经探测：敌方单位配置</p>
                  <div className="flex items-center gap-4 text-white font-black text-[12px] relative z-10">
                    <div className="flex flex-col">
                      <span title="武器">{ITEMS.weapons.find(w=>w.name===enemy.equipment.weapon)?.icon} {enemy.equipment.weapon} <b className="text-indigo-300 ml-1">Lv.{enemy.unlockedItems[enemy.equipment.weapon] || 1}</b></span>
                      {getAttackCounterMult(player.equipment.weapon ? ITEMS.weapons.find(w=>w.name===player.equipment.weapon)!.tag : '', ITEMS.armors.find(a=>a.name===enemy.equipment.armor)!.tag) > 1 && <span className="text-[9px] text-emerald-400 font-black animate-bounce mt-0.5">优势：压制</span>}
                    </div>
                    <span className="w-[1px] h-3 bg-white/20"></span>
                    <div className="flex flex-col">
                      <span title="防具">{ITEMS.armors.find(a=>a.name===enemy.equipment.armor)?.icon} {enemy.equipment.armor}</span>
                      {getDefenseCounterMult(player.equipment.armor ? ITEMS.armors.find(a=>a.name===player.equipment.armor)!.tag : '', ITEMS.weapons.find(w=>w.name===enemy.equipment.weapon)!.tag) < 1 && <span className="text-[9px] text-sky-400 font-black animate-bounce mt-0.5">优势：防御</span>}
                    </div>
                    <span className="w-[1px] h-3 bg-white/20"></span>
                    <span title="技能">{ITEMS.skills.find(s=>s.name===enemy.equipment.skill)?.icon} {enemy.equipment.skill}</span>
                  </div>
                </div>
             </div>
             <div className="flex-1 flex gap-4 min-h-0 h-full py-2">
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

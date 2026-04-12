import React, { useState, useEffect, useRef } from 'react';

// --- 配置 ---
const API_URL = `${window.location.protocol}//${window.location.hostname}:5273/api`;

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
}

interface Character {
  level: number;
  xp: number;
  gold: number;
  stats: Record<Stat, number>;
  statPoints: number;
  health: number;
  maxHealth: number;
  equipment: { weapon: string; armor: string; skill: string; };
  unlockedItems: string[];
}

const ITEMS = {
  weapons: [
    { name: '长剑', damage: 15, icon: '⚔️', desc: '新手利刃', rarity: 'common' },
    { name: '长弓', damage: 12, icon: '🏹', desc: '远程精准', rarity: 'common' },
    { name: '重锤', damage: 25, icon: '🔨', desc: '势大力沉', rarity: 'common' },
    { name: '名刀', damage: 22, icon: '🎋', desc: '迅捷致命', cost: 150, rarity: 'novel' },
    { name: '激光剑', damage: 35, icon: '🔦', desc: '等离子刃', cost: 400, rarity: 'epic' },
    { name: '神龙弓', damage: 28, icon: '🐉', desc: '破空之箭', cost: 300, rarity: 'perfect' },
  ] as Item[],
  armors: [
    { name: '布衣', defense: 0, evasion: 0, icon: '👕', desc: '轻便无负重', rarity: 'common' },
    { name: '铁盾', defense: 12, evasion: -5, icon: '🛡️', desc: '稳固防御', rarity: 'common' },
    { name: '披风', defense: 3, evasion: 20, icon: '🧥', desc: '幻影闪避', rarity: 'common' },
    { name: '动力装甲', defense: 25, evasion: 5, icon: '🤖', desc: '外骨骼增强', cost: 250, rarity: 'novel' },
    { name: '虚空甲', defense: 40, evasion: 10, icon: '🌌', desc: '暗物质抵挡', cost: 500, rarity: 'epic' },
  ] as Item[],
  skills: [
    { name: '斩击', mult: 1.2, icon: '💥', desc: '标准攻击', rarity: 'common' },
    { name: '治疗', mult: 0, icon: '✨', desc: '生物修复', rarity: 'common' },
    { name: '连击', mult: 0.8, icon: '⚡', desc: '速度幻影', rarity: 'novel' },
    { name: '超新星', mult: 2.5, icon: '☢️', desc: '能量释放', cost: 200, rarity: 'perfect' },
  ] as Item[]
};

const INITIAL_CHAR: Character = {
  level: 1, xp: 0, gold: 100,
  stats: { strength: 10, agility: 10, constitution: 10 },
  statPoints: 8, health: 100, maxHealth: 100,
  equipment: { weapon: '长剑', armor: '布衣', skill: '斩击' },
  unlockedItems: ['长剑', '长弓', '重锤', '布衣', '铁盾', '披风', '斩击', '治疗', '连击']
};

class StickmanRenderer {
  private ctx: CanvasRenderingContext2D;
  private time: number = 0;
  private effects: any[] = [];
  private nextEffectId: number = 0;
  constructor(ctx: CanvasRenderingContext2D) { this.ctx = ctx; }
  addEffect(type: any, x: number, y: number, color: string = '#475569', count: number = 1) {
    for (let i = 0; i < count; i++) {
      this.effects.push({ id: this.nextEffectId++, type, x, y, vx: (Math.random() - 0.5) * 12, vy: (Math.random() - 0.5) * 12, life: 1.0, color, size: Math.random() * 4 + 2 });
    }
  }
  updateEffects() { this.effects = this.effects.filter(e => { e.x += e.vx; e.y += e.vy; e.life -= 0.04; if (e.type === 'arrow') e.vx = 18; return e.life > 0; }); }
  draw(x: number, y: number, pose: any, flip: boolean = false, agility: number = 10, weaponIcon: string = '⚔️') {
    const ctx = this.ctx; const t = this.time * (1 + agility / 45); ctx.save(); ctx.translate(x, y); if (flip) ctx.scale(-1, 1);
    ctx.strokeStyle = pose === 'dead' ? '#cbd5e1' : '#1e293b'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    const headSize = 18; const bodyHeight = 55; let armAngle = Math.sin(t) * 0.4; let legAngle = Math.cos(t) * 0.4;
    if (pose === 'attack') { armAngle = -1.8 + Math.sin(t * 8) * 1.2; ctx.translate(Math.sin(t * 8) * 20, 0); ctx.font = '32px serif'; ctx.fillText(weaponIcon, Math.cos(armAngle) * 40 - 15, -bodyHeight + Math.sin(armAngle) * 40); }
    else if (pose === 'hit') { ctx.strokeStyle = '#ef4444'; ctx.translate(Math.sin(this.time * 60) * 10, 0); }
    else if (pose === 'dead') { ctx.rotate(Math.PI / 2); ctx.translate(35, -15); armAngle = 0.5; legAngle = 0.2; }
    ctx.beginPath(); ctx.arc(0, -bodyHeight - headSize, headSize, 0, Math.PI * 2); ctx.moveTo(0, -bodyHeight); ctx.lineTo(0, 0); ctx.moveTo(0, -bodyHeight + 8); 
    ctx.lineTo(Math.cos(armAngle) * 35, -bodyHeight + 8 + Math.sin(armAngle) * 35); ctx.moveTo(0, 0); ctx.lineTo(Math.sin(legAngle) * 30, 35); ctx.moveTo(0, 0); ctx.lineTo(Math.sin(-legAngle) * 30, 35); ctx.stroke(); ctx.restore();
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
  const [enemy, setEnemy] = useState<Character>({ ...INITIAL_CHAR, stats: { strength: 12, agility: 8, constitution: 12 }, health: 120, maxHealth: 120 });
  const [gameState, setGameState] = useState<'lobby' | 'tactics' | 'battle' | 'shop' | 'victory' | 'defeat'>('lobby');
  const [round, setRound] = useState(1);
  const [battleLog, setBattleLog] = useState<string[]>(['等待连接...']);
  const [currentPose, setCurrentPose] = useState<{player: any, enemy: any}>({player: 'idle', enemy: 'idle'});
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<StickmanRenderer | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authForm.username || !authForm.password) return alert('请输入完整的神经档案信息');
    
    // 注册时的二次确认校验
    if (authView === 'register' && authForm.password !== authForm.confirmPassword) {
      return alert('两次输入的访问密码不一致，请检查');
    }

    try {
      const res = await fetch(`${API_URL}/${authView}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '连接服务器失败');
      if (data.token) {
        localStorage.setItem('token', data.token);
        setToken(data.token);
        alert('神经链路已建立，欢迎回来。');
      } else {
        alert(data.message || '操作成功');
        setAuthView('login');
      }
    } catch (err: any) {
      alert(`[链路中断] ${err.message}`);
    }
  };

  const saveGame = async (currentData: Character) => {
    if (!token) return;
    await fetch(`${API_URL}/save`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ gameData: currentData }) });
  };

  useEffect(() => {
    if (token) {
      fetch(`${API_URL}/load`, { headers: { 'Authorization': `Bearer ${token}` } })
        .then(res => res.json())
        .then(data => { if (data.gameData) setPlayer(data.gameData); setBattleLog(['神经链路同步成功。']); });
    }
  }, [token]);

  useEffect(() => { if (token && player !== INITIAL_CHAR) saveGame(player); }, [player.level, player.gold, player.stats, player.unlockedItems]);

  useEffect(() => {
    if (canvasRef.current && !rendererRef.current) { rendererRef.current = new StickmanRenderer(canvasRef.current.getContext('2d')!); }
    let frame: number;
    const loop = () => {
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx && rendererRef.current) {
        ctx.clearRect(0, 0, 800, 400); ctx.strokeStyle = '#f8fafc'; for(let i=0; i<800; i+=40) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 400); ctx.stroke(); }
        const pWeapon = ITEMS.weapons.find(w => w.name === player.equipment.weapon);
        const eWeapon = ITEMS.weapons.find(w => w.name === enemy.equipment.weapon);
        rendererRef.current.draw(240, 280, currentPose.player, false, player.stats.agility, pWeapon?.icon);
        rendererRef.current.draw(560, 280, currentPose.enemy, true, enemy.stats.agility, eWeapon?.icon || '⚔️');
      }
      frame = requestAnimationFrame(loop);
    };
    loop(); return () => cancelAnimationFrame(frame);
  }, [currentPose, player.stats.agility, enemy.stats.agility, player.equipment.weapon, enemy.equipment.weapon]);

  const addLog = (msg: string) => setBattleLog(prev => [msg, ...prev].slice(0, 20));

  const buyItem = (item: Item) => {
    if (player.gold >= (item.cost || 0) && !player.unlockedItems.includes(item.name)) {
      setPlayer(prev => ({ ...prev, gold: prev.gold - (item.cost || 0), unlockedItems: [...prev.unlockedItems, item.name] }));
      addLog(`成功购买: ${item.name}!`);
    }
  };

  const handleLevelUp = (stat: Stat) => {
    if (player.statPoints > 0) {
      setPlayer(prev => {
        const newMax = stat === 'constitution' ? prev.maxHealth + 15 : prev.maxHealth;
        return { ...prev, stats: { ...prev.stats, [stat]: prev.stats[stat] + 1 }, statPoints: prev.statPoints - 1, maxHealth: newMax, health: newMax };
      });
    }
  };

  const startRound = async () => {
    setGameState('battle'); addLog(`--- 第 ${round} 回合开始 ---`);
    let currentPlayerHp = player.health; let currentEnemyHp = enemy.health;
    const executeTurn = async (isPlayer: boolean) => {
      const attacker = isPlayer ? player : enemy; const weaponName = isPlayer ? player.equipment.weapon : enemy.equipment.weapon;
      const weapon = ITEMS.weapons.find(w => w.name === weaponName)!; const skill = ITEMS.skills.find(s => s.name === (isPlayer ? player.equipment.skill : enemy.equipment.skill))!;
      setCurrentPose(prev => ({ ...prev, [isPlayer ? 'player' : 'enemy']: 'attack' }));
      if (weapon.name.includes('弓')) { rendererRef.current?.addEffect('arrow', isPlayer ? 280 : 520, 230, isPlayer ? '#6366f1' : '#94a3b8', 1); }
      else if (weapon.rarity === 'epic') { rendererRef.current?.addEffect('aura', isPlayer ? 240 : 560, 250, 'rgba(99, 102, 241, 0.2)', 15); }
      await new Promise(r => setTimeout(r, 600));
      let dmg = (weapon.damage! + attacker.stats.strength * 0.8) * (skill?.mult || 1); dmg = Math.floor(dmg);
      rendererRef.current?.addEffect('spark', isPlayer ? 560 : 240, 250, isPlayer ? '#f59e0b' : '#ef4444', 12);
      if (isPlayer) { currentEnemyHp = Math.max(0, currentEnemyHp - dmg); setEnemy(prev => ({ ...prev, health: currentEnemyHp })); }
      else { currentPlayerHp = Math.max(0, currentPlayerHp - dmg); setPlayer(prev => ({ ...prev, health: currentPlayerHp })); }
      addLog(`${isPlayer ? '>>' : '<<'} ${isPlayer ? '玩家' : '敌人'} 使用 ${weapon.name} 造成 ${dmg} 点伤害!`);
      setCurrentPose(prev => ({ ...prev, [isPlayer ? 'enemy' : 'player']: 'hit' })); await new Promise(r => setTimeout(r, 400));
      setCurrentPose({player: 'idle', enemy: 'idle'});
    };
    await executeTurn(true); if (currentEnemyHp > 0) await executeTurn(false);
    const finalizeBattle = (isWin: boolean, isKO: boolean) => {
      const goldReward = isWin ? (60 + player.level * 25) : (20 + player.level * 10);
      const xpReward = isWin ? (70 + player.level * 10) : 0;
      if (isWin) {
        setPlayer(prev => {
          let newXp = prev.xp + xpReward; let newLevel = prev.level; let newStatPoints = prev.statPoints;
          const targetXp = prev.level * 100;
          if (newXp >= targetXp) { newXp -= targetXp; newLevel += 1; newStatPoints += 3; addLog(`>>> 突破！等级提升至 LV.${newLevel}`); }
          return { ...prev, gold: prev.gold + goldReward, xp: newXp, level: newLevel, statPoints: newStatPoints, health: prev.maxHealth };
        });
        setGameState('victory'); if (isKO) setCurrentPose(prev => ({...prev, enemy: 'dead'}));
        addLog(`任务成功！${isKO ? '[完胜]' : '[点数胜]'} 获得: ₿ ${goldReward} | XP ${xpReward}`);
      } else {
        setPlayer(prev => ({ ...prev, gold: prev.gold + goldReward }));
        setGameState('defeat'); if (isKO) setCurrentPose(prev => ({...prev, player: 'dead'}));
        addLog(`任务失败。${isKO ? '[被击倒]' : '[点数劣势]'} 回收战损: ₿ ${goldReward}`);
      }
    };
    if (currentPlayerHp <= 0) finalizeBattle(false, true); else if (currentEnemyHp <= 0) finalizeBattle(true, true);
    else if (round >= 3) finalizeBattle(currentPlayerHp > currentEnemyHp, false); else { setRound(prev => prev + 1); setGameState('tactics'); }
  };

  const resetGame = () => {
    const rw = ITEMS.weapons[Math.floor(Math.random() * ITEMS.weapons.length)];
    const ra = ITEMS.armors[Math.floor(Math.random() * ITEMS.armors.length)];
    const rs = ITEMS.skills[Math.floor(Math.random() * ITEMS.skills.length)];
    setPlayer(prev => ({...prev, health: prev.maxHealth}));
    setEnemy({ ...INITIAL_CHAR, level: player.level, stats: { strength: 8 + player.level, agility: 8 + Math.floor(player.level/2), constitution: 8 + player.level }, equipment: { weapon: rw.name, armor: ra.name, skill: rs.name }, health: 90 + player.level * 10, maxHealth: 90 + player.level * 10 });
    setRound(1); setGameState('lobby'); setCurrentPose({player: 'idle', enemy: 'idle'});
    addLog(`>>> 侦测到新目标。配备: ${rw.name} | ${ra.name}`);
  };

  const getDefeatAdvice = () => {
    if (player.stats.agility < enemy.stats.agility) return "对手速度极快，建议提升‘敏捷’以获得先手权，或装备‘披风’尝试闪避。";
    if (player.stats.strength < enemy.stats.strength) return "你的攻击力不足，建议提升‘力量’，或者在‘黑市’购买高级武器（如名刀）。";
    if (player.health < enemy.health / 1.2) return "生存能力薄弱，建议提升‘体质’增加血量，并装备‘铁盾’增强防御。";
    return "战术失误！尝试在不同回合切换装备，利用长弓的远程优势或重锤的高伤害。";
  };

  if (!token) {
    return (
      <div className="h-screen w-full bg-slate-100 flex items-center justify-center p-4 font-sans text-slate-800">
        <div className="bg-white p-8 rounded-[3rem] shadow-2xl border border-slate-200 w-full max-w-md animate-in zoom-in-95 duration-300">
          <div className="text-center mb-6">
            <h1 className="text-4xl font-black italic text-indigo-600 tracking-tighter">影迹战术</h1>
            <p className="text-slate-400 font-bold text-[11px] uppercase tracking-[0.2em] mt-2">{authView === 'login' ? 'IDENTITY AUTHENTICATION' : 'CREATE NEURAL PROFILE'}</p>
          </div>
          <form onSubmit={handleAuth} className="space-y-3">
            <div className="space-y-1">
              <label className="text-[11px] font-black text-slate-400 ml-2 uppercase">用户名</label>
              <input type="text" placeholder="输入档案代号" className="w-full px-6 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:border-indigo-400 transition-all font-bold text-[14px]" value={authForm.username} onChange={e => setAuthForm({...authForm, username: e.target.value})} />
            </div>
            
            <div className="space-y-1">
              <label className="text-[11px] font-black text-slate-400 ml-2 uppercase">访问密码</label>
              <input type={showPassword ? "text" : "password"} placeholder="输入加密密钥" className="w-full px-6 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:border-indigo-400 transition-all font-bold text-[14px]" value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} />
            </div>

            {authView === 'register' && (
              <div className="space-y-1 animate-in slide-in-from-top-2 duration-200">
                <label className="text-[11px] font-black text-slate-400 ml-2 uppercase">确认密码</label>
                <input type={showPassword ? "text" : "password"} placeholder="再次输入密钥以确认" className="w-full px-6 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:border-indigo-400 transition-all font-bold text-[14px]" value={authForm.confirmPassword} onChange={e => setAuthForm({...authForm, confirmPassword: e.target.value})} />
              </div>
            )}

            <div className="flex items-center gap-2 ml-2 py-1">
              <input type="checkbox" id="show-pass" className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" checked={showPassword} onChange={e => setShowPassword(e.target.checked)} />
              <label htmlFor="show-pass" className="text-[12px] font-bold text-slate-500 cursor-pointer select-none">显示原文内容</label>
            </div>

            <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-indigo-100 hover:bg-indigo-500 transition-all mt-2 active:scale-95">
              {authView === 'login' ? '进入系统' : '立即建立档案'}
            </button>
          </form>
          <p className="mt-6 text-center text-[13px] text-slate-400 font-bold">
            {authView === 'login' ? '尚未分配神经编号?' : '已有现存档案?'} 
            <button className="text-indigo-600 ml-2 underline hover:text-indigo-800 font-black" onClick={() => { setAuthView(authView === 'login' ? 'register' : 'login'); setAuthForm({username: '', password: '', confirmPassword: ''}); }}>
              {authView === 'login' ? '注册新档案' : '返回身份验证'}
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-slate-50 text-slate-800 p-4 font-sans overflow-hidden flex flex-col gap-4">
      {/* 顶部状态栏 */}
      <div className="flex justify-between items-center bg-white border border-slate-200 px-6 py-4 rounded-2xl shadow-sm flex-none">
        <div className="flex items-center gap-12">
          <div className="flex flex-col items-center"><span className="text-[13px] text-slate-400 font-bold uppercase tracking-widest">神经等级</span><span className="text-2xl font-black text-indigo-600">LV.{player.level}</span></div>
          <div className="space-y-2">
            <div className="flex gap-6 text-[13px] font-bold text-slate-600"><span className="flex items-center gap-1.5">力 <b className="text-rose-500">{player.stats.strength}</b></span><span className="flex items-center gap-1.5">敏 <b className="text-emerald-500">{player.stats.agility}</b></span><span className="flex items-center gap-1.5">体 <b className="text-sky-500">{player.stats.constitution}</b></span></div>
            <div className="flex items-center gap-3"><div className="w-56 h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className="bg-indigo-500 h-full transition-all duration-500" style={{ width: `${(player.xp / (player.level * 100)) * 100}%` }} /></div><span className="text-[11px] font-mono text-slate-400 font-bold whitespace-nowrap">{player.xp} / {player.level * 100} XP</span></div>
          </div>
        </div>
        <div className="flex items-center gap-8">
          <div className="text-right"><span className="text-[13px] text-slate-400 font-bold uppercase block">比特币储备</span><span className="text-2xl font-black text-amber-500 leading-none">₿ {player.gold}</span></div>
          <div className="flex gap-2">
            <button onClick={() => setGameState('shop')} className="px-5 py-2.5 bg-slate-800 text-white text-[13px] font-bold rounded-xl hover:bg-slate-700 transition-colors shadow-lg shadow-slate-200">黑市商店</button>
            <button onClick={() => { localStorage.removeItem('token'); setToken(''); }} className="px-3 py-2.5 bg-slate-100 text-slate-400 text-[11px] font-bold rounded-xl hover:bg-slate-200 transition-colors">退出</button>
          </div>
        </div>
      </div>

      {/* 中段区域 */}
      <div className="flex-none h-[46vh] flex gap-4 min-h-0">
        <div className="flex-1 bg-white rounded-3xl border border-slate-200 relative overflow-hidden shadow-sm">
          <canvas ref={canvasRef} width={800} height={400} className="w-full h-full object-contain" />
          <div className="absolute top-6 inset-x-10 flex justify-between pointer-events-none">
            <div className="w-64"><div className="h-2.5 bg-slate-50 rounded-full border border-slate-100 overflow-hidden"><div className="bg-rose-500 h-full transition-all duration-1000" style={{ width: `${(player.health / player.maxHealth) * 100}%` }} /></div><p className="text-[13px] mt-2 text-rose-600 font-black uppercase">玩家系统: {player.health} HP</p></div>
            <div className="w-64 text-right"><div className="h-2.5 bg-slate-50 rounded-full border border-slate-100 overflow-hidden"><div className="bg-slate-800 h-full transition-all duration-1000" style={{ width: `${(enemy.health / enemy.maxHealth) * 100}%` }} /></div><p className="text-[13px] mt-2 text-slate-500 font-black uppercase">目标单位: {enemy.health} HP</p></div>
          </div>
          {gameState === 'victory' && (
            <div className="absolute inset-0 bg-emerald-50/40 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300">
              <h1 className="text-7xl font-black text-emerald-500 tracking-tighter italic text-center uppercase">{enemy.health <= 0 ? 'Total Knockout' : 'Mission Success'}</h1>
              <p className="text-emerald-600 font-bold mt-2 text-xl text-center">{enemy.health <= 0 ? '完美击倒目标' : '战术点数占优 · 顺利达成目标'}</p>
              <button onClick={resetGame} className="mt-8 px-12 py-4 bg-emerald-600 text-white font-black rounded-full shadow-xl active:scale-95 transition-all text-[15px]">继续下一场任务</button>
            </div>
          )}
          {gameState === 'defeat' && (
            <div className="absolute inset-0 bg-rose-50/60 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300 p-10 text-center">
              <h1 className="text-7xl font-black text-rose-500 tracking-tighter italic uppercase text-center">{player.health <= 0 ? 'Unit Destroyed' : 'System Failure'}</h1>
              <div className="mt-6 max-w-md bg-white border border-rose-100 p-6 rounded-3xl shadow-xl"><p className="text-rose-400 text-[11px] font-black uppercase tracking-[0.2em] mb-2">战术分析建议</p><p className="text-slate-700 text-[15px] leading-relaxed font-bold">{getDefeatAdvice()}</p></div>
              <button onClick={resetGame} className="mt-8 px-12 py-4 bg-rose-600 text-white font-black rounded-full shadow-xl active:scale-95 transition-all text-[15px]">重新引导系统</button>
            </div>
          )}
        </div>
        <div className="w-72 bg-white border border-slate-200 rounded-3xl p-5 flex flex-col shadow-sm">
           <h3 className="text-[13px] font-black text-slate-300 uppercase mb-4 tracking-widest border-b border-slate-50 pb-2">链路日志</h3>
           <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
              {battleLog.map((log, i) => ( <p key={i} className={`text-[13px] leading-relaxed border-l-2 pl-3 ${log.includes('造成') ? 'text-indigo-600 font-bold border-indigo-200' : log.includes('成功购买') ? 'text-amber-500 border-amber-200' : 'text-slate-400 border-slate-100'}`}>{log}</p> ))}
           </div>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-3xl border border-slate-200 p-6 relative shadow-sm">
        {gameState === 'lobby' && (
          <div className="h-full flex flex-col gap-3">
            <div className="flex justify-between items-center flex-none"><h3 className="text-[13px] font-black text-slate-400 uppercase tracking-widest">属性强化系统</h3><span className="text-[13px] bg-indigo-50 text-indigo-600 px-4 py-0.5 rounded-full font-bold border border-indigo-100">可用潜能: {player.statPoints}</span></div>
            <div className="grid grid-cols-3 gap-6 flex-1 min-h-0">
              {(['strength', 'agility', 'constitution'] as Stat[]).map(s => (
                <button key={s} onClick={() => handleLevelUp(s)} disabled={player.statPoints === 0} className="group bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col justify-center items-center hover:border-indigo-300 transition-all disabled:opacity-50 active:scale-95 overflow-hidden">
                  <p className="text-[13px] text-slate-400 font-bold uppercase mb-2">{s === 'strength' ? '力量 STR' : s === 'agility' ? '敏捷 AGI' : '体质 CON'}</p>
                  <p className="text-5xl font-black text-slate-800 leading-none py-1">{player.stats[s]}</p>
                  <div className="text-[13px] text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity font-bold h-4">点击强化</div>
                </button>
              ))}
            </div>
            <button onClick={() => setGameState('tactics')} className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-xl shadow-xl shadow-indigo-100 transition-all active:scale-95 flex-none mt-1">进入部署阶段</button>
          </div>
        )}

        {gameState === 'shop' && (
          <div className="h-full flex flex-col animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex justify-between items-center mb-4 flex-none"><h3 className="text-xl font-black italic text-amber-500 tracking-widest uppercase text-center flex-1 ml-10">地下黑市 · 战术中心</h3><button onClick={() => setGameState('lobby')} className="text-[13px] font-bold text-slate-400 hover:text-slate-800 underline">返回大厅</button></div>
            <div className="flex-1 grid grid-cols-6 gap-3 pr-2 content-start">
              {[...ITEMS.weapons, ...ITEMS.armors, ...ITEMS.skills].filter(i => i.cost).map(item => {
                const rc = { common: { color: 'bg-slate-400', label: '普通' }, novel: { color: 'bg-blue-500', label: '新奇' }, perfect: { color: 'bg-emerald-500', label: '至臻' }, epic: { color: 'bg-amber-500', label: '史诗' } }[item.rarity];
                return (
                  <div key={item.name} className="relative group">
                    <button onClick={() => buyItem(item)} disabled={player.gold < (item.cost || 0) || player.unlockedItems.includes(item.name)} className={`w-full p-2 rounded-xl border text-left transition-all relative flex flex-col items-center ${player.unlockedItems.includes(item.name) ? 'opacity-30 border-slate-100 bg-slate-50' : 'bg-white border-slate-100 hover:border-slate-300 hover:shadow-md active:scale-95'}`}>
                      <span className="text-2xl mb-1">{item.icon}</span><div className="text-center w-full"><p className="font-black text-[12px] text-slate-700 truncate">{item.name}</p><p className="text-amber-600 font-black text-[11px]">₿ {item.cost}</p></div><div className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${rc.color} ${item.rarity === 'epic' ? 'animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.8)]' : ''}`}></div>
                    </button>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-56 p-3 bg-slate-900/95 text-white rounded-2xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-[200] shadow-[0_20px_50px_rgba(0,0,0,0.4)] border border-slate-700 backdrop-blur-md scale-95 group-hover:scale-100 origin-bottom">
                      <div className="flex justify-between items-center border-b border-slate-700 mb-2 pb-1.5"><span className="font-black text-[13px]">{item.name}</span><span className={`text-[10px] px-2 py-0.5 rounded ${rc.color} text-white font-bold`}>{rc.label}</span></div>
                      <p className="text-slate-400 text-[12px] leading-snug mb-3 italic">{item.desc}</p>
                      <div className="space-y-1.5 bg-black/40 p-2.5 rounded-xl border border-white/5 text-[11px]">
                        {item.damage && <div className="flex justify-between"><span className="text-slate-500">威力</span><span className="text-rose-400 font-black">+{item.damage}</span></div>}
                        {item.defense && <div className="flex justify-between"><span className="text-slate-500">防御</span><span className="text-sky-400 font-black">+{item.defense}</span></div>}
                        {item.evasion ? <div className="flex justify-between"><span className="text-slate-500">闪避</span><span className="text-emerald-400 font-black">{item.evasion}%</span></div> : null}
                        {item.mult ? <div className="flex justify-between"><span className="text-slate-500">倍率</span><span className="text-indigo-400 font-black">x{item.mult}</span></div> : null}
                      </div>
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-[8px] border-transparent border-t-slate-900/95"></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {gameState === 'tactics' && (
          <div className="h-full flex flex-col animate-in zoom-in-95 duration-300">
             <div className="flex justify-between items-center mb-3 flex-none"><div className="flex items-center gap-4"><h3 className="text-xl font-black italic text-indigo-600 tracking-widest uppercase">第 {round} 轮 战术部署</h3><div className="flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-full border border-slate-200"><span className="text-[11px] font-bold text-slate-400 uppercase">敌方情报:</span><span className="text-[12px] font-black text-slate-600">{enemy.equipment.weapon} | {enemy.equipment.armor} | {enemy.equipment.skill}</span></div></div><button onClick={startRound} className="px-12 py-2 bg-slate-800 text-white font-black rounded-xl hover:bg-slate-700 active:scale-95 transition-all text-[15px]">确认并出击</button></div>
             <div className="flex-1 grid grid-cols-3 gap-8 overflow-hidden">
                <div className="flex flex-col gap-1 min-h-0"><p className="text-[13px] font-black text-slate-300 uppercase tracking-widest mb-1 border-b border-slate-50 pb-1">主武器</p><div className="flex flex-col gap-1 overflow-y-auto pr-1 custom-scrollbar">{ITEMS.weapons.filter(w => player.unlockedItems.includes(w.name)).map(w => ( <button key={w.name} onClick={() => setPlayer(p => ({...p, equipment: {...p.equipment, weapon: w.name}}))} className={`w-full text-left py-1.5 px-3 rounded-xl border text-[13px] font-bold transition-all ${player.equipment.weapon === w.name ? 'border-indigo-400 bg-indigo-50 text-indigo-600' : 'border-slate-100 bg-slate-50 text-slate-400'}`}>{w.icon} {w.name}</button> ))}</div></div>
                <div className="flex flex-col gap-1 min-h-0"><p className="text-[13px] font-black text-slate-300 uppercase tracking-widest mb-1 border-b border-slate-50 pb-1">防御件</p><div className="flex flex-col gap-1 overflow-y-auto pr-1 custom-scrollbar">{ITEMS.armors.filter(a => player.unlockedItems.includes(a.name)).map(a => ( <button key={a.name} onClick={() => setPlayer(p => ({...p, equipment: {...p.equipment, armor: a.name}}))} className={`w-full text-left py-1.5 px-3 rounded-xl border text-[13px] font-bold transition-all ${player.equipment.armor === a.name ? 'border-indigo-400 bg-indigo-50 text-indigo-600' : 'border-slate-100 bg-slate-50 text-slate-400'}`}>{a.icon} {a.name}</button> ))}</div></div>
                <div className="flex flex-col gap-1 min-h-0"><p className="text-[13px] font-black text-slate-300 uppercase tracking-widest mb-1 border-b border-slate-50 pb-1">技能组</p><div className="flex flex-col gap-1 overflow-y-auto pr-1 custom-scrollbar">{ITEMS.skills.filter(s => player.unlockedItems.includes(s.name)).map(s => ( <button key={s.name} onClick={() => setPlayer(p => ({...p, equipment: {...p.equipment, skill: s.name}}))} className={`w-full text-left py-1.5 px-3 rounded-xl border text-[13px] font-bold transition-all ${player.equipment.skill === s.name ? 'border-indigo-400 bg-indigo-50 text-indigo-600' : 'border-slate-100 bg-slate-50 text-slate-400'}`}>{s.icon} {s.name}</button> ))}</div></div>
             </div>
          </div>
        )}

        {gameState === 'battle' && (
          <div className="h-full flex flex-col items-center justify-center animate-pulse">
            <div className="text-7xl font-black italic text-slate-100 tracking-tighter uppercase">Analyzing...</div>
            <p className="text-[13px] text-slate-400 font-bold uppercase mt-6 tracking-[0.8em]">正在进行参数实时校准</p>
          </div>
        )}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #f1f5f9; border-radius: 10px; }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slide-in-from-bottom-4 { from { transform: translateY(0.5rem); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes zoom-in-95 { from { transform: scale(0.98); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .animate-in { animation-fill-mode: forwards; }
        .fade-in { animation-name: fade-in; }
        .slide-in-from-bottom-4 { animation-name: slide-in-from-bottom-4; }
        .zoom-in-95 { animation-name: zoom-in-95; }
      `}</style>
    </div>
  );
}

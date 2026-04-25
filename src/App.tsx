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

// --- 像素进化资源 (Stage 1: Base64 占位符) ---
const PIXEL_ASSETS_BASE64 = {
  head: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAFklEQVQYlWNgYGD4z0A6YGRgYOBPAgAALhMB/6E7VfAAAAAASUVORK5CYII=',
  torso: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAGklEQVQYlWNgYGD4z0A6YGRgYOBPAgAA/v8DAAAmEwH/oTtV8AAAAABJRU5ErkJggg==',
  arm: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAGklEQVQYlWNgYGD4z0A6YGRgYOBPAgAA/v8DAAAmEwH/oTtV8AAAAABJRU5ErkJggg==',
  leg: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAGklEQVQYlWNgYGD4z0A6YGRgYOBPAgAA/v8DAAAmEwH/oTtV8AAAAABJRU5ErkJggg==',
  sword: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAGklEQVQYlWNgYGD4z0A6YGRgYOBPAgAA/v8DAAAmEwH/oTtV8AAAAABJRU5ErkJggg==',
  shield: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAGklEQVQYlWNgYGD4z0A6YGRgYOBPAgAA/v8DAAAmEwH/oTtV8AAAAABJRU5ErkJggg==',
  bg_far: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAANUlEQVRYw+2WwQoAIAhD7f8/unToYmSBC6L3vSAnS6ZpE7SInp7vBfSInp7vBfSInp7vBfSInre/BfgMf8Nf0R3v+mXvAAAAAElFTkSuQmCC',
  bg_mid: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAa0lEQVRYw+2WwQoAIAhD7f8/unToYmSBC6L3vSAnS6ZpE7SInp7vBfSInp7vBfSInp7vBfSInp7vBfSInp7vBfSInp7vBfSInp7vBfSInp7vBfSInp7vBfSInp7vBfSInp7vBfSInp7vBfwGf8Nf0R3v+mXvAAAAAElFTkSuQmCC',
  bg_floor: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAXklEQVRYw+2WwQoAIAhD7f8/unToYmSBC6L3vSAnS6ZpE7SInp7vBfSInp7vBfSInp7vBfSInp7vBfSInp7vBfSInp7vBfSInp7vBfSInp7vBfSInp7vBfSInp7vBfwGf8Nf0R3w+mXvAAAAAElFTkSuQmCC',
};

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
        <p className="text-[10px] pixel-font text-slate-400 uppercase [writing-mode:vertical-rl] py-4 border-r-4 border-slate-900 pr-3 leading-none">{label}</p>
      </div>
      <div className="flex-1 h-full bg-slate-900/[0.05] relative border-4 border-slate-900 overflow-hidden shadow-inner">
        {/* 中心指示器 */}
        <div className="absolute inset-x-0 h-[64px] top-1/2 -translate-y-1/2 bg-white/20 border-y-4 border-indigo-500 pointer-events-none z-0"></div>

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
                className={`h-[64px] flex flex-row items-center justify-center gap-3 snap-center transition-all duration-100 px-2 ${isMatch ? 'opacity-100 scale-100' : 'opacity-20 scale-90 grayscale'}`}
              >
                <span className="text-3xl flex-none">{item.icon}</span>
                <div className="flex flex-col justify-center min-w-0">
                  <span className={`text-[10px] pixel-font truncate leading-tight ${isMatch ? 'text-slate-800' : 'text-slate-400'}`}>
                    {item.name}
                  </span>
                  <span className={`text-[8px] pixel-font ${isMatch ? 'text-indigo-500' : 'text-slate-300'}`}>
                    LV.{unlockedItems[item.name] || 1}
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
  private assets: Record<string, HTMLImageElement> = {};
  private assetsLoaded: boolean = false;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
    this.loadAssets();
  }

  private loadAssets() {
    const load = (name: string, url: string) => {
      const img = new Image(); img.src = url;
      img.onload = () => {
        this.assets[name] = img;
        if (Object.keys(this.assets).length >= 5) this.assetsLoaded = true;
      };
    };

    // 加载精美外部资产
    load('cyborg_ninja', '/cyborg_ninja_clean.png');
    load('cyborg_ninja_laser', '/cyborg_ninja_laser.png');
    load('cyborg_ninja_bow', '/cyborg_ninja_bow.png');
    load('cyborg_ninja_hammer', '/cyborg_ninja_hammer.png');
    load('s_idle_0', '/assets/s_idle.png');
    load('s_idle_1', '/assets/s_idle.png'); // 暂时复用同一张，也可后期补齐
    load('s_atk', '/assets/s_atk.png');

    // 背景资产保持现状 (程序化生成)
    const generateBG = (name: string, color: string) => {
      const canv = document.createElement('canvas'); canv.width = 32; canv.height = 32;
      const c = canv.getContext('2d')!;
      c.fillStyle = color; c.fillRect(0, 0, 32, 32);
      c.fillStyle = 'rgba(255,255,255,0.05)'; c.fillRect(8, 8, 4, 4);
      const img = new Image(); img.src = canv.toDataURL();
      img.onload = () => { this.assets[name] = img; };
    };

    generateBG('bg_far', '#0f172a');
    generateBG('bg_mid', '#1e1b4b');
    generateBG('bg_floor', '#334155');
  }

  private drawStickmanPath(pose: any, t: number, weaponIcon: string, isElite: boolean = false, isP: boolean = true) {
    const ctx = this.ctx;

    let frameName = 's_idle_0';
    if (pose === 'idle') {
      frameName = 's_idle_0';
    } else if (pose === 'attack') {
      frameName = 's_atk';
    }

    const img = this.assets[frameName];
    if (img) {
      // 呼吸感逻辑：首页慢速平稳，战场根据敏捷略微加快
      const breathFreq = pose === 'idle' ? (isP && gameState === 'lobby' ? 1.2 : 3) : 3;
      const breath = (pose === 'idle') ? Math.sin(t * breathFreq) * 0.03 : 0;

      ctx.save();
      if (!isP) {
        ctx.scale(-1, 1);
      }

      // 绘制带呼吸效果的资产
      const w = 96 * (1 - breath * 0.5);
      const h = 96 * (1 + breath);

      // 修正：总偏移量 82 像素
      ctx.drawImage(img, -w / 2, -h + 82, w, h);

      ctx.restore();
    } else {
      ctx.fillStyle = isElite ? '#f43f5e' : '#6366f1';
      ctx.fillRect(-15, -60, 30, 60);
    }
  }

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
      } else if (type === 'speed') {
        this.effects.push({
          id: this.nextEffectId++, type,
          x: x + (Math.random() - 0.5) * 40,
          y: y - 40 + (Math.random() - 0.5) * 60,
          vx: (Math.random() > 0.5 ? 15 : -15),
          vy: 0,
          life: 1.0, color, size: 2
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
    const ctx = this.ctx;
    ctx.save();

    // 1. 基础底色
    ctx.fillStyle = field.bgColor;
    ctx.fillRect(0, 0, 800, 400);

    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '255, 255, 255';
    };
    const accentRgb = hexToRgb(field.accentColor);

    // --- 2. 远景层 (Speed: 5) ---
    // 远景微粒
    const drawFarEnv = (count: number, speed: number, opacity: number) => {
      for (let i = 0; i < count; i++) {
        ctx.fillStyle = `rgba(255, 255, 255, ${opacity * (0.5 + Math.random() * 0.5)})`;
        const x = (Math.sin(i * 153.2) * 800 + 400 + this.time * speed) % 800;
        const y = (i * (300 / count)) % 300;
        ctx.fillRect(x, y, 2, 2);
      }
    };
    drawFarEnv(30, 5, 0.5);

    if (this.assetsLoaded) {
      const pattern = ctx.createPattern(this.assets.bg_far, 'repeat');
      if (pattern) {
        ctx.save();
        ctx.translate(-(this.time * 5) % 32, 0);
        ctx.fillStyle = pattern; ctx.globalAlpha = 0.35;
        ctx.fillRect(0, 0, 832, 400);
        ctx.restore();
      }
    }

    // --- 3. 中景层 (Speed: 7.5) ---
    const midSpeed = 7.5;
    const midXBase = (this.time * midSpeed) % 1600;

    // 建筑物设为不透明，以遮挡远景
    for (let i = 0; i < 25; i++) {
      const bW = 40 + Math.abs(Math.sin(i * 456)) * 60;
      const bH = 100 + Math.abs(Math.cos(i * 789)) * 150;
      const bX = (i * 100 - midXBase + 1600) % 1600 - 400;

      if (bX > -200 && bX < 1000) {
        // 使用实色填充
        ctx.fillStyle = `rgb(${hexToRgb(field.bgColor)})`; // 先涂一层背景色底
        ctx.fillRect(bX, 320 - bH, bW, bH);
        ctx.fillStyle = `rgba(${accentRgb}, 0.2)`; // 再叠一层环境强调色
        ctx.fillRect(bX, 320 - bH, bW, bH);

        // 建筑窗户
        ctx.fillStyle = `rgba(${accentRgb}, 0.5)`;
        ctx.fillRect(bX + 10, 320 - bH + 20, 10, 10);
      }
    }

    if (this.assetsLoaded) {
      const pattern = ctx.createPattern(this.assets.bg_mid, 'repeat');
      if (pattern) {
        ctx.save();
        ctx.translate(-(this.time * midSpeed) % 32, 150);
        ctx.fillStyle = pattern; ctx.globalAlpha = 0.3;
        ctx.fillRect(0, 0, 832, 170);
        ctx.restore();
      }
    }

    // --- 4. 近景层 (Speed: 10) ---
    if (this.assetsLoaded) {
      const pattern = ctx.createPattern(this.assets.bg_floor, 'repeat');
      if (pattern) {
        ctx.save();
        ctx.translate(-(this.time * 10) % 32, 320);
        ctx.fillStyle = pattern; ctx.globalAlpha = 0.9;
        ctx.fillRect(0, 0, 832, 80);
        ctx.restore();
      }
    }

    ctx.strokeStyle = `rgba(${accentRgb}, 0.2)`;
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(0, 320); ctx.lineTo(800, 320); ctx.stroke();

    if (field.id === 'neutral' || field.id === 'emp') {
      ctx.strokeStyle = `rgba(${accentRgb}, 0.08)`;
      ctx.lineWidth = 2;
      const floorX = (this.time * 10) % 60;
      for (let i = -floorX; i < 800; i += 60) {
        ctx.beginPath(); ctx.moveTo(i, 320); ctx.lineTo(i - 40, 400); ctx.stroke();
      }
    }

    if (field.id === 'overload') {
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = `rgba(244, 63, 94, ${0.1 + Math.sin(this.time * 2) * 0.05})`;
      ctx.fillRect(0, 0, 800, 400);
    }

    ctx.restore();
  }

  drawCharacter(x: number, y: number, pose: any, flip: boolean = false, agility: number = 10, weaponIcon: string = '⚔️', hasGhost: boolean = false, isElite: boolean = false) {
    const ctx = this.ctx; const t = this.time * (1 + agility / 45);

    // --- 精英特效：呼吸光晕 ---
    if (isElite && pose !== 'dead') {
      ctx.save(); ctx.translate(x, y); if (flip) ctx.scale(-1, 1);
      ctx.globalAlpha = 0.15 + Math.abs(Math.sin(this.time * 3)) * 0.25;
      ctx.strokeStyle = '#f43f5e'; ctx.lineWidth = 20; ctx.lineCap = 'round';
      ctx.shadowBlur = 15; ctx.shadowColor = '#f43f5e';
      this.drawStickmanPath(pose, t, '', isElite, !flip);
      ctx.stroke(); ctx.restore();
    }

    // --- 绘制残影 (Ghost Afterimages) ---
    if (hasGhost) {
      for (let i = 1; i <= 5; i++) {
        ctx.save();
        const ghostX = x + (flip ? i * 40 : -i * 40) * Math.sin(t * 3);
        ctx.translate(ghostX, y); if (flip) ctx.scale(-1, 1);
        ctx.globalAlpha = 0.5 / i;

        const tGhost = this.time * (1 + agility * 0.02);
        this.drawStickmanPath(pose, tGhost - i * 0.12, weaponIcon, isElite, !flip);
        ctx.restore();
      }
    }

    // --- 绘制本体 ---
    ctx.save(); ctx.translate(x, y); if (flip) ctx.scale(-1, 1);
    if (isElite && pose !== 'dead') { ctx.shadowBlur = 10; ctx.shadowColor = '#f43f5e'; }
    this.drawStickmanPath(pose, t, weaponIcon, isElite, !flip);
    ctx.restore();
  }

  // --- 首页专用：高阶全息绘制 (Procedural Drawing) ---
  drawLobbyHero(x: number, y: number, agility: number, equipment: { weapon: string, armor: string, skill: string }) {
    const ctx = this.ctx;
    const t = this.time * 1.5;
    const breath = 0; // 取消上下移动起伏

    ctx.save();
    ctx.translate(x, y + breath - 15);

    // 根据装备动态切换主角贴图
    const weapon = equipment.weapon || '';
    let imgKey = 'cyborg_ninja';
    if (weapon.includes('弓')) imgKey = 'cyborg_ninja_bow';
    else if (weapon.includes('锤')) imgKey = 'cyborg_ninja_hammer';
    else if (weapon.includes('激光剑')) imgKey = 'cyborg_ninja_laser';

    const img = this.assets[imgKey];
    if (img) {
      const w = 540; // 图片放大 20%
      const h = (img.height / img.width) * w;
      ctx.drawImage(img, -w / 2, -h / 2 - 20, w, h); // 居中调整
    } else {
      ctx.fillStyle = '#334155';
      ctx.fillRect(-20, -100, 40, 100);
    }

    ctx.restore();
  }

  private drawArmorDetailed(armorName: string) {
    const ctx = this.ctx;
    ctx.strokeStyle = armorName.includes('重型') ? '#f59e0b' : '#22d3ee';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-10, -75);
    ctx.lineTo(10, -75);
    ctx.lineTo(15, -45);
    ctx.lineTo(-15, -45);
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fill();
  }

  private drawWeaponDetailed(weaponName: string, isLeftHand: boolean) {
    const ctx = this.ctx;
    ctx.strokeStyle = weaponName.includes('剑') ? '#ef4444' : '#6366f1';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-30, -30);
    ctx.stroke();
  }

  renderEffects() {
    const ctx = this.ctx;
    this.effects.forEach(e => {
      ctx.save(); ctx.globalAlpha = Math.max(0, e.life);

      if (e.type === 'hit' || e.type === 'clash') {
        // 精致像素溅射：带重力和随机旋转的方块
        ctx.fillStyle = e.color || '#fff';
        const size = e.size * e.life;
        ctx.translate(e.x, e.y);
        ctx.rotate(e.life * 5); // 碎片旋转
        ctx.fillRect(-size / 2, -size / 2, size, size);
        e.vy += 0.4; // 模拟重力
      } else if (e.type === 'charge') {
        ctx.strokeStyle = e.color; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(e.x, e.y);
        ctx.lineTo(e.x + e.vx * 2, e.y + e.vy * 2); ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(e.x, e.y, e.size * e.life, 0, Math.PI * 2); ctx.fill();
      } else if (e.type === 'speed') {
        ctx.strokeStyle = e.color || '#6366f1'; ctx.lineWidth = 4; ctx.shadowBlur = 15; ctx.shadowColor = e.color;
        ctx.beginPath(); ctx.moveTo(e.x - 90, e.y); ctx.lineTo(e.x + 90, e.y); ctx.stroke();
      } else if (e.type === 'scan') {
        ctx.fillStyle = e.color || '#818cf8'; const scanY = e.y + (1 - e.life) * 400 - 200;
        ctx.fillRect(0, scanY, 800, 6); ctx.globalAlpha = e.life * 0.4; ctx.fillRect(0, scanY - 15, 800, 36);
      } else if (e.type === 'shield') {
        ctx.strokeStyle = e.color || '#ef4444'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(e.x, e.y - 40, 65, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = e.life * 0.2; ctx.fillStyle = e.color; ctx.fill();
      } else if (e.type === 'heal') {
        ctx.fillStyle = '#10b981'; ctx.beginPath(); ctx.arc(e.x, e.y, e.size * e.life, 0, Math.PI * 2); ctx.fill();
      } else {
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
  // --- 调试模式：自动登录 ---
  const [token, setToken] = useState(localStorage.getItem('token') || 'dev-token');
  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  const [authForm, setAuthForm] = useState({ username: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [player, setPlayer] = useState<Character>(() => {
    const saved = localStorage.getItem('username');
    return {
      ...INITIAL_CHAR,
      username: saved || 'DevWarrior',
      statPoints: 5 // 给予初始点数方便测试
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
  const [isDeployed, setIsDeployed] = useState(false);
  const [gameState, setGameState] = useState<'lobby' | 'tactics' | 'battle' | 'shop' | 'victory' | 'defeat'>('lobby');
  const [round, setRound] = useState(1);
  const [battleLog, setBattleLog] = useState<string[]>(['等待连接...']);
  const [currentPose, setCurrentPose] = useState<{ player: any, enemy: any }>({ player: 'idle', enemy: 'idle' });
  const [previewItem, setPreviewItem] = useState<Item | null>(null);
  const [field, setField] = useState<Battlefield>(BATTLEFIELDS[0]);
  const [battleHistory, setBattleHistory] = useState<BattleRoundRecord[]>([]);
  const [shopTab, setShopTab] = useState<'weapons' | 'armors' | 'skills' | null>(null);
  const [activeSkill, setActiveSkill] = useState<{ name: string, icon: string, isP: boolean } | null>(null);
  const [coinToss, setCoinToss] = useState<{ active: boolean, result: 'player' | 'enemy' | null }>({ active: false, result: null });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lobbyCanvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<StickmanRenderer | null>(null);
  const lobbyRendererRef = useRef<StickmanRenderer | null>(null);
  const hasLoaded = useRef(false);
  const lastWheelTime = useRef(0);
  const [wheelIndices, setWheelIndices] = useState({ weapon: 60, armor: 60, skill: 60 });
  
  // 确保在切换到调整页面时，拨轮位置与当前装备匹配
  useEffect(() => {
    if (gameState === 'tactics' || gameState === 'battle') {
      const syncIndex = (items: any[], currentName: string) => {
        const idx = items.findIndex(i => i.name === currentName);
        const base = 60; // 从第5轮左右开始，保证双向都有空间
        return base - (base % (items.length || 1)) + (idx >= 0 ? idx : 0);
      };
      
      setWheelIndices({
        weapon: syncIndex(ITEMS.weapons.filter(i => player.unlockedItems[i.name]), player.equipment.weapon),
        armor: syncIndex(ITEMS.armors.filter(i => player.unlockedItems[i.name]), player.equipment.armor),
        skill: syncIndex(ITEMS.skills.filter(i => player.unlockedItems[i.name]), player.equipment.skill)
      });
    }
  }, [gameState]);
  
  // 确保渲染器尽早初始化

  // 确保渲染器尽早初始化
  useEffect(() => {
    if (canvasRef.current && !rendererRef.current) {
      rendererRef.current = new StickmanRenderer(canvasRef.current.getContext('2d')!);
    }
  }, []);

  const addLog = (msg: string) => setBattleLog(prev => [msg, ...prev].slice(0, 20));

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    // 纯本地 Mock 逻辑：跳过 fetch，直接登录
    const mockToken = `local_token_${Date.now()}`;
    localStorage.setItem('token', mockToken);
    localStorage.setItem('username', authForm.username);
    setToken(mockToken);
    setPlayer(prev => ({ ...prev, username: authForm.username }));
    addLog('神经链路已在本地建立。');
    hasLoaded.current = true;
  };

  useEffect(() => {
    if (token) {
      const savedUser = localStorage.getItem('username');
      const localData = localStorage.getItem('stickman_pdata');
      console.log('🔍 [Load] 正在从本地存储恢复档案...', savedUser);

      if (localData) {
        try {
          const rawData = JSON.parse(localData);
          setPlayer(prev => ({
            ...prev,
            ...rawData,
            username: savedUser || prev.username
          }));
          addLog('本地档案同步成功。');
        } catch (e) {
          console.error('档案解析失败:', e);
        }
      }

      setTimeout(() => { hasLoaded.current = true; }, 300);
    }
  }, [token]);

  useEffect(() => {
    if (token && hasLoaded.current) {
      console.log('💾 [Save] 正在同步数据至本地存储...', player.level);
      localStorage.setItem('stickman_pdata', JSON.stringify(player));
    }
  }, [player.level, player.gold, player.stats, player.unlockedItems, player.health]);

  // 新增：空格键快捷操作
  useEffect(() => {
    const handleSpace = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        if (gameState === 'victory' || gameState === 'defeat') {
          e.preventDefault();
          setIsDeployed(false);
          setGameState('lobby');
          resetGame();
        } else if (gameState === 'tactics') {
          e.preventDefault();
          startRound();
        } else if (gameState === 'lobby') {
          e.preventDefault();
          setGameState('tactics');
        }
      }
    };
    window.addEventListener('keydown', handleSpace);
    return () => window.removeEventListener('keydown', handleSpace);
  }, [gameState]);

  useEffect(() => {
    let frame: number;
    // --- 统一渲染循环 ---
    const loop = () => {
      // 1. 战场渲染逻辑
      if (canvasRef.current && gameState === 'battle') {
        const ctx = canvasRef.current.getContext('2d')!;
        if (!rendererRef.current) rendererRef.current = new StickmanRenderer(ctx);
        const r = rendererRef.current;
        // 动态绑定最新画布上下文，防止组件重新挂载后渲染到旧的离线画布上
        (r as any).ctx = ctx;
        r.advance(); r.drawBackground(field);
        const pW = ITEMS.weapons.find(w => w.name === player.equipment.weapon);
        const eW = ITEMS.weapons.find(w => w.name === enemy.equipment.weapon);
        // 调用升级：x, y, pose, isFlip, agility, equipment, gameState, isMultiHit
        r.drawCharacter(240, 280, currentPose.player, false, player.stats.agility, player.equipment, gameState, activeSkill?.name === '幻影连击' && activeSkill.isP);
        r.drawCharacter(560, 280, currentPose.enemy, true, enemy.stats.agility, enemy.equipment, gameState, activeSkill?.name === '幻影连击' && !activeSkill.isP);
        r.renderEffects();
      }

      if (lobbyCanvasRef.current && gameState === 'lobby') {
        const ctx = lobbyCanvasRef.current.getContext('2d');
        if (ctx) {
          if (!lobbyRendererRef.current) lobbyRendererRef.current = new StickmanRenderer(ctx);
          const lr = lobbyRendererRef.current;
          // 动态绑定最新画布上下文
          (lr as any).ctx = ctx;
          ctx.clearRect(0, 0, 600, 700);
          lr.advance();
          const pW = ITEMS.weapons.find(w => w.name === player.equipment.weapon);
          ctx.save();
          // 居中校准
          ctx.translate(300, 350);
          // 使用全新的高阶全息绘制方法
          lr.drawLobbyHero(0, 0, player.stats.agility, player.equipment);
          ctx.restore();
        }
      }

      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [gameState, field, currentPose, player.equipment.weapon, enemy.equipment.weapon, player.stats.agility, enemy.stats.agility, activeSkill]);

  const buyItem = (item: Item, tab: 'weapons' | 'armors' | 'skills') => {
    const curLvl = player.unlockedItems[item.name] || 0;
    // 忽略价格限制，保障购买测试，并且购买后直接装备
    setPlayer(prev => {
      const eqKey = tab === 'weapons' ? 'weapon' : tab === 'armors' ? 'armor' : 'skill';
      return {
        ...prev,
        equipment: { ...prev.equipment, [eqKey]: item.name },
        unlockedItems: { ...prev.unlockedItems, [item.name]: curLvl + 1 }
      };
    });
    addLog(`成功装载: ${item.name} [Lv.${curLvl + 1}]`);
  };

  const resetGame = () => {
    setRound(1);
    setIsDeployed(false);
    setBattleLog(['系统就绪 / SYSTEM READY']);
    setPlayer(prev => ({ ...prev, health: prev.maxHealth }));
    setEnemy(prev => {
      const aW = ITEMS.weapons.filter(w => (w.levelReq || 0) <= prev.level);
      const aA = ITEMS.armors.filter(a => (a.levelReq || 0) <= prev.level);
      const aS = ITEMS.skills.filter(s => (s.levelReq || 0) <= prev.level);
      const rw = aW[Math.floor(Math.random() * aW.length)];
      const ra = aA[Math.floor(Math.random() * aA.length)];
      const rs = aS[Math.floor(Math.random() * aS.length)];
      return {
        ...prev,
        health: prev.maxHealth,
        equipment: { weapon: rw.name, armor: ra.name, skill: rs.name }
      };
    });
  };

  const handleLevelUp = (stat: Stat) => { if (player.statPoints > 0) setPlayer(prev => { const nMax = stat === 'constitution' ? Math.floor(prev.maxHealth + 15) : prev.maxHealth; return { ...prev, stats: { ...prev.stats, [stat]: prev.stats[stat] + 1 }, statPoints: prev.statPoints - 1, maxHealth: nMax, health: nMax }; }); };

  const startRound = async () => {
    setIsDeployed(true);
    // --- 掷币决定先手 ---
    const playerFirst = Math.random() > 0.5;
    const resultStr = playerFirst ? 'player' : 'enemy';

    setCoinToss({ active: true, result: null });
    await new Promise(r => setTimeout(r, 1000)); // 旋转时间
    setCoinToss({ active: true, result: resultStr });
    await new Promise(r => setTimeout(r, 1500)); // 展示结果时间
    setCoinToss({ active: false, result: null });

    setGameState('battle'); addLog(`>>> 神经链路第 ${round} 轮同步`);
    addLog(`[掷币] 结果: ${playerFirst ? '你' : '目标'} 获得优先行动权`);

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
      if (s.name === '幻影连击') rendererRef.current?.addEffect('speed', x, 280, '#6366f1', 15);
      if (s.name === '神经修复') {
        const atk = isP ? player : enemy;
        const sL = isP ? (player.unlockedItems[s.name] || 1) : (enemy.unlockedItems[s.name] || 1);
        const heal = Math.floor((atk.maxHealth - (isP ? pHP : eHP)) * 0.25 + atk.stats.constitution * 0.5 * sL);
        rendererRef.current?.addEffect('heal', x, 280, '#10b981', 12);
        if (isP) { pHP = Math.min(player.maxHealth, pHP + heal); setPlayer(prev => ({ ...prev, health: pHP })); }
        else { eHP = Math.min(enemy.maxHealth, eHP + heal); setEnemy(prev => ({ ...prev, health: eHP })); }
        addLog(`${isP ? '>>' : '<<'} [修复] +${heal} HP`);
      }
      await new Promise(r => setTimeout(r, 1200));
      setActiveSkill(null);
      await new Promise(r => setTimeout(r, 200));
    };

    if (playerFirst) {
      await releaseSkill(true);
      await releaseSkill(false);
    } else {
      await releaseSkill(false);
      await releaseSkill(true);
    }

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
          if (isP) { pHP = Math.max(0, pHP - reflect); setPlayer(prev => ({ ...prev, health: pHP })); addLog(`<< [反馈] -${reflect} HP`); }
          else { eHP = Math.max(0, eHP - reflect); setEnemy(prev => ({ ...prev, health: eHP })); addLog(`>> [反馈] -${reflect} HP`); }
        }

        // 过载
        if (s.name === '系统过载') {
          const backlash = Math.floor(atk.maxHealth * 0.1);
          if (isP) { pHP = Math.max(0, pHP - backlash); setPlayer(prev => ({ ...prev, health: pHP })); }
          else { eHP = Math.max(0, eHP - backlash); setEnemy(prev => ({ ...prev, health: eHP })); }
          addLog(`!! [过载] -${backlash} HP`);
        }

        setCurrentPose(prev => ({ ...prev, [isP ? 'enemy' : 'player']: 'hit' }));
        await new Promise(r => setTimeout(r, 200)); // 缩短至 200ms
      }
      setCurrentPose({ player: 'idle', enemy: 'idle' });
      await new Promise(r => setTimeout(r, 300));
    };

    if (playerFirst) {
      await executeTurn(true);
      await executeTurn(false);
    } else {
      await executeTurn(false);
      await executeTurn(true);
    }

    // 结算逻辑
    setBattleHistory(prev => [...prev, { round, pDmg: curP_Dmg, eDmg: curE_Dmg, pRemainingHp: pHP, eRemainingHp: eHP }]);

    const finalize = (isW: boolean) => {
      const gR = isW ? (60 + player.level * 25) : (20 + player.level * 10); const xR = isW ? (70 + player.level * 10) : 0;
      if (isW) {
        setPlayer(prev => {
          let nX = prev.xp + xR; let nL = prev.level; let nS = prev.statPoints;
          if (nX >= nL * 100) { nX -= nL * 100; nL += 1; nS += 3; }
          return { ...prev, gold: prev.gold + gR, xp: nX, level: nL, statPoints: nS, health: prev.maxHealth, defeatCount: 0 };
        });
        setGameState('victory');
        addLog(`>> 任务完成: 获得 ₿${gR} | EXP +${xR}`);
      } else {
        setPlayer(prev => ({ ...prev, gold: prev.gold + gR, defeatCount: (prev.defeatCount || 0) + 1 }));
        setGameState('defeat');
        addLog(`<< 连接断开: 获得补偿 ₿${gR}`);
      }
    };

    if (pHP <= 0) finalize(false);
    else if (eHP <= 0) finalize(true);
    else if (round >= 3) finalize(pHP > eHP);
    else {
      const aW = ITEMS.weapons.filter(w => (w.levelReq || 0) <= player.level);
      const aA = ITEMS.armors.filter(a => (a.levelReq || 0) <= player.level);
      const aS = ITEMS.skills.filter(s => (s.levelReq || 0) <= player.level);
      const rw = aW[Math.floor(Math.random() * aW.length)];
      const ra = aA[Math.floor(Math.random() * aA.length)];
      const rs = aS[Math.floor(Math.random() * aS.length)];
      const isElite = enemy.username?.includes('[精英]');
      const eL = Math.max(1, Math.floor(player.level / 2.2 * (isElite ? 1.5 : 1)));
      setEnemy(prev => ({ ...prev, equipment: { weapon: rw.name, armor: ra.name, skill: rs.name }, unlockedItems: { [rw.name]: eL, [ra.name]: eL, [rs.name]: eL } }));
      addLog(`>>> 目标正在重新校准战术单元...`);
      setRound(prev => prev + 1);
      setIsDeployed(false);
      // 关键修改：不再切换状态，保持在 battle 场景
    }
  };

  return (
    <div className="h-screen w-full bg-slate-950 text-slate-100 font-sans overflow-hidden relative">
      {/* 1. AUTH OVERLAY */}
      {!token && (
        <div className="absolute inset-0 z-[1000] bg-slate-950/95 flex items-center justify-center p-4">
          <div className="w-full max-w-md pixel-card p-10 animate-in zoom-in-95 duration-300">
            <div className="text-center mb-8 border-b-4 border-slate-800 pb-6">
              <h1 className="text-3xl pixel-font text-indigo-500 mb-2 glow-pixel">NEURAL LINK</h1>
              <p className="text-xs pixel-font text-slate-500">神经链路接入 / ENCRYPTION ACTIVE</p>
            </div>
            <form onSubmit={handleAuth} className="space-y-6">
              <div className="space-y-1">
                <label className="text-xs pixel-font text-slate-500 ml-1">档案代号 / USERNAME</label>
                <input type="text" required className="w-full bg-slate-900 border-4 border-slate-800 p-4 text-white font-bold outline-none focus:border-indigo-500 transition-colors" value={authForm.username} onChange={e => setAuthForm(p => ({ ...p, username: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-xs pixel-font text-slate-500 ml-1">接入密钥 / PASSWORD</label>
                <input type="password" required className="w-full bg-slate-900 border-4 border-slate-800 p-4 text-white font-bold outline-none focus:border-indigo-500 transition-colors" value={authForm.password} onChange={e => setAuthForm(p => ({ ...p, password: e.target.value }))} />
              </div>
              <button type="submit" className="w-full py-5 pixel-button text-[12px] mt-4">建立连接 / ESTABLISH CONNECTION</button>
            </form>
          </div>
        </div>
      )}

      {/* 2. MAIN CONTENT ROUTER */}
      {(gameState === 'battle' || gameState === 'victory' || gameState === 'defeat') ? (
        /* --- PERSISTENT BATTLE HUD --- */
        <div className="fixed inset-0 bg-slate-950 flex flex-col overflow-hidden text-white font-mono z-[500]">


          {/* TOP HUD */}
          <div className="cyber-hud border-b-4 border-slate-900">
            <div className="hud-unit">
              <img src="/assets/p_port.png" className="portrait-box" alt="P" />
              <div className="bar-stack">
                <div className="unit-name text-cyan-400 cn-text">玩家 / {player.username}</div>
                {/* 玩家当前装备展示 */}
                <div className="flex gap-2 text-xs text-slate-500 font-bold mb-1 cn-text">
                  <span className="text-indigo-400">{player.equipment.weapon}</span>
                  <span className="opacity-30">|</span>
                  <span className="text-indigo-400">{player.equipment.armor}</span>
                  <span className="opacity-30">|</span>
                  <span className="text-indigo-400">{player.equipment.skill}</span>
                </div>
                <div className="flex gap-2 w-[400px]">
                  <div className="flex-1 pixel-bar-container !mb-0">
                    <div className="pixel-bar-fill bg-emerald-500" style={{ width: `${(player.health / player.maxHealth) * 100}%` }} />
                    <span className="bar-label cn-text">HP {player.health}/{player.maxHealth}</span>
                  </div>
                  <div className="w-[120px] pixel-bar-container !mb-0">
                    <div className="pixel-bar-fill bg-indigo-500" style={{ width: '100%' }} />
                    <span className="bar-label cn-text">EP 100%</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="hud-info-center">
              <div className="round-text cn-text">回合进度 / ROUND {round}</div>
              <div className="mini-log animate-pulse text-sm font-bold cn-text">
                {!isDeployed ? '等待战术确认 / WAITING FOR READY' : (battleLog[0] || '系统就绪 / SYSTEM READY')}
              </div>
            </div>

            <div className="hud-unit flex-row-reverse">
              <img src="/assets/e_port.png" className="portrait-box border-rose-900" alt="E" />
              <div className="bar-stack text-right">
                <div className="unit-name text-rose-400 cn-text">目标 / {enemy.username}</div>
                {/* 敌人当前装备展示 (提供博弈信息) */}
                <div className="flex justify-end gap-2 text-xs text-slate-500 font-bold mb-1 cn-text">
                  <span className="text-rose-400">{enemy.equipment.weapon}</span>
                  <span className="opacity-30">|</span>
                  <span className="text-rose-400">{enemy.equipment.armor}</span>
                  <span className="opacity-30">|</span>
                  <span className="text-rose-400">{enemy.equipment.skill}</span>
                </div>
                <div className="flex flex-row-reverse gap-2 w-[400px]">
                  <div className="flex-1 pixel-bar-container !mb-0">
                    <div className="pixel-bar-fill bg-rose-600" style={{ width: `${(enemy.health / enemy.maxHealth) * 100}%` }} />
                    <span className="bar-label left-2 right-auto cn-text">HP {enemy.health}/{enemy.maxHealth}</span>
                  </div>
                  <div className="w-[120px] pixel-bar-container !mb-0">
                    <div className="pixel-bar-fill bg-sky-500" style={{ width: '100%' }} />
                    <span className="bar-label left-2 right-auto cn-text">盾 100%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* BATTLE FIELD / 场景展示 */}
          <div className="flex-1 relative flex items-center justify-center gap-8 px-8 py-2 bg-[radial-gradient(circle_at_center,_#1e1b4b_0%,_#020617_100%)]">
            
            {/* 环境与目标情报 (移至场景左侧) */}
            <div className="w-[280px] h-[400px] pixel-card bg-slate-900/80 p-5 flex flex-col gap-4 border-indigo-500/40 backdrop-blur-md animate-in slide-in-from-left-8 duration-500">
              <div className="flex flex-col gap-2">
                <p className="text-xs font-black text-indigo-400 uppercase tracking-wider border-b-2 border-indigo-500/20 pb-2 cn-text">情报终端 / INTEL</p>
                <div className="space-y-3 mt-2">
                  <div>
                    <p className="text-xs text-slate-400 font-bold cn-text">环境特征</p>
                    <p className="text-sm font-black text-white mt-1 cn-text">"{field.name}"</p>
                    <p className="text-xs text-indigo-400 font-semibold mt-1 cn-text">{field.effect}</p>
                  </div>
                  <div className="border-t border-slate-800 pt-3">
                    <p className="text-xs text-slate-400 font-bold uppercase mb-2 cn-text">目标情报</p>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center bg-rose-500/5 p-2 border-l-2 border-rose-500">
                        <span className="text-xs text-slate-400 font-bold cn-text">武器</span>
                        <span className="text-xs text-rose-400 font-black cn-text">{enemy.equipment.weapon}</span>
                      </div>
                      <div className="flex justify-between items-center bg-rose-500/5 p-2 border-l-2 border-rose-500">
                        <span className="text-xs text-slate-400 font-bold cn-text">防具</span>
                        <span className="text-xs text-rose-400 font-black cn-text">{enemy.equipment.armor}</span>
                      </div>
                      <div className="flex justify-between items-center bg-rose-500/5 p-2 border-l-2 border-rose-500">
                        <span className="text-xs text-slate-400 font-bold cn-text">技能</span>
                        <span className="text-xs text-rose-400 font-black cn-text">{enemy.equipment.skill}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-auto pt-4 border-t border-slate-800">
                <div className="flex items-center gap-2 animate-pulse">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]"></div>
                  <span className="text-xs text-emerald-500 font-black tracking-wide cn-text">终端在线 ONLINE</span>
                </div>
              </div>
            </div>

            <div className="relative">
              <canvas ref={canvasRef} width={800} height={400} className="max-w-full h-auto border-4 border-slate-800 shadow-2xl bg-black image-pixelated" />

            {activeSkill && (
              <div className="absolute top-1/4 text-5xl font-black italic text-cyan-400 drop-shadow-[0_0_15px_#00f2ff] animate-bounce">
                {activeSkill.name}!!
              </div>
            )}

            {coinToss.active && (
              <div className="absolute inset-0 z-[300] bg-slate-950/80 flex flex-col items-center justify-center animate-in fade-in">
                <div className={`w-32 h-32 rounded-full border-8 flex items-center justify-center text-4xl shadow-2xl transition-all duration-700 ${!coinToss.result ? 'animate-spin border-slate-400 bg-slate-800' : coinToss.result === 'player' ? 'border-emerald-500 bg-emerald-600 scale-125' : 'border-rose-500 bg-rose-600 scale-125'}`}>
                  {!coinToss.result ? '🪙' : coinToss.result === 'player' ? 'YOU' : 'HOST'}
                </div>
                <p className="mt-8 text-2xl font-black pixel-font text-white uppercase text-center tracking-widest cn-text">判定行动顺序 . . .</p>
              </div>
            )}

            {/* MISSION RESULT OVERLAY */}
            {(gameState === 'victory' || gameState === 'defeat') && (
              <div className="absolute inset-0 z-[400] bg-slate-950/80 flex items-center justify-center animate-in zoom-in-95">
                <div className={`p-12 border-4 ${gameState === 'victory' ? 'border-emerald-500 bg-emerald-950/50' : 'border-rose-500 bg-rose-950/50'} text-center shadow-[0_0_100px_rgba(0,0,0,1)]`}>
                  <h2 className={`text-6xl font-black italic mb-4 ${gameState === 'victory' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {gameState === 'victory' ? 'MISSION COMPLETE' : 'CONNECTION LOST'}
                  </h2>
                  <p className="text-white pixel-font text-sm mb-10 tracking-[0.2em] cn-text">{gameState === 'victory' ? '目标已被彻底清除' : '严重损伤，被迫断开连接'}</p>
                  <button onClick={() => { setGameState('lobby'); resetGame(); }} className="px-12 py-4 bg-white text-black font-bold pixel-font text-xs hover:bg-indigo-500 hover:text-white transition-all cn-text">RETURN TO BASE [ESC]</button>
                </div>
              </div>
            )}
            </div>

            {/* 数据流卡片 (场景右侧) */}
            <div className="w-[240px] h-[400px] pixel-card bg-slate-900/80 p-4 flex flex-col gap-3 border-cyan-500/20 backdrop-blur-md animate-in slide-in-from-right-8 duration-500">
              <div className="flex items-center justify-between border-b-2 border-cyan-500/20 pb-2">
                <p className="text-xs font-black text-cyan-400 uppercase tracking-wider cn-text">数据流 / STREAM</p>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></div>
                  <span className="text-[8px] text-cyan-500 font-black">LIVE</span>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1.5 text-[9px] font-mono">
                {battleLog.length === 0 ? (
                  <div className="text-slate-600 italic text-center mt-8 text-xs cn-text">等待战斗数据...</div>
                ) : (
                  [...battleLog].reverse().map((log, i) => (
                    <div key={i} className={"px-2 py-1.5 border-l-2 text-xs leading-relaxed " + (
                      log.includes('打击') ? 'border-emerald-400 text-emerald-300 bg-emerald-500/5' :
                      log.includes('受创') ? 'border-rose-400 text-rose-300 bg-rose-500/5' :
                      log.includes('任务完成') ? 'border-yellow-400 text-yellow-300 bg-yellow-500/5' :
                      log.includes('修复') ? 'border-teal-400 text-teal-300 bg-teal-500/5' :
                      'border-slate-700 text-slate-400'
                    ) + " cn-text"}>{log}</div>
                  ))
                )}
              </div>
              <div className="pt-2 border-t border-slate-800">
                <div className="flex justify-between text-xs text-slate-500 font-bold cn-text">
                  <span>日志 {battleLog.length} 条</span>
                  <span className="text-cyan-500">R{round}</span>
                </div>
              </div>
            </div>

          </div>

          {/* 实时战术底部面板 - 整合优化 */}
          <div className="flex gap-4 p-4 bg-slate-950 border-t-4 border-slate-900 h-[300px]">
            {/* 实时载荷调节 (左侧 - 滚动选择器) */}
            <div className="flex-1 pixel-card bg-slate-900/50 p-3 flex flex-col gap-3 overflow-hidden">
              <p className="text-xs font-black text-indigo-400 uppercase tracking-wider border-b border-indigo-500/20 pb-1.5 cn-text">实时载荷调节 / LOADOUT ADJUSTMENT</p>
              <div className="flex-1 grid grid-cols-3 gap-4 min-h-0">
                {/* 武器选择器 */}
                <div className="flex flex-col gap-2 min-h-0">
                  <label className="text-[10px] text-slate-500 font-bold cn-text uppercase tracking-tight">攻击链路 / WEAPON</label>
                  <div className="flex-1 flex flex-col min-h-0">
                    {(() => {
                      const items = ITEMS.weapons.filter(i => player.unlockedItems[i.name]);
                      const currentIdx = items.findIndex(i => i.name === player.equipment.weapon);
                      const itemHeight = 48; // Reduced height for closer spacing
                      
                      return (
                        <div 
                          onWheel={(e) => {
                            if (isDeployed) return;
                            const now = Date.now();
                            if (now - lastWheelTime.current < 400) return;
                            lastWheelTime.current = now;
                            
                            const items = ITEMS.weapons.filter(i => player.unlockedItems[i.name]);
                            const direction = e.deltaY > 0 ? 1 : -1;
                            const newIdx = wheelIndices.weapon + direction;
                            
                            setWheelIndices(prev => ({ ...prev, weapon: newIdx }));
                            const realIdx = (newIdx % items.length + items.length) % items.length;
                            setPlayer(prev => ({ ...prev, equipment: { ...prev.equipment, weapon: items[realIdx].name } }));
                          }}
                          className="flex-1 relative overflow-hidden group/picker border border-slate-800 bg-slate-950/50 rounded"
                        >
                          <div className="absolute inset-0 flex flex-col pointer-events-none z-10">
                            <div className="flex-1 bg-gradient-to-b from-slate-950/90 via-slate-950/20 to-transparent"></div>
                            <div className="h-[48px] border-y border-indigo-500/30 bg-indigo-500/5"></div>
                            <div className="flex-1 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent"></div>
                          </div>
                          <div 
                            className="absolute left-0 right-0 transition-transform duration-500 cubic-bezier(0.2, 0.8, 0.2, 1)"
                            style={{ 
                              top: '50%',
                              marginTop: '-24px',
                              transform: `translateY(${-wheelIndices.weapon * 48}px)`
                            }}
                          >
                            {Array.from({ length: 120 }).map((_, vIdx) => {
                              const item = items[vIdx % items.length];
                              const isActive = vIdx === wheelIndices.weapon;
                              // 只渲染可见区域附近的项，性能更好
                              if (Math.abs(vIdx - wheelIndices.weapon) > 4) return <div key={vIdx} className="h-[48px]" />;
                              return (
                                <div 
                                  key={vIdx}
                                  onClick={() => !isDeployed && setPlayer(prev => ({ ...prev, equipment: { ...prev.equipment, weapon: item.name } }))}
                                  className={`h-[48px] flex items-center justify-center gap-4 px-3 transition-all duration-300 ${
                                    isActive ? 'text-white scale-110 opacity-100' : 'text-slate-500 opacity-40 scale-90'
                                  } ${isDeployed ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                                >
                                  <span className={isActive ? 'text-3xl' : 'text-xl'}>{item.icon}</span>
                                  <span className={`font-black truncate cn-text ${isActive ? 'text-base' : 'text-sm'}`}>{item.name}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* 防具选择器 */}
                <div className="flex flex-col gap-2 min-h-0">
                  <label className="text-[10px] text-slate-500 font-bold cn-text uppercase tracking-tight">防御规格 / ARMOR</label>
                  <div className="flex-1 flex flex-col min-h-0">
                    {(() => {
                      const items = ITEMS.armors.filter(i => player.unlockedItems[i.name]);
                      const currentIdx = items.findIndex(i => i.name === player.equipment.armor);
                      const itemHeight = 48;
                      
                      return (
                        <div 
                          onWheel={(e) => {
                            if (isDeployed) return;
                            const now = Date.now();
                            if (now - lastWheelTime.current < 400) return;
                            lastWheelTime.current = now;
                            
                            const items = ITEMS.armors.filter(i => player.unlockedItems[i.name]);
                            const direction = e.deltaY > 0 ? 1 : -1;
                            const newIdx = wheelIndices.armor + direction;
                            
                            setWheelIndices(prev => ({ ...prev, armor: newIdx }));
                            const realIdx = (newIdx % items.length + items.length) % items.length;
                            setPlayer(prev => ({ ...prev, equipment: { ...prev.equipment, armor: items[realIdx].name } }));
                          }}
                          className="flex-1 relative overflow-hidden group/picker border border-slate-800 bg-slate-950/50 rounded"
                        >
                          <div className="absolute inset-0 flex flex-col pointer-events-none z-10">
                            <div className="flex-1 bg-gradient-to-b from-slate-950/90 via-slate-950/20 to-transparent"></div>
                            <div className="h-[48px] border-y border-emerald-500/30 bg-emerald-500/5"></div>
                            <div className="flex-1 bg-gradient-t from-slate-950/90 via-slate-950/20 to-transparent"></div>
                          </div>
                          <div 
                            className="absolute left-0 right-0 transition-transform duration-500 cubic-bezier(0.2, 0.8, 0.2, 1)"
                            style={{ 
                              top: '50%',
                              marginTop: '-24px',
                              transform: `translateY(${-wheelIndices.armor * 48}px)`
                            }}
                          >
                            {Array.from({ length: 120 }).map((_, vIdx) => {
                              const item = items[vIdx % items.length];
                              const isActive = vIdx === wheelIndices.armor;
                              if (Math.abs(vIdx - wheelIndices.armor) > 4) return <div key={vIdx} className="h-[48px]" />;
                              return (
                                <div 
                                  key={vIdx}
                                  onClick={() => !isDeployed && setPlayer(prev => ({ ...prev, equipment: { ...prev.equipment, armor: item.name } }))}
                                  className={`h-[48px] flex items-center justify-center gap-4 px-3 transition-all duration-300 ${
                                    isActive ? 'text-white scale-110 opacity-100' : 'text-slate-500 opacity-40 scale-90'
                                  } ${isDeployed ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                                >
                                  <span className={isActive ? 'text-3xl' : 'text-xl'}>{item.icon}</span>
                                  <span className={`font-black truncate cn-text ${isActive ? 'text-base' : 'text-sm'}`}>{item.name}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* 技能选择器 */}
                <div className="flex flex-col gap-2 min-h-0">
                  <label className="text-[10px] text-slate-500 font-bold cn-text uppercase tracking-tight">核心逻辑 / SKILL</label>
                  <div className="flex-1 flex flex-col min-h-0">
                    {(() => {
                      const items = ITEMS.skills.filter(i => player.unlockedItems[i.name]);
                      const currentIdx = items.findIndex(i => i.name === player.equipment.skill);
                      const itemHeight = 48;
                      
                      return (
                        <div 
                          onWheel={(e) => {
                            if (isDeployed) return;
                            const now = Date.now();
                            if (now - lastWheelTime.current < 400) return;
                            lastWheelTime.current = now;
                            
                            const items = ITEMS.skills.filter(i => player.unlockedItems[i.name]);
                            const direction = e.deltaY > 0 ? 1 : -1;
                            const newIdx = wheelIndices.skill + direction;
                            
                            setWheelIndices(prev => ({ ...prev, skill: newIdx }));
                            const realIdx = (newIdx % items.length + items.length) % items.length;
                            setPlayer(prev => ({ ...prev, equipment: { ...prev.equipment, skill: items[realIdx].name } }));
                          }}
                          className="flex-1 relative overflow-hidden group/picker border border-slate-800 bg-slate-950/50 rounded"
                        >
                          <div className="absolute inset-0 flex flex-col pointer-events-none z-10">
                            <div className="flex-1 bg-gradient-to-b from-slate-950/90 via-slate-950/20 to-transparent"></div>
                            <div className="h-[48px] border-y border-amber-500/50 bg-amber-500/10"></div>
                            <div className="flex-1 bg-gradient-t from-slate-950/90 via-slate-950/20 to-transparent"></div>
                          </div>
                          <div 
                            className="absolute left-0 right-0 transition-transform duration-500 cubic-bezier(0.2, 0.8, 0.2, 1)"
                            style={{ 
                              top: '50%',
                              marginTop: '-24px',
                              transform: `translateY(${-wheelIndices.skill * 48}px)`
                            }}
                          >
                            {Array.from({ length: 120 }).map((_, vIdx) => {
                              const item = items[vIdx % items.length];
                              const isActive = vIdx === wheelIndices.skill;
                              if (Math.abs(vIdx - wheelIndices.skill) > 4) return <div key={vIdx} className="h-[48px]" />;
                              return (
                                <div 
                                  key={vIdx}
                                  onClick={() => !isDeployed && setPlayer(prev => ({ ...prev, equipment: { ...prev.equipment, skill: item.name } }))}
                                  className={`h-[48px] flex items-center justify-center gap-4 px-3 transition-all duration-300 ${
                                    isActive ? 'text-white scale-110 opacity-100' : 'text-slate-500 opacity-40 scale-90'
                                  } ${isDeployed ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                                >
                                  <span className={isActive ? 'text-3xl' : 'text-xl'}>{item.icon}</span>
                                  <span className={`font-black truncate cn-text ${isActive ? 'text-base' : 'text-sm'}`}>{item.name}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>

            {/* 操作控制 (右侧) */}
            <div className="w-[300px] flex flex-col gap-2">
              {!isDeployed ? (
                <button onClick={startRound} className="flex-1 pixel-button success !p-0 text-lg shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                  执行任务部署 / START
                </button>
              ) : (
                <div className="flex-1 pixel-card bg-slate-900 flex items-center justify-center text-slate-400 font-bold italic animate-pulse border-indigo-500/30 text-sm cn-text">
                  同步中... SYNCING
                </div>
              )}
              <button onClick={() => { setGameState('lobby'); resetGame(); }} className="flex-1 text-xs font-black text-rose-400 hover:text-white hover:bg-rose-500/20 border border-rose-500/30 transition-all uppercase tracking-wide cn-text">
                中止任务 / ABORT
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* --- BASE INTERFACE (Lobby/Shop/Tactics) --- */
        <div className="flex flex-col h-full p-4 gap-4 animate-in fade-in duration-500">
          {/* HEADER */}
          <div className="flex justify-between items-center bg-slate-900 border-4 border-slate-800 px-8 py-5 shadow-lg flex-none">
            <div className="flex items-center gap-16">
              <div className="flex flex-col"><span className="text-xs font-bold text-slate-500 uppercase mb-1 tracking-tighter">档案代号 / PROFILE</span><span className="text-xl font-black tracking-widest">{player.username}</span></div>
              <div className="flex flex-col items-center"><span className="text-xs text-slate-400 font-bold uppercase mb-1 tracking-tighter">同步等级 / LINK LEVEL</span><span className="text-2xl font-black text-indigo-500">LV.{player.level}</span></div>
              <div className="text-right"><span className="text-xs text-slate-400 font-bold uppercase block mb-1 tracking-tighter">信用余额 / CREDITS</span><span className="text-2xl font-black text-amber-500 leading-none">₿ {player.gold}</span></div>
            </div>
            <div className="flex gap-4">
              <button onClick={() => {
                resetGame();
                setGameState('battle');
              }} className="pixel-button success text-lg px-16 shadow-[0_0_40px_rgba(16,185,129,0.3)]">执行任务部署 / DEPLOY</button>
            </div>
          </div>

          <div className="flex-1 flex gap-4 min-h-0">
            {/* LEFT MAIN PANEL */}
            <div className="flex-1 pixel-card flex flex-col gap-6 overflow-hidden relative">
              {/* 放大模糊的主角背影背景 */}
              <div className="absolute inset-0 pointer-events-none opacity-80" style={{
                backgroundImage: "url(" + (player.equipment.weapon.includes('锤') ? '/cyborg_ninja_hammer.png' : '/cyborg_ninja_clean_bg.png') + ")",
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                filter: 'blur(10px)',
                zIndex: 0
              }}></div>

              {gameState === 'lobby' && (
                <div className="h-full flex gap-6 p-4 overflow-hidden relative z-10">
                  {/* 1. 左侧：参数与装载 (STATS & LOADOUT) */}
                  <div className="w-[340px] flex flex-col gap-4">
                    {/* 属性面板 */}
                    <div className="pixel-card bg-slate-900/80 p-6 flex-none">
                      <div className="flex justify-between items-end border-b-2 border-indigo-500/30 pb-2 mb-4">
                        <h2 className="text-sm font-black italic text-indigo-400 uppercase tracking-widest">参数调优 / TUNING</h2>
                        <span className="text-[10px] text-slate-500">POINTS: {player.statPoints}</span>
                      </div>
                      <div className="space-y-4">
                        {(['strength', 'agility', 'constitution'] as Stat[]).map(s => (
                          <div key={s} className="flex items-center justify-between group">
                            <div className="flex flex-col">
                              <span className="text-[10px] text-slate-500 font-bold uppercase">{s === 'strength' ? '力量' : s === 'agility' ? '敏捷' : '体质'} / {s}</span>
                              <span className="text-2xl font-black text-white">{player.stats[s]}</span>
                            </div>
                            {player.statPoints > 0 && (
                              <button onClick={() => handleLevelUp(s)} className="w-10 h-10 bg-indigo-600/20 border-2 border-indigo-500 text-indigo-400 font-black hover:bg-indigo-600 hover:text-white transition-all active:scale-90">▲</button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 装备列表 */}
                    <div className="pixel-card bg-slate-900/80 p-6 flex-1 overflow-hidden flex flex-col">
                      <div className="flex justify-between items-end border-b-2 border-slate-800 pb-2 mb-4">
                        <h2 className="text-sm font-black italic text-slate-400 uppercase tracking-widest">当前载荷 / LOADOUT</h2>
                      </div>
                      <div className="space-y-6 overflow-y-auto custom-scrollbar pr-2">
                        <div className="border-l-4 border-amber-500 pl-4 py-2 bg-amber-500/5">
                          <p className="text-[10px] text-slate-500 uppercase font-bold">攻击链路 / WEAPON</p>
                          <p className="text-lg font-black text-amber-500">{player.equipment.weapon || '空'}</p>
                        </div>
                        <div className="border-l-4 border-cyan-500 pl-4 py-2 bg-cyan-500/5">
                          <p className="text-[10px] text-slate-500 uppercase font-bold">防护链路 / ARMOR</p>
                          <p className="text-lg font-black text-cyan-500">{player.equipment.armor || '空'}</p>
                        </div>
                        <div className="border-l-4 border-indigo-500 pl-4 py-2 bg-indigo-500/5">
                          <p className="text-[10px] text-slate-500 uppercase font-bold">核心逻辑 / SKILL</p>
                          <p className="text-lg font-black text-indigo-500">{player.equipment.skill || '空'}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 2. 中央：英雄全息交互 (HERO HOLOGRAPHIC) */}
                  <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden bg-[radial-gradient(circle_at_center,_rgba(99,102,241,0.08)_0%,_transparent_70%)]">


                    {/* 扫描线背景效果 */}
                    <div className="absolute inset-0 pointer-events-none opacity-20" style={{ background: 'linear-gradient(rgba(18,16,16,0) 50%,rgba(0,0,0,0.25) 50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))', backgroundSize: '100% 4px, 3px 100%' }}></div>

                    <div className="hero-platform absolute top-[360px] w-80 h-16 bg-indigo-500/20 rounded-[100%] blur-2xl animate-pulse border-t border-indigo-500/40"></div>

                    {/* 实时渲染 Canvas */}
                    <div className="relative z-10 animate-in zoom-in-90 duration-700 mt-[100px]">
                      <canvas ref={lobbyCanvasRef} width={600} height={700} className="drop-shadow-[0_0_25px_rgba(99,102,241,0.4)]" />

                      {/* 浮动交互节点 (Hotspots) - 强化引导 */}
                      <div className="absolute inset-0 pointer-events-none">
                        {/* 动态精准引导线 */}
                        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                          <defs>
                            <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.8" />
                              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.1" />
                            </linearGradient>
                            <linearGradient id="lineGradRev" x1="100%" y1="0%" x2="0%" y2="0%">
                              <stop offset="0%" stopColor="#f97316" stopOpacity="0.8" />
                              <stop offset="100%" stopColor="#f97316" stopOpacity="0.1" />
                            </linearGradient>
                          </defs>
                          {/* Armor (Back): 从左上角指向后背区域 */}
                          <path d="M 120 150 L 260 220" stroke="url(#lineGrad)" strokeWidth="2" strokeDasharray="4 4" fill="none" className="animate-pulse" />
                          {/* Weapon (Left Hand): 再左移20px */}
                          <path d="M 360 400 L 310 430" stroke="url(#lineGradRev)" strokeWidth="2" strokeDasharray="4 4" fill="none" className="animate-pulse" />
                          {/* Skill (Core): 上移40px */}
                          <path d="M 100 480 L 290 350" stroke="url(#lineGrad)" strokeWidth="2" strokeDasharray="4 4" fill="none" className="animate-pulse" />
                        </svg>

                        {/* 头部：防护 (后背位置) */}
                        <div onClick={() => setShopTab('armors')} className="pointer-events-auto absolute top-[100px] left-[60px] w-24 h-24 rounded-full cursor-pointer group/h">
                          <div className="absolute inset-0 border border-cyan-500/30 rounded-full animate-[ping_3s_linear_infinite]"></div>
                          <div className="absolute inset-0 border-2 border-cyan-500/20 rounded-full flex items-center justify-center">
                            <div className="w-1 h-1 bg-cyan-400 rounded-full shadow-[0_0_10px_#22d3ee]"></div>
                          </div>
                          <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex flex-col items-center">
                            <span className="text-[9px] text-cyan-400 font-black tracking-widest bg-slate-950/80 px-2 py-0.5 border border-cyan-500/50">ARMOR_SYSTEM</span>
                            <div className="w-[1px] h-4 bg-cyan-500/50"></div>
                          </div>
                        </div>

                        {/* 手臂：武器 (再左移20px -> right 从 140 增加到 160) */}
                        <div onClick={() => setShopTab('weapons')} className="pointer-events-auto absolute top-[300px] right-[160px] w-32 h-48 cursor-pointer group/w">
                          <div className="absolute inset-0 border-2 border-amber-500/10 rounded-lg animate-pulse"></div>
                          <div className="absolute -right-28 top-1/2 -translate-y-1/2 flex items-center flex-row-reverse">
                            <div className="flex flex-col items-start">
                              <span className="text-[9px] text-amber-500 font-black tracking-widest bg-slate-950/80 px-2 py-0.5 border border-amber-500/50">ATK_WEAPONRY</span>
                              <span className="text-[8px] text-amber-500/60 font-bold mt-1">CLICK_UPGRADE</span>
                            </div>
                            <div className="w-8 h-[1px] bg-amber-500/50 mr-2"></div>
                          </div>
                        </div>

                        {/* 核心：技能 (上移40px -> top 从 480 减到 440) */}
                        <div onClick={() => setShopTab('skills')} className="pointer-events-auto absolute top-[440px] left-[60px] w-16 h-16 cursor-pointer group/s">
                          <div className="absolute inset-0 bg-indigo-500/10 border-2 border-indigo-500/30 rounded-full animate-pulse shadow-[0_0_20px_rgba(99,102,241,0.4)]"></div>
                          <div className="absolute -bottom-14 left-1/2 -translate-x-1/2 flex flex-col items-center">
                            <div className="w-[1px] h-6 bg-indigo-500/50 mb-1"></div>
                            <span className="text-[9px] text-indigo-400 font-black tracking-widest bg-slate-950/80 px-2 py-0.5 border border-indigo-500/50 uppercase">Neural_Core</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 选中的部位升级菜单 (弹出层保持原有逻辑) */}
                    {shopTab && (
                      <div className="absolute inset-0 z-[1000] bg-slate-950/95 backdrop-blur-xl flex flex-col p-12 animate-in slide-in-from-bottom-8 duration-300 border-x border-slate-800">
                        <div className="flex justify-between items-center border-b-4 border-slate-800 pb-6 mb-8">
                          <h3 className="text-3xl font-black text-white italic uppercase tracking-tighter">
                            部位升级 / {(shopTab === 'weapons' ? '攻击链路' : (shopTab === 'armors' ? '防护链路' : '核心逻辑'))}
                          </h3>
                          <button className="pixel-button danger !py-2 !px-6" style={{ background: 'transparent', border: 'none', color: '#94a3b8', textDecoration: 'underline' }} onClick={() => setShopTab(null as any)}>关闭终端 / CLOSE</button>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar grid grid-cols-3 gap-6 pr-4">
                          {ITEMS[shopTab].map(item => (
                            <div key={item.name} className="pixel-card bg-slate-900 p-6 hover:border-indigo-500 transition-all group flex flex-col items-center">
                              <span className="text-6xl mb-6 group-hover:scale-110 transition-transform">{item.icon}</span>
                              <p className="text-lg font-black text-white mb-1 cn-text">{item.name}</p>
                              <p className="text-[10px] text-slate-500 uppercase mb-6 tracking-widest">{item.rarity}</p>
                              <button onClick={() => buyItem(item, shopTab as 'weapons' | 'armors' | 'skills')} className="w-full py-4 bg-indigo-600 text-sm font-black hover:bg-indigo-500 transition-colors shadow-lg cn-text">升级强化 / ₿{item.cost}</button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 3. 右侧：系统日志 (已被全局外层 Log 覆盖，此处移除) */}
                </div>
              )}
            </div>

            {/* RIGHT SIDEBAR - LOGS */}
            <div className="w-96 pixel-card flex flex-col bg-slate-900/50 backdrop-blur-sm">
              <h3 className="text-xs font-black text-slate-400 uppercase mb-4 border-b-4 border-slate-800 p-4 cn-text">任务数据流 / MISSION LOGS</h3>
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 p-4 text-[11px] font-mono">
                {battleLog.map((log, i) => (
                  <div key={i} className={"border-l-4 pl-3 py-1 " + (log.includes('任务完成') ? 'border-emerald-500 text-emerald-400' : log.includes('连接断开') ? 'border-rose-500 text-rose-400' : 'border-slate-700 text-slate-400')}>
                    <span className="opacity-30 mr-2">[{new Date().toLocaleTimeString([], { hour12: false })}]</span>
                    {log}
                  </div>
                ))}
                {battleLog.length === 0 && <div className="text-slate-700 italic">等待数据注入 / WAITING FOR DATA...</div>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. GLOBAL STYLES */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Outfit:wght@400;700;900&display=swap');

        /* 全局字体标准化 */
        :root {
          --pixel-font: 'Press Start 2P', cursive;
          --ui-font: 'Outfit', 'PingFang SC', 'Noto Sans SC', 'Microsoft YaHei', sans-serif;
          --cn-font: 'PingFang SC', 'Noto Sans SC', 'Microsoft YaHei', 'Outfit', sans-serif;
        }

        body { 
          background: #020617; 
          font-family: var(--ui-font);
          overflow: hidden; 
          -webkit-font-smoothing: antialiased;
          text-rendering: optimizeLegibility;
        }

        /* 中文专用字体类 —— 中文字符始终使用系统中文字体渲染 */
        .cn-text { font-family: var(--cn-font); }

        .pixel-font { font-family: var(--pixel-font); }
        
        /* 战斗页中文文本基准样式 */
        .battle-label {
          font-family: var(--cn-font);
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.02em;
        }
        .battle-value {
          font-family: var(--cn-font);
          font-size: 13px;
          font-weight: 900;
          letter-spacing: 0.01em;
        }
        .battle-log-text {
          font-family: var(--cn-font);
          font-size: 12px;
          line-height: 1.6;
          font-weight: 500;
        }
        
        .pixel-card { 
          background: #0f172a; 
          border: 4px solid #1e293b; 
          box-shadow: 8px 8px 0px #000; 
          position: relative;
        }
        
        /* 优化按钮：支持双语混排，字号加大 */
        .pixel-button { 
          background: #4f46e5; 
          border: 4px solid #000; 
          box-shadow: 4px 4px 0px #312e81; 
          color: white; 
          font-family: var(--ui-font);
          font-weight: 900;
          font-size: 13px; 
          padding: 0.8rem 1.8rem; 
          transition: all 0.1s; 
          cursor: pointer;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .pixel-button:active { transform: translate(2px, 2px); box-shadow: 2px 2px 0px #312e81; }
        .pixel-button.success { background: #10b981; box-shadow: 4px 4px 0px #065f46; }
        .pixel-button.danger { background: #ef4444; box-shadow: 4px 4px 0px #991b1b; }

        /* HUD 文字标准化 */
        .cyber-hud { display: flex; justify-content: space-between; align-items: flex-start; padding: 1.5rem 2.5rem; gap: 2rem; background: linear-gradient(to bottom, #020617, transparent); }
        .hud-unit { display: flex; gap: 24px; width: 33%; }
        .portrait-box { width: 84px; height: 84px; border: 4px solid #1e293b; box-shadow: 0 0 30px rgba(0, 242, 255, 0.15); image-rendering: pixelated; background: #000; }
        .bar-stack { flex: 1; display: flex; flex-direction: column; gap: 10px; }
        .unit-name { font-weight: 900; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #fff; }
        
        .pixel-bar-container { height: 26px; background: #000; border: 3px solid #1e293b; position: relative; overflow: hidden; }
        .pixel-bar-fill { height: 100%; transition: width 0.6s cubic-bezier(0.2, 0.8, 0.2, 1); }
        .bar-label { 
          position: absolute; right: 12px; top: 4px; 
          font-size: 11px; font-weight: 900;
          text-shadow: 2px 2px #000; color: #fff; 
          font-family: var(--ui-font);
        }
        
        .hud-info-center { flex: 1; text-align: center; background: rgba(15, 23, 42, 0.95); border: 4px solid #1e293b; padding: 12px; box-shadow: 0 0 40px rgba(0,0,0,0.8); }
        .round-text { font-family: var(--ui-font); font-size: 13px; font-weight: 900; color: #facc15; border-bottom: 2px solid #1e293b; padding-bottom: 10px; margin-bottom: 10px; letter-spacing: 1px; text-transform: uppercase; }

        .tactical-footer { display: flex; justify-content: space-between; padding: 2.5rem 3.5rem; background: #020617; border-top: 6px solid #1e293b; }
        .skill-list { display: flex; flex-direction: column; gap: 12px; }
        .skill-item { 
          font-weight: 900; font-size: 14px; color: #fff; cursor: pointer; 
          transition: all 0.2s; display: flex; align-items: center; 
        }
        .skill-item:hover { color: #00f2ff; text-shadow: 0 0 10px #00f2ff; transform: translateX(15px); }
        
        .stat-grid { display: grid; gap: 10px; text-align: right; }
        .stat-row { font-weight: 700; font-size: 12px; }
        .stat-label { color: #475569; }
        .stat-val { color: #facc15; }

        .image-pixelated { image-rendering: pixelated; }
        .custom-scrollbar { scrollbar-width: thin; scrollbar-color: #1e293b transparent; }
        
        @keyframes glow { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
        .glow-pixel { animation: glow 2s infinite; }
        
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes zoom-in-95 { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .animate-in { animation-fill-mode: forwards; }
        .fade-in { animation: fade-in 0.5s ease-out; }
        .zoom-in-95 { animation: zoom-in-95 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
      `}</style>
    </div>
  );
}

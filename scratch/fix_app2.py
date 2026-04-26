import codecs

with codecs.open('src/App.tsx', 'r', encoding='utf-8', errors='replace') as f:
    lines = f.readlines()

new_lines = []
skip = False

items_block = """  { id: 'desert', name: '荒漠戈壁', desc: '黄沙漫天，视野极度受限。', effect: '远程武器 -30%，能量武器 +20%。', bgColor: '#451a03', accentColor: '#fbbf24' }
];

const ITEMS = {
  weapons: [
    { name: '长剑', damage: 15, icon: '⚔️', desc: '基础近战武器', story: '旧时代的钢刃，虽已锈迹斑斑，但其冰冷的触感依然能唤醒战士的本能。', cost: 50, rarity: 'common', tag: 'slashing' },
    { name: '名刀', damage: 32, icon: '🎋', desc: '锋利的特制刀具', story: '由深山隐士打造，刀身覆盖着纳米级的锋利涂层，挥动时仿佛能切断风的声音。', cost: 150, rarity: 'novel', levelReq: 3, tag: 'slashing' },
    { name: '影刃', damage: 130, icon: '🔪', desc: '无视防御的次元武器', story: '从虚空裂缝中提取的物质锻造而成，它不切割肉体，而是直接撕裂目标的现实存在感。', cost: 8500, rarity: 'epic', levelReq: 40, tag: 'slashing' },

    { name: '长弓', damage: 12, icon: '🏹', desc: '基础远程武器', story: '复合碳纤维材质，轻盈而强韧，是荒野猎人在静谧夜晚最可靠的伙伴。', cost: 50, rarity: 'common', tag: 'piercing' },
    { name: '战术弩', damage: 28, icon: '🎯', desc: '带辅助瞄准的连发弩', story: '黑市中流通的高级货，配备了简易的弹道辅助芯片，即使是新手也能打出精准的齐射。', cost: 200, rarity: 'novel', levelReq: 5, tag: 'piercing' },
    { name: '神龙弓', damage: 55, icon: '🐉', desc: '附带能量冲击的强弓', story: '传闻弓身封印了上古数字生命的意识，每一支射出的箭矢都带着震慑灵魂的咆哮。', cost: 600, rarity: 'perfect', levelReq: 12, tag: 'piercing' },

    { name: '重锤', damage: 25, icon: '🔨', desc: '沉重的破坏武器', story: '纯粹的质量，纯粹的破坏。在它面前，任何精密的防御结构都显得滑稽可笑。', cost: 60, rarity: 'common', tag: 'crushing' },
    { name: '动力锤', damage: 48, icon: '🚜', desc: '附带震荡波的动力锤', story: '内置了液压增压系统，击中目标的瞬间会释放出强烈的震荡波，粉碎一切阻碍。', cost: 450, rarity: 'novel', levelReq: 8, tag: 'crushing' },
    { name: '雷神锤', damage: 150, icon: '⚡', desc: '附带雷电伤害的终极巨锤', story: '众神之怒的数字化体现。挥动它时，空气中会充满电离的焦灼味，将敌人化为焦炭。', cost: 4500, rarity: 'epic', levelReq: 25, tag: 'crushing' },

    { name: '热能刀', damage: 18, icon: '🔥', desc: '高温切割武器', story: '刀刃边缘维持着千度高温，能够像切黄油一样切开最坚固的复合装甲。', cost: 80, rarity: 'common', tag: 'energy' },
    { name: '等离子炮', damage: 75, icon: '🎇', desc: '微型黑洞发生器', story: '手持式核聚变发生器，发射出的等离子团会在触敌瞬间引发微型黑洞坍缩。', cost: 1200, rarity: 'perfect', levelReq: 18, tag: 'energy' },
    { name: '激光剑', damage: 180, icon: '🔦', desc: '无视物理防御的光束剑', story: '纯净的能量凝聚成束。它没有实体，却能跨越物理世界的限制，斩断因果。', cost: 12000, rarity: 'epic', levelReq: 30, tag: 'energy' },
  ] as Item[],
  armors: [
    { name: '布衣', defense: 0, evasion: 0, icon: '👕', desc: '无任何防护效果', story: '在这个钢铁森林里，这层薄薄的纤维更像是一种心理安慰，而非实际保护。', cost: 40, rarity: 'common', tag: 'light' },
    { name: '披风', defense: 3, evasion: 20, icon: '🧥', desc: '轻微防御，较高闪避', story: '特种纤维织就，能在高速移动时产生视觉残影，让敌人的准星永远慢你一步。', cost: 60, rarity: 'common', tag: 'light' },
    { name: '潜行隐装', defense: 15, evasion: 45, icon: '🕴️', desc: '极高闪避，中等防御', story: '整合了最新的多光谱折射单元，只要你不主动现身，你就是夜色本身。', cost: 800, rarity: 'novel', levelReq: 4, tag: 'light' },

    { name: '凯夫拉', defense: 8, evasion: 0, icon: '🥋', desc: '基础物理防御', story: '经典的防御方案，可靠且坚韧。它曾无数次在致命伤前挽救了佣兵的性命。', cost: 50, rarity: 'common', tag: 'medium' },
    { name: '动力装甲', defense: 45, evasion: 5, icon: '🤖', desc: '提供护甲和轻微闪避', story: '沉重的外骨骼不仅能吸收伤害，更赋予了穿戴者超越凡人的怪力。', cost: 500, rarity: 'novel', levelReq: 5, tag: 'medium' },
    { name: '虚空甲', defense: 95, evasion: 10, icon: '🌌', desc: '极高护甲与中等闪避', story: '表面覆盖着一层活动的暗物质，能将物理打击转变为无害的引力波发散。', cost: 2000, rarity: 'perfect', levelReq: 15, tag: 'medium' },

    { name: '铁盾', defense: 12, evasion: -5, icon: '🛡️', desc: '降低少许闪避以换取防御', story: '朴实无华的铁板，但在绝望的战场上，它是生与死之间最后的一道界限。', cost: 60, rarity: 'common', tag: 'heavy' },
    { name: '合金护板', defense: 35, evasion: -10, icon: '⛓️', desc: '高强度防弹挡板', story: '实验室合成的高强度钢材，即使面对反器材狙击枪的攒射也依然屹立不倒。', cost: 400, rarity: 'novel', levelReq: 7, tag: 'heavy' },
    { name: '复合重装', defense: 220, evasion: -20, icon: '🚜', desc: '牺牲大量闪避换取绝对防御', story: '一整套移动防御系统，穿戴它意味着你放弃了灵活，换取了绝对的生存。', cost: 8000, rarity: 'perfect', levelReq: 22, tag: 'heavy' },

    { name: '干扰烟幕', defense: 5, evasion: 15, icon: '💨', desc: '战术掩体装备', story: '释放出的纳米云雾会干扰所有的雷达与视讯探测，创造出混乱的生存空间。', cost: 70, rarity: 'common', tag: 'field' },
    { name: '纳米蜂群', defense: 50, evasion: 60, icon: '🐝', desc: '自动拦截飞行物', story: '数以亿计的微型机器人围绕着你飞行，它们会自动寻找并摧毁飞来的投射物。', cost: 6500, rarity: 'epic', levelReq: 35, tag: 'field' },
    { name: '反物质盾', defense: 350, evasion: -15, icon: '💠', desc: '终极力场防护', story: '通过消耗反物质电池产生的排斥力场，是人类技术能够达到的防御巅峰。', cost: 15000, rarity: 'epic', levelReq: 60, tag: 'field' },
  ] as Item[],
  skills: [
    { name: '蓄能重击', mult: 1.8, icon: '💥', desc: '牺牲攻速换取爆发，附加100%力量伤害', story: '引导全身的生物能量于一瞬爆发。这一拳，包含了对命运所有的愤怒。', cost: 100, rarity: 'common', tag: 'crushing' },
    { name: '幻影连击', mult: 0.8, icon: '⚡', desc: '极速二次打击，敏捷大幅增幅伤害', story: '通过超频神经突触，让肌肉在极短时间内完成两次打击，速度之快肉眼难辨。', cost: 300, rarity: 'novel', levelReq: 5, tag: 'slashing' },
    { name: '弱点扫描', mult: 1.2, icon: '🔍', desc: '解析对手防御，强制无视抗性修正', story: '开启眼部的扫描阵列，实时计算对手装甲的最薄弱点，执行精准的打击。', cost: 800, rarity: 'perfect', levelReq: 12, tag: 'piercing' },
    { name: '神经修复', mult: 0, icon: '✨', desc: '生物纳米修复，基于体质大量回血', story: '注射纳米医疗凝胶，这些微小的医生会自动修复受损的器官与回路，带你重返巅峰。', cost: 500, rarity: 'novel', levelReq: 8, tag: 'light' },
    { name: '动能反射', mult: 0.5, icon: '🛡️', desc: '构建反击护盾，反弹受到的50%伤害', story: '利用能量守恒原理，将受到的冲击力储存并反弹，让敌人品尝自己的力量。', cost: 2000, rarity: 'perfect', levelReq: 20, tag: 'heavy' },
    { name: '系统过载', mult: 3.5, icon: '☢️', desc: '极限超频，极高伤害但会反噬自身', story: '撤除所有的安全限制，释放核心全部的原始能量。这是最后的孤注一掷。', cost: 10000, rarity: 'epic', levelReq: 45, tag: 'energy' },
  ] as Item[]
};
"""

for i, line in enumerate(lines):
    if "  { id: 'desert', name: '荒漠戈壁'" in line:
        skip = True
        new_lines.append(items_block)
    
    if skip and "const INITIAL_CHAR:" in line:
        skip = False

    if not skip:
        new_lines.append(line)

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)


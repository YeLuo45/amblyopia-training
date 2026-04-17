export interface User {
  id: string;
  phone?: string;
  email?: string;
  nickname?: string;
  avatar?: string;
  role: 'parent' | 'doctor' | 'admin';
}

export interface Family {
  id: string;
  name: string;
  owner_id: string;
}

export interface Child {
  id: string;
  family_id: string;
  name: string;
  gender: 'male' | 'female' | 'other';
  birth_date?: string;
  avatar?: string;
  eye_condition: 'refractive' | 'strabismic' | 'deprivation' | 'mixed' | 'unknown';
  diagnosis_date?: string;
  treatment_phase: 'initial' | 'intensive' | 'maintenance';
  age?: number;
}

export interface TrainingPlan {
  id: string;
  child_id: string;
  plan_name: string;
  phase: 'initial' | 'intensive' | 'maintenance';
  daily_duration: number;
  weekly_frequency: number;
  spatial_frequency_level: 'low' | 'medium' | 'high';
  training_mode: 'monocular' | 'binocular';
  dominant_eye: 'left' | 'right' | 'both';
  allowed_games: string[];
  is_active: boolean;
}

export interface GameConfig {
  id: string;
  child_id: string;
  game_id: string;
  spatial_frequency: 'low' | 'medium' | 'high';
  contrast: 'low' | 'medium' | 'high';
  target_size: 'small' | 'medium' | 'large';
  speed: 'slow' | 'medium' | 'fast';
  is_enabled: boolean;
  // Phase 3: background scene
  background_id?: string;
}

export interface GameDefinition {
  id: string;
  name: string;
  name_cn: string;
  type: string;
  training_types: string[];
  modes: ('monocular' | 'binocular')[];
  spatial_frequencies: ('low' | 'medium' | 'high')[];
  description: string;
  min_age: number;
  max_age: number;
  // Phase 3: target score for goal-based ending
  target_score?: number;
}

export interface TrainingSession {
  id: string;
  child_id: string;
  game_id: string;
  game_name?: string;
  game_name_cn?: string;
  training_mode: 'monocular' | 'binocular';
  dominant_eye: 'left' | 'right' | 'both';
  spatial_frequency: 'low' | 'medium' | 'high';
  score: number;
  duration: number;
  accuracy: number;
  combo_max: number;
  level_completed: number;
  started_at: string;
  ended_at?: string;
}

export interface ProgressData {
  period: string;
  session_count: number;
  total_duration: number;
  avg_score: number;
  avg_accuracy: number;
  max_score: number;
}

export interface GameResult {
  score: number;
  duration: number;
  accuracy: number;
  comboMax: number;
  levelCompleted: number;
}

// Spatial frequency values in cyc/deg
export const SPATIAL_FREQUENCY_VALUES: Record<string, number> = {
  low: 0.5,
  medium: 2.0,
  high: 4.0,
};

export const SPATIAL_FREQUENCY_LABELS: Record<string, string> = {
  low: '低频 (0.5 cyc/deg)',
  medium: '中频 (2.0 cyc/deg)',
  high: '高频 (4.0 cyc/deg)',
};

// Phase 3: Available background scenes
export interface BackgroundScene {
  id: string;
  name: string;
  name_cn: string;
  emoji: string;
  description: string;
  // CSS gradient or pattern type
  type: 'gradient' | 'pattern' | 'image';
  colors?: string[];
  patternType?: 'stripes' | 'grid' | 'dots' | 'wave' | 'none';
}

export const BACKGROUND_SCENES: BackgroundScene[] = [
  {
    id: 'default-dark',
    name: 'Default Dark',
    name_cn: '默认深蓝',
    emoji: '🌙',
    description: '深蓝星空背景（默认）',
    type: 'gradient',
    colors: ['#1a1a2e', '#16213e', '#0f3460'],
  },
  {
    id: 'forest',
    name: 'Forest Adventure',
    name_cn: '森林冒险',
    emoji: '🌲',
    description: '绿色森林场景',
    type: 'gradient',
    colors: ['#1B4332', '#2D6A4F', '#40916C'],
    patternType: 'dots',
  },
  {
    id: 'ocean',
    name: 'Ocean World',
    name_cn: '海洋世界',
    emoji: '🌊',
    description: '蓝色海洋场景',
    type: 'gradient',
    colors: ['#023E8A', '#0077B6', '#00B4D8'],
    patternType: 'wave',
  },
  {
    id: 'sunset',
    name: 'Sunny Sunset',
    name_cn: '夕阳晚霞',
    emoji: '🌅',
    description: '温暖夕阳场景',
    type: 'gradient',
    colors: ['#FF6B6B', '#FEC89A', '#FFD93D'],
    patternType: 'none',
  },
  {
    id: 'space',
    name: 'Space Star',
    name_cn: '星际太空',
    emoji: '🚀',
    description: '太空星星场景',
    type: 'gradient',
    colors: ['#10002b', '#240046', '#3C096C'],
    patternType: 'dots',
  },
  {
    id: 'candy',
    name: 'Candy Land',
    name_cn: '糖果乐园',
    emoji: '🍬',
    description: '卡通糖果色场景',
    type: 'gradient',
    colors: ['#FF9AE5', '#FFC6FF', '#FFFFFC'],
    patternType: 'dots',
  },
];

// Default background
export const DEFAULT_BACKGROUND_ID = 'default-dark';

// Game target scores (goal-based ending)
export const GAME_TARGET_SCORES: Record<string, number> = {
  'stripe-chase': 300,
  'dot-pop': 400,
  'memory-flip': 350,
  'fusion-puzzle': 300,
  'draw-line': 350,
  'accommodation-lift': 320,
  'sf-matching': 380,
  'depth-blocks': 350,
  'visual-search-maze': 300,
  'quick-match': 400,
};

export const GAMES: GameDefinition[] = [
  {
    id: 'stripe-chase',
    name: 'Stripe Chase',
    name_cn: '条纹追踪',
    type: 'visual-tracking',
    training_types: ['visual-tracking', 'eye-hand-coordination'],
    modes: ['monocular', 'binocular'],
    spatial_frequencies: ['low', 'medium', 'high'],
    description: '追踪移动的条栅背景和目标物，训练视觉追踪能力',
    min_age: 3,
    max_age: 6,
    target_score: 300,
  },
  {
    id: 'dot-pop',
    name: 'Dot Pop',
    name_cn: '光斑消消乐',
    type: 'eye-hand-coordination',
    training_types: ['eye-hand-coordination', 'contrast-sensitivity'],
    modes: ['monocular', 'binocular'],
    spatial_frequencies: ['low', 'medium', 'high'],
    description: '点击指定颜色的光斑，训练精细定位能力',
    min_age: 3,
    max_age: 6,
    target_score: 400,
  },
  {
    id: 'fusion-puzzle',
    name: 'Fusion Puzzle',
    name_cn: '融合小拼图',
    type: 'fusion',
    training_types: ['binocular-fusion'],
    modes: ['binocular'],
    spatial_frequencies: ['medium', 'high'],
    description: '通过分视图片训练双眼融合功能',
    min_age: 4,
    max_age: 6,
    target_score: 300,
  },
  {
    id: 'memory-flip',
    name: 'Memory Flip',
    name_cn: '记忆翻翻卡',
    type: 'visual-cognition',
    training_types: ['visual-memory', 'short-term-memory'],
    modes: ['monocular', 'binocular'],
    spatial_frequencies: ['low', 'medium'],
    description: '记忆卡片位置，训练视觉认知和短期记忆',
    min_age: 3,
    max_age: 6,
    target_score: 350,
  },
  {
    id: 'draw-line',
    name: 'Draw the Line',
    name_cn: '眼手画线',
    type: 'eye-hand-coordination',
    training_types: ['eye-hand-coordination', 'fine-motor'],
    modes: ['monocular', 'binocular'],
    spatial_frequencies: ['low', 'medium'],
    description: '沿路径绘制，训练手眼协调',
    min_age: 3,
    max_age: 6,
    target_score: 350,
  },
  {
    id: 'accommodation-lift',
    name: 'Accommodation Lift',
    name_cn: '调节升降台',
    type: 'accommodation',
    training_types: ['accommodation', 'focus-flexibility'],
    modes: ['monocular', 'binocular'],
    spatial_frequencies: ['low', 'medium', 'high'],
    description: '通过目标远近变化训练调节幅度',
    min_age: 4,
    max_age: 6,
    target_score: 320,
  },
  {
    id: 'sf-matching',
    name: 'SF Matching',
    name_cn: 'SF连连看',
    type: 'spatial-frequency',
    training_types: ['spatial-frequency', 'contrast-sensitivity'],
    modes: ['monocular', 'binocular'],
    spatial_frequencies: ['low', 'medium', 'high'],
    description: '匹配不同空间频率的条纹图案',
    min_age: 4,
    max_age: 6,
    target_score: 380,
  },
  {
    id: 'depth-blocks',
    name: 'Depth Blocks',
    name_cn: '立体积木拼',
    type: 'stereopsis',
    training_types: ['stereopsis', 'depth-perception'],
    modes: ['binocular'],
    spatial_frequencies: ['medium', 'high'],
    description: '通过红蓝分视训练立体视功能',
    min_age: 4,
    max_age: 6,
    target_score: 350,
  },
  {
    id: 'visual-search-maze',
    name: 'Visual Search Maze',
    name_cn: '视觉搜索迷宫',
    type: 'visual-search',
    training_types: ['visual-search', 'saccade'],
    modes: ['monocular', 'binocular'],
    spatial_frequencies: ['low', 'medium'],
    description: '在复杂背景中搜索路径，训练扫视功能',
    min_age: 4,
    max_age: 6,
    target_score: 300,
  },
  {
    id: 'quick-match',
    name: 'Quick Match',
    name_cn: '快速对对碰',
    type: 'alternating-suppression',
    training_types: ['alternating-suppression', 'cognitive-speed'],
    modes: ['binocular'],
    spatial_frequencies: ['low', 'medium'],
    description: '快速交替显示图像，训练双眼协调',
    min_age: 5,
    max_age: 6,
    target_score: 400,
  },
];

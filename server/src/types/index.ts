export interface User {
  id: string;
  phone?: string;
  email?: string;
  password_hash: string;
  nickname?: string;
  avatar?: string;
  wechat_union_id?: string;
  wechat_open_id?: string;
  role: 'parent' | 'doctor' | 'admin';
  created_at: Date;
  updated_at: Date;
}

export interface Family {
  id: string;
  name?: string;
  owner_id: string;
  created_at: Date;
  updated_at: Date;
}

export interface Child {
  id: string;
  family_id: string;
  name: string;
  gender: 'male' | 'female' | 'other';
  birth_date?: Date;
  avatar?: string;
  eye_condition: 'refractive' | 'strabismic' | 'deprivation' | 'mixed' | 'unknown';
  diagnosis_date?: Date;
  treatment_phase: 'initial' | 'intensive' | 'maintenance';
  created_at: Date;
  updated_at: Date;
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
  start_date?: Date;
  end_date?: Date;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface TrainingSession {
  id: string;
  child_id: string;
  plan_id?: string;
  game_id: string;
  training_mode: 'monocular' | 'binocular';
  dominant_eye: 'left' | 'right' | 'both';
  spatial_frequency: 'low' | 'medium' | 'high';
  score: number;
  duration: number;
  accuracy: number;
  combo_max: number;
  level_completed: number;
  game_config: Record<string, unknown>;
  started_at: Date;
  ended_at?: Date;
  created_at: Date;
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
  background_id?: string; // Phase 3: background scene id
  created_at: Date;
  updated_at: Date;
}

// Game definitions
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
}

export const GAMES: GameDefinition[] = [
  {
    id: 'stripe-chase',
    name: 'Stripe Chase',
    name_cn: '条纹追踪',
    type: 'visual-tracking',
    training_types: ['visual-tracking', 'eye-hand-coordination'],
    modes: ['monocular', 'binocular'],
    spatial_frequencies: ['low', 'medium', 'high'],
    description: '通过追踪移动的条栅背景和目标物，训练视觉追踪能力',
    min_age: 3,
    max_age: 6,
  },
  {
    id: 'dot-pop',
    name: 'Dot Pop',
    name_cn: '光斑消消乐',
    type: 'eye-hand-coordination',
    training_types: ['eye-hand-coordination', 'contrast-sensitivity'],
    modes: ['monocular', 'binocular'],
    spatial_frequencies: ['low', 'medium', 'high'],
    description: '在高对比度背景上点击指定颜色的光斑，训练精细定位能力',
    min_age: 3,
    max_age: 6,
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
  },
  {
    id: 'memory-flip',
    name: 'Memory Flip',
    name_cn: '记忆翻翻卡',
    type: 'visual-cognition',
    training_types: ['visual-memory', 'short-term-memory'],
    modes: ['monocular', 'binocular'],
    spatial_frequencies: ['low', 'medium'],
    description: '通过记忆卡片位置训练视觉认知和短期记忆',
    min_age: 3,
    max_age: 6,
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
  },
];

// Spatial frequency values in cyc/deg
export const SPATIAL_FREQUENCY_VALUES = {
  low: 0.5,
  medium: 2.0,
  high: 4.0,
};

// Contrast values (Michelson contrast)
export const CONTRAST_VALUES = {
  low: 0.10,
  medium: 0.40,
  high: 0.80,
};

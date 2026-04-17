# 技术方案：弱视训练Web应用

- `Proposal ID`: `P-20260412-001`
- `PRD Path`: `C:\Users\YeZhimin\.openclaw\workspace-pm\proposals\2026-04-12-amblyopia-training-prd.md`
- `Technical Solution`: 本文档
- `Status`: `approved_for_dev`
- `Last Update`: 2026-04-12

---

## 一、技术架构总览

### 1.1 技术栈

| 层级 | 技术选型 |
|------|----------|
| 前端框架 | React 18 + TypeScript |
| 后端框架 | Node.js + Express / NestJS |
| 数据库 | MySQL 8.0 |
| 实时通信 | Socket.IO (WebSocket) |
| 缓存层 | Redis |
| 文件存储 | 服务器本地存储 + CDN (可选) |
| 离线支持 | Service Worker + IndexedDB |
| 微信集成 | 微信开放平台 (UnionID多端打通) |
| 医疗数据 | HL7/FHIR 兼容接口 |
| 部署方式 | Docker 容器化，支持私有化/云端部署 |

### 1.2 系统架构图

```
┌─────────────────────────────────────────────────────────────┐
│                        客户端层                              │
│  PC浏览器 (Chrome/Firefox/Safari)                           │
│  平板浏览器 (iPad/Android平板)                               │
│  手机浏览器 (iOS Safari/Android Chrome)                      │
│  PWA离线支持 (Service Worker + IndexedDB)                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        网关层                                │
│  Nginx / 云负载均衡器                                        │
│  SSL Termination                                           │
│  静态资源CDN加速                                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      应用服务层                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ Web应用服务  │  │ 实时通信服务 │  │ 任务调度服务 │        │
│  │ (Node.js)   │  │ (Socket.IO) │  │ (Node Cron) │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ 微信OAuth   │  │ 文件存储服务 │  │ 离线同步服务 │        │
│  │ 服务        │  │             │  │             │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        数据层                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ MySQL       │  │ Redis       │  │ 文件存储     │        │
│  │ 主数据库     │  │ 缓存/会话   │  │ 本地/云存储  │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

---

## 二、功能模块设计

### 2.1 前端模块

| 模块 | 功能描述 |
|------|----------|
| 认证模块 | 微信OAuth登录、手机号登录、账号注册、家庭成员管理 |
| 游戏中心 | 10款游戏入口、游戏切换、收藏、推荐 |
| 训练模块 | 单眼/双眼模式切换、游戏内实时反馈、进度保存 |
| 报告模块 | 训练报告查看、进步曲线、分享功能 |
| 离线模式 | 游戏缓存、离线训练、同步机制 |
| 管理后台 | 儿童档案、训练计划、参数配置 |

### 2.2 后端模块

| 模块 | 功能描述 |
|------|----------|
| 用户服务 | 认证授权、家庭管理、微信UnionID |
| 训练服务 | 游戏状态管理、实时得分、训练记录 |
| 数据服务 | HL7/FHIR接口、报告生成、数据分析 |
| 消息服务 | WebSocket实时推送、通知 |
| 文件服务 | 游戏资源管理、头像、备份 |
| 同步服务 | 离线数据冲突解决、云端同步 |

### 2.3 10款游戏设计

| # | 游戏名称 | 游戏类型 | 空间频率 | 训练目标 |
|---|----------|----------|----------|----------|
| 1 | 条纹追踪 | 视觉追踪 | 低/中/高 | 追视能力 |
| 2 | 光斑消消乐 | 眼手协调 | 低/中/高 | 定位与点击 |
| 3 | 融合小拼图 | 融合训练 | 中/高 | 双眼融合 |
| 4 | 记忆翻翻卡 | 认知记忆 | 低/中 | 视觉记忆 |
| 5 | 眼手画线 | 眼手协调 | 低/中 | 手眼配合 |
| 6 | 调节升降台 | 调节训练 | 低/中/高 | 调节幅度 |
| 7 | SF连连看 | 空间频率 | 低/中/高 | 对比敏感度 |
| 8 | 立体积木拼 | 融合训练 | 中/高 | 立体视 |
| 9 | 视觉搜索迷宫 | 视觉搜索 | 低/中 | 搜索效率 |
| 10 | 快速对对碰 | 眼手协调 | 低/中 | 反应速度 |

### 2.4 空间频率配置

| 档位 | 空间频率 (cyc/deg) | 适用场景 |
|------|---------------------|----------|
| 低频 | 0.5 | 初始训练、低龄儿童 |
| 中频 | 2.0 | 进阶训练 |
| 高频 | 4.0 | 强化训练 |

---

## 三、数据模型设计

### 3.1 核心实体

```
用户 (User)
├── id, union_id, open_id, phone, nickname, avatar
├── created_at, updated_at
│
家庭 (Family)
├── id, name, owner_id
│
儿童档案 (ChildProfile)
├── id, family_id, name, gender, birth_date
├── avatar, eye_condition, diagnosis_date
├── created_at, updated_at
│
训练计划 (TrainingPlan)
├── id, child_id, plan_name, phase
├── daily_duration, weekly_frequency
├── spatial_frequency_level
├── training_mode (单眼/双眼)
├── start_date, end_date
│
训练记录 (TrainingRecord)
├── id, child_id, game_id, plan_id
├── score, duration, accuracy
├── training_mode, spatial_frequency
├── game_config (JSON)
├── played_at
│
游戏资产 (GameAsset)
├── id, game_id, asset_type, file_path
├── spatial_frequency, version
│
报告 (Report)
├── id, child_id, report_type (日/周/月)
├── period_start, period_end
├── progress_data (JSON)
├── generated_at
```

### 3.2 HL7/FHIR 数据接口

| 接口 | 描述 |
|------|------|
| Patient | 患者（儿童）信息 |
| Observation | 训练观察记录（得分、时长） |
| Condition | 眼疾诊断 |
| PlanDefinition | 训练计划 |
| Task | 训练任务执行记录 |

---

## 四、实时通信设计

### 4.1 WebSocket 事件

| 事件名 | 方向 | 描述 |
|--------|------|------|
| `game:start` | Client → Server | 开始游戏 |
| `game:score` | Client → Server | 实时得分 |
| `game:progress` | Client → Server | 游戏进度 |
| `game:complete` | Client → Server | 游戏完成 |
| `game:state` | Server → Client | 游戏状态推送 |
| `sync:required` | Server → Client | 同步请求 |

### 4.2 性能指标

- 实时消息延迟：< 100ms
- API响应时间：< 200ms (P95)
- 同时在线用户：500+
- 离线数据同步：恢复连接后30秒内完成

---

## 五、离线支持设计

### 5.1 离线架构

```
┌─────────────────────────────────────────┐
│           Service Worker                │
│  静态资源缓存 (HTML/CSS/JS/游戏资源)      │
│  运行时缓存策略                          │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│            IndexedDB                    │
│  用户数据本地副本                        │
│  离线训练记录队列                        │
│  待同步操作日志                          │
└─────────────────────────────────────────┘
                    │
                    ▼ (恢复连接时)
┌─────────────────────────────────────────┐
│            冲突解决策略                   │
│  服务端数据优先 + 本地最新合并            │
│  冲突记录人工确认                        │
└─────────────────────────────────────────┘
```

### 5.2 离线训练流程

1. 预加载：用户登录后下载已配置游戏的全部资源
2. 离线游戏：游戏数据保存至IndexedDB
3. 结果暂存：训练结果标记为"待同步"
4. 恢复联网：自动检测连接，推送离线数据
5. 冲突处理：显示冲突项，用户或管理员确认

---

## 六、部署架构

### 6.1 Docker 部署

```yaml
# docker-compose.yml 结构
services:
  nginx:
    image: nginx:alpine
    ports: [80, 443]
    
  web:
    image: amblyopia-web:latest
    environment:
      - NODE_ENV=production
    deploy:
      replicas: 2
      
  api:
    image: amblyopia-api:latest
    environment:
      - DB_HOST=mysql
      - REDIS_HOST=redis
    deploy:
      replicas: 2
      
  socket:
    image: amblyopia-socket:latest
    deploy:
      replicas: 2
      
  mysql:
    image: mysql:8.0
    volumes: [mysql_data:/var/lib/mysql]
    
  redis:
    image: redis:alpine
    volumes: [redis_data:/data]
    
  backup:
    image: amblyopia-backup:latest
    cron: "0 2 * * 0"  # 每周日凌晨2点备份
```

### 6.2 私有化部署要求

| 资源 | 最低配置 | 推荐配置 |
|------|----------|----------|
| CPU | 4核 | 8核 |
| 内存 | 8GB | 16GB |
| 磁盘 | 100GB | 500GB SSD |
| 带宽 | 10Mbps | 50Mbps |

### 6.3 云部署建议

- 对象存储：存放游戏静态资源
- CDN：全球加速静态资源
- 云数据库：MySQL主从版
- 容器服务：弹性伸缩

---

## 七、开发计划（24周/4个Phase）

| Phase | 周数 | 交付内容 |
|--------|------|----------|
| Phase 1 | Week 1-6 | 基础框架、认证系统、1-3款游戏、数据基础 |
| Phase 2 | Week 7-12 | 4-7款游戏、实时功能、家长管理后台 |
| Phase 3 | Week 13-18 | 8-10款游戏、医生端后台、报告系统 |
| Phase 4 | Week 19-24 | 离线支持、HL7/FHIR、测试优化 |

---

## 八、技术风险与应对

| 风险 | 等级 | 应对措施 |
|------|------|----------|
| 微信登录资质问题 | 高 | 提前确认公众号资质，准备备选手机号登录 |
| 离线数据冲突 | 中 | 明确的冲突解决策略，必要时人工介入 |
| 游戏性能（移动端） | 中 | 使用Canvas/WebGL，限制帧率 |
| HL7/FHIR复杂性 | 中 | 使用成熟库（HAPI FHIR），Phase 3后期接入 |
| 多端兼容性 | 低 | 使用响应式设计+渐进增强 |

---

## 九、验收标准

1. **功能验收**：10款游戏全部可运行，实时得分正常
2. **性能验收**：API响应 < 200ms，WebSocket延迟 < 100ms
3. **离线验收**：断网后游戏可继续，数据同步正常
4. **安全验收**：用户数据加密存储，微信OAuth安全
5. **跨平台验收**：PC/平板/手机浏览器均正常可用

---

*本技术方案由 main (贾维斯) 根据 boss 确认的技术诉求输出*
*生成时间：2026-04-12*

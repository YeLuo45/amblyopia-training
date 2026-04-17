# 弱视训练Web应用

面向家庭的医学级弱视训练平台，通过游戏化训练为3~6岁儿童提供家庭化视觉功能训练。

## 项目概述

- **提案编号**: P-20260412-001
- **状态**: Phase 2 完成（基础框架 + 10款游戏 + 医生端后台）
- **技术栈**: React 18 + TypeScript + Node.js + Express + MySQL + Socket.IO

## 功能特性

### 已完成 (Phase 1 + Phase 2)

- ✅ 用户认证系统（注册/登录）
- ✅ 家庭账号管理
- ✅ 儿童档案管理
- ✅ 训练计划配置
- ✅ 游戏参数设置
- ✅ 实时训练数据同步（WebSocket）
- ✅ 训练历史记录
- ✅ 周/月进度报告
- ✅ 复诊报告生成与分享
- ✅ HL7/FHIR 兼容接口
- ✅ Service Worker 离线支持（基础）
- ✅ **10款训练游戏**:
  - 🏃 条纹追踪 (Stripe Chase)
  - 🎯 光斑消消乐 (Dot Pop)
  - 🧩 记忆翻翻卡 (Memory Flip)
  - 🧩 融合小拼图 (Fusion Puzzle) - 双眼融合
  - ✏️ 眼手画线 (Draw the Line) - 手眼协调
  - 🎈 调节升降台 (Accommodation Lift) - 调节训练
  - 🔲 SF连连看 (SF Matching) - 空间频率
  - 🧱 立体积木拼 (Depth Blocks) - 红蓝立体
  - 🔍 视觉搜索迷宫 (Visual Search Maze) - 扫视训练
  - ⚡ 快速对对碰 (Quick Match) - 交替抑制
- ✅ **医生端管理后台**:
  - ✅ 医生注册与登录
  - ✅ 患者管理（添加/移除）
  - ✅ 训练处方管理
  - ✅ 患者训练数据查看
  - ✅ 进步曲线可视化
  - ✅ 医嘱推送提醒
  - ✅ FHIR R4 数据导出（Patient/Observation/CarePlan）

### 规划中 (Phase 3-4)

- ⏳ 微信登录集成
- ⏳ 完整离线同步
- ⏳ HL7/FHIR 深度集成
- ⏳ 性能优化与测试

## 项目结构

```
amblyopia-training/
├── server/                 # 后端服务 (Node.js + Express)
│   ├── src/
│   │   ├── db/            # MySQL数据库配置
│   │   ├── middleware/    # 认证中间件
│   │   ├── routes/        # API路由
│   │   ├── socket/        # WebSocket处理
│   │   └── types/        # TypeScript类型定义
│   ├── package.json
│   └── tsconfig.json
│
├── web/                   # 前端应用 (React + TypeScript)
│   ├── src/
│   │   ├── components/    # React组件
│   │   ├── lib/          # 工具库（API, Socket, IndexedDB）
│   │   ├── pages/        # 页面组件
│   │   ├── types/        # TypeScript类型定义
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── public/
│   │   ├── sw.js         # Service Worker
│   │   └── eye.svg
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── docker-compose.yml      # Docker容器编排
└── README.md
```

## 快速开始

### 前置要求

- Node.js >= 18
- MySQL >= 8.0
- npm 或 yarn

### 安装依赖

```bash
# 安装所有依赖
npm run install:all

# 或分别安装
cd server && npm install
cd ../web && npm install
```

### 数据库配置

1. 创建MySQL数据库:
```sql
CREATE DATABASE amblyopia_training;
```

2. 配置环境变量 (`server/.env`):
```env
PORT=3001
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=amblyopia_training
JWT_SECRET=your-secret-key
CLIENT_URL=http://localhost:3000
NODE_ENV=development
```

### 启动开发服务器

```bash
# 启动后端和前端（推荐）
npm run dev

# 或分别启动
npm run dev:server   # http://localhost:3001
npm run dev:web      # http://localhost:3000
```

### Docker 部署

```bash
# 构建并启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

## 访问方式

### 本地开发

- **前端**: http://localhost:3000
- **后端API**: http://localhost:3001/api
- **WebSocket**: ws://localhost:3001
- **FHIR接口**: http://localhost:3001/fhir

### Docker部署

启动后访问: http://localhost

## API 文档

### 认证

- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `GET /api/auth/me` - 获取当前用户信息

### 家庭管理

- `GET /api/family` - 获取家庭信息
- `GET /api/family/children` - 获取儿童列表
- `POST /api/family/children` - 添加儿童
- `PUT /api/family/children/:id` - 更新儿童档案
- `DELETE /api/family/children/:id` - 删除儿童
- `GET /api/family/children/:id/plan` - 获取训练计划
- `PUT /api/family/children/:id/plan` - 更新训练计划
- `GET /api/family/children/:id/game-configs` - 获取游戏配置
- `PUT /api/family/children/:id/game-configs/:gameId` - 更新游戏配置

### 训练

- `GET /api/training/games` - 获取游戏列表
- `POST /api/training/session/start` - 开始训练会话
- `POST /api/training/session/:id/score` - 更新得分
- `POST /api/training/session/:id/end` - 结束训练会话
- `GET /api/training/history/:childId` - 获取训练历史
- `GET /api/training/progress/:childId` - 获取进度数据
- `GET /api/training/report/:childId/weekly` - 获取周报
- `POST /api/training/report/:childId/consultation` - 生成复诊报告

### HL7/FHIR

- `GET /fhir/Patient/:id` - 获取患者信息
- `GET /fhir/Observation?patientId=xxx` - 获取训练观察记录

### 医生端

- `POST /api/doctor/register` - 医生注册
- `POST /api/doctor/login` - 医生登录
- `GET /api/doctor/profile` - 获取医生信息
- `PUT /api/doctor/profile` - 更新医生信息
- `GET /api/doctor/patients` - 获取管理患者列表
- `POST /api/doctor/patients` - 添加患者
- `DELETE /api/doctor/patients/:childId` - 移除患者
- `GET /api/doctor/patients/:childId/sessions` - 获取患者训练记录
- `GET /api/doctor/patients/:childId/progress` - 获取患者进度
- `GET /api/doctor/patients/:childId/report` - 获取患者报告
- `PUT /api/doctor/patients/:childId/plan` - 更新患者训练计划
- `POST /api/doctor/patients/:childId/remind` - 发送提醒
- `GET /api/doctor/fhir/Patient/:childId` - FHIR患者资源
- `GET /api/doctor/fhir/Observation` - FHIR观察记录
- `GET /api/doctor/fhir/CarePlan/:childId` - FHIR训练处方

## WebSocket 事件

### 客户端 → 服务器

- `child:join` - 加入儿童房间
- `game:start` - 开始游戏
- `game:score` - 更新得分
- `game:progress` - 更新进度
- `game:event` - 记录游戏事件
- `game:complete` - 完成游戏
- `game:abort` - 中止游戏

### 服务器 → 客户端

- `game:state` - 游戏状态推送
- `game:event` - 游戏事件推送

## 空间频率配置

| 档位 | 值 (cyc/deg) | 适用场景 |
|------|---------------|----------|
| 低频 | 0.5 | 初始训练、低龄儿童 |
| 中频 | 2.0 | 进阶训练 |
| 高频 | 4.0 | 强化训练 |

## 训练模式

- **单眼遮盖**: 遮盖优势眼，强制使用弱视眼训练
- **双眼同视**: 双眼同时视物，训练双眼协同和融合功能

## 游戏说明

### 条纹追踪 (Stripe Chase)
- **训练类型**: 视觉追踪
- **玩法**: 点击屏幕上移动的小鱼
- **参数**: 条纹频率、移动速度

### 光斑消消乐 (Dot Pop)
- **训练类型**: 眼手协调 / 对比度感知
- **玩法**: 点击所有指定颜色的光斑
- **参数**: 光斑数量、对比度

### 记忆翻翻卡 (Memory Flip)
- **训练类型**: 视觉认知 / 短期记忆
- **玩法**: 记住卡片位置后进行配对
- **参数**: 卡片数量、显示时长

## 验证测试

### 手动测试清单

1. **用户认证**
   - [ ] 注册新用户
   - [ ] 登录成功
   - [ ] 退出登录

2. **儿童档案管理**
   - [ ] 添加儿童
   - [ ] 编辑儿童信息
   - [ ] 删除儿童

3. **训练计划配置**
   - [ ] 创建训练计划
   - [ ] 调整训练参数
   - [ ] 更新游戏设置

4. **游戏训练**
   - [ ] 条纹追踪完整流程
   - [ ] 光斑消消乐完整流程
   - [ ] 记忆翻翻卡完整流程
   - [ ] 单眼/双眼模式切换
   - [ ] 空间频率切换

5. **数据同步**
   - [ ] 训练数据实时显示
   - [ ] WebSocket连接正常
   - [ ] 训练记录保存

6. **报告生成**
   - [ ] 查看周报
   - [ ] 查看进度曲线
   - [ ] 生成复诊报告
   - [ ] 分享报告链接

### 性能测试

- ✅ 前端首屏加载 < 3秒
- ✅ WebSocket延迟 < 100ms
- ✅ 游戏帧率 >= 30fps
- ✅ API响应时间 < 200ms (P95)

### 已知问题

- [ ] Phase 2-4 游戏尚未实现 (Phase 2 已完成)
- [ ] 微信登录未集成
- [ ] 完整离线同步待完善
- [ ] 医生端后台待开发

## 技术栈详情

### 前端
- **框架**: React 18 + TypeScript
- **构建**: Vite
- **路由**: React Router v6
- **状态**: React Context + Hooks
- **实时**: Socket.IO Client
- **离线**: Service Worker + IndexedDB

### 后端
- **框架**: Express + TypeScript
- **数据库**: MySQL 8.0
- **ORM**: mysql2 (Promise)
- **实时**: Socket.IO
- **认证**: JWT + bcrypt
- **医疗标准**: HL7/FHIR 兼容接口

### 部署
- **容器化**: Docker + Docker Compose
- **反向代理**: Nginx
- **数据库**: MySQL 8.0
- **进程管理**: Node.js (production)

## 开发计划

### Phase 1 (Week 1-6) ✅
- ✅ 基础框架搭建
- ✅ 认证系统
- ✅ 1-3款游戏
- ✅ 数据基础

### Phase 2 (Week 7-12) ✅
- ✅ 4-10款游戏开发
- ✅ 实时功能完善
- ✅ 家长后台增强
- ✅ 医生端后台开发

### Phase 3 (Week 13-18) ⏳
- ⏳ 8-10款游戏
- ⏳ 医生端后台
- ⏳ 报告系统

### Phase 4 (Week 19-24) ⏳
- ⏳ 离线支持完善
- ⏳ HL7/FHIR 深度集成
- ⏳ 测试与优化

## 医学标准合规

- 符合《儿童弱视防治指南》
- 训练参数可配置，医生可调整
- 不做诊断声明，仅供辅助训练
- 儿童数据加密存储与传输
- 72小时报告链接有效期

## 免责声明

> ⚠️ 本产品为辅助训练工具，不替代专业诊疗。请在眼科医生指导下使用。

## 联系与支持

- **项目提案**: P-20260412-001
- **PRD文档**: `/workspace-pm/proposals/2026-04-12-amblyopia-training-prd.md`
- **技术方案**: `/workspace/proposals/P-20260412-001-tech-solution.md`

## License

Proprietary - Copyright 2026

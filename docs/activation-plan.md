# 首次体验改造方案（激活 & 付费转化）

> 2026-07-04 起草。目标：修复"注册 → 首次生成"的断层，把付费决策放到用户看到效果之后。

## 背景数据（2026-07-04 生产库）

| 环节 | 数量 |
|---|---|
| 注册用户 | 501（周增 20~28） |
| 生成过 ≥1 次 | 6（1.2%） |
| 付费用户 | 6（8 笔 $1 单次 + 2 笔订阅） |
| 有效订阅 | 2 |
| 生成任务 | 23，其中 6 个卡在 PENDING/PROCESSING（26%） |

结论：99% 的注册用户在没见过生成效果的情况下被推到 /pricing 后流失。付费转化问题本质是**激活**问题。

## 改造后的首次体验

```
上传自己照片（或选回"我的形象"）
→ 上传服装图（或从服装库点一件）
→ 免费生成 1 次（结果带水印）
→ 弹窗：解锁高清无水印 → $1 单次 / 订阅
```

---

## 模块 A：注册送 1 次免费生成 + 水印

### A1. 送积分

- `lib/pricing.ts` 已有 `FREE_SIGNUP_CREDITS = 2`，但**全项目无任何引用**（死常量，生产库所有 FREE 用户 0 积分可证）。改为 `1` 并真正接线。
- `lib/auth.ts` 的 `authOptions` 增加 `events.createUser`：新用户创建后 `credits` 置为 `FREE_SIGNUP_CREDITS`。
  不改 schema 默认值（`credits @default(0)` 保留，避免其他路径创建的 User 也拿到积分）。
- **存量用户回填**：一次性 SQL 给 495 个 `credits=0 AND 无付费记录` 的老用户送 1 积分，配合召回邮件（"送你一次免费试穿"）。

```sql
UPDATE "User" SET credits = 1
WHERE credits = 0
  AND "subscriptionStatus" = 'FREE'
  AND id NOT IN (SELECT DISTINCT "userId" FROM "Payment" WHERE "userId" IS NOT NULL);
```

### A2. 免费用户判定

规则：**从未有过 `status='paid'` 的 Payment 记录**的用户视为免费用户，其生成结果加水印。
付过 $1 或订阅过的用户永远出无水印图（包括订阅过期后用剩余积分）。

### A3. 水印实现（服务端）

**前置改造：status 接口鉴权 + 任务归属。** 现在 `pages/api/status.ts` 无登录校验、只收 taskId，既不知道任务属于谁，也无法判定是否免费用户（任何人拿到 taskId 都能查任意任务）。改为：

- 轮询请求带 `jobId`（use-credit 已返回给前端）；
- 服务端校验登录 + `job.userId === session.user.id`，不匹配返回 404；
- 通过 `job.taskId` 查 DashScope，不再信任客户端传的 taskId。

**水印流程**：当 DashScope 返回 `SUCCEEDED` 且该用户是免费用户（A2 判定）时：

1. 服务端下载结果图；
2. 用 `sharp` 叠加水印（右下角 "DressMeAI" logo + 斜向半透明平铺文字，防裁剪）；
3. 上传到 Azure Blob（复用 upload.ts 的 blob 逻辑，抽成 `lib/blob.ts`）；
4. 客户端只收到水印图 URL。

**原图存储**：`TryOnJob.resultImageUrl` 存水印图；新增 `originalImageUrl` 存 DashScope 原图 URL——**存库但任何接口都不下发给免费用户**（付费后可解锁历史图，暂不做 UI）。

- 依赖：`sharp`（注意 Azure SWA Functions 为 linux-x64，安装时需确认二进制兼容，同 prisma binaryTargets 的处理思路）。
- 兜底：水印失败先**重试 1 次**；仍失败则返回原图并打告警日志（`console.error` + 明确标记，便于在 SWA 日志里检索）。可用性优先于水印，但漏水印必须可追溯。

### A4. 结果页升级弹窗

- 免费生成完成后，结果图下方 + 弹窗展示："想要高清无水印？再试一次？"
  - 主 CTA：**$1 生成一次**（直接调用现有 create-payment 流程）
  - 次 CTA：查看订阅（跳 /pricing）
- 文案进 `messages/*/landing.json`，9 语言。

### A5. 防滥用

- 每个 Google 账号仅 1 次（createUser 事件天然保证）。
- 水印本身是最大的滥用抑制。
- 可选（暂不做）：记录注册 IP，同 IP 24h 超过 N 个新账号则不送。

---

## 模块 B：预置服装库

### B1. 素材

- 首批 12 件：女装 6（连衣裙 2、上衣 2、外套 2）+ 男装 6（衬衫 2、T恤 2、夹克 2）。
- 来源：AI 生成服装平铺图（无版权风险），或自有拍摄。规格统一 768x1024 白底。
- 存放 `public/garments/`，清单硬编码在 `lib/garments.ts`（id、图片路径、分类、多语言名称 key）。

### B2. 前端交互

- 首页服装上传区改为两个 tab：**上传服装图** / **从服装库选择**。
- 服装库为横滑缩略图网格，点选即视为已提供服装图。
- 选中预置服装时跳过 base64 上传：`runGenerationFromBase64` 拆出 `resolveImageUrl(input)` —— 入参是 base64 就走 /api/upload，是 URL（预置服装）就直接用。注意预置服装需要可被 DashScope 拉取的公网 URL，用 `https://dressmeai.com/garments/xxx.jpg` 即可。
- 埋点：`garment_gallery_select`（记录选了哪件，为后续补充素材提供依据）。

---

## 模块 C：形象照持久化（我的形象）

### C1. Schema

```prisma
model SavedModelImage {
  id        String   @id @default(cuid())
  userId    String
  imageUrl  String
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId])
}
```

- 每用户最多保留 **3** 张，超出淘汰最旧（生成流程里模型图上传成功后 upsert）。

### C2. API

- `GET /api/user/model-images` — 列出已存形象照。
- `DELETE /api/user/model-images?id=` — 删除（同时删 Blob 上的文件）。
- 保存动作不需要独立 API：在生成流程 model 图上传成功后由服务端顺带写入（在 upload.ts 加一个 `saveAsModel` 参数，登录态下生效）。

### C3. 前端

- 首页形象照上传区：登录且有已存形象时，上传框下方显示"上次使用的形象"缩略图（最多 3 张），点选直接复用（URL，同 B2 跳过上传）。
- /account 增加"我的形象"管理块，可删除。

### C4. 合规

- privacy.tsx 增加条款：形象照存储用途、保留策略、删除方式（9 语言）。
- 删除账号/形象时同步删除 Blob 文件。

---

## 模块 D：生成失败自动退积分（信任修复）

### D1. Schema

- `TryOnJob` 增加 `creditRefunded Boolean @default(false)`。

### D2. 退款逻辑

**前置改造：归属校验。** 现在 `update-job.ts` 只按 jobId 更新，不校验任务是否属于当前用户——任何登录用户可改他人任务；挂上退积分后会变成刷积分漏洞（把任务反复报 FAILED 套退款）。改为：update 条件带 `userId: session.user.id`，不匹配返回 404。

- `pages/api/update-job.ts`：status 更新为 `FAILED` 时，在同一事务里：
  `job.creditRefunded == false` → 置 true + 用户 `credits +1`。`creditRefunded` 标记保证幂等，配合归属校验杜绝重复退款。
- **卡死任务兜底**（前端轮询中断导致永远 PENDING/PROCESSING 的场景）：
  在 `check-credits.ts` 里顺带清扫：当前用户超过 15 分钟仍 PENDING/PROCESSING 的 job → 置 FAILED + 退积分。选 check-credits 是因为它在每次进入生成流程前必被调用，无需引入定时任务。
- 前端失败提示文案加上"积分已退还"。

### D3. 存量修复

- 一次性把现有 6 个卡死 job 置 FAILED 并给对应用户退 1 积分。

---

## 实施顺序

| 阶段 | 内容 | 说明 |
|---|---|---|
| P1 | 模块 D（退积分）+ 模块 A（免费额度+水印+弹窗） | 核心激活改造，一起上线 |
| P2 | 模块 B（服装库）+ 模块 C（形象照持久化） | 进一步降摩擦，素材备好即可上 |
| P3 | 召回邮件（给 495 个老用户送 1 积分 + 通知） | P1 上线验证稳定后发 |

改动面：schema 迁移 2 处（TryOnJob.creditRefunded / originalImageUrl、SavedModelImage 表）、新增 API 2 个、改动 API 4 个（status / update-job / check-credits / upload，其中 status 与 update-job 需补齐鉴权/归属校验）、index.tsx 交互改造、9 语言文案。

## 验收指标

| 指标 | 现状 | 目标（P1 上线 4 周后） |
|---|---|---|
| 激活率（注册 → 首次生成） | 1.2% | ≥ 40% |
| 付费转化（注册 → 付费） | 1.2% | ≥ 4% |
| 生成任务卡死率 | 26% | < 3%（含自动退款兜底） |
| 免费 → 付费转化（新增指标） | — | 基线待观察 |

## 风险与开放问题

1. **DashScope 单次生成成本待确认** —— 决定免费额度经济账。按周增 25 注册全部激活估算，每周新增 ~25 次免费生成，成本可控性需要一个具体数字确认。
2. **sharp 在 Azure SWA 的兼容性** —— 部署前在 CI 里验证 linux 二进制；不行则降级为客户端 CSS 水印 + 禁右键（弱方案）。
3. **免费生成结果的水印强度** —— 太弱起不到升级动力，太强影响分享传播。首版：右下 logo + 中部斜向淡纹，上线后看数据调。
4. 服装库素材版权自查（全部 AI 生成或自有拍摄）。

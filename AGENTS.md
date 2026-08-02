# DressMeAI 项目设计记录

## 沟通约定
- 使用中文回复用户。

## 系统目标
- 为用户提供线上虚拟试衣体验：上传模特照与服装照，调用阿里云 DashScope 的 `aitryon` 能力生成合成图。
- 提供安全的支付链路（Stripe）以及生成历史与故障恢复机制，保证付费后一定能取回结果。

## 技术栈概览
- **前端框架**：Next.js + TypeScript + Tailwind CSS。
- **存储与托管**：Azure Blob Storage 用于图片上传结果的公网访问；本地浏览器使用 `localStorage` 作为临时缓存。
- **AI 服务**：DashScope Image2Image（`image-synthesis` 接口，开启 `X-DashScope-Async` 以异步方式获取 `task_id`）。
- **支付**：Stripe Checkout，单次试穿为 `$1`；`success_url` 跳转到 `/success?session_id=...`，取消后返回首页试衣区。

## 核心流程（端到端）
1. **选择图片**：用户上传或选择人物照与服装图。
2. **登录续接**：未登录用户点击生成时，两张图片暂存到 `localStorage + sessionStorage`；Google 登录返回后恢复图片并自动打开付费墙。
3. **生成前付费**：
   - 有历史剩余次数的用户可直接生成；
   - 没有次数的用户看到订阅优先的付费墙，主推 Basic 月订阅，`$1` 单次生成作为次级选项；
   - `/api/create-payment` 仅允许登录用户创建 Stripe Checkout，并记录 `source` 用于归因。
4. **支付回调**：`/success?session_id=...` 调用 `/api/verify-payment`；从生成付费墙购买单次或订阅后都会设置 `pendingGeneration`。
5. **自动生成**：首页读取暂存图片，调用 `/api/use-credit` 创建 `TryOnJob`，再上传图片、调用 `/api/tryon` 并轮询 `/api/status?jobId=`。
6. **结果与故障恢复**：成功结果写入 Azure Blob 与数据库；失败任务幂等退回次数。新注册用户不再自动获赠免费次数，已有用户的剩余次数保留。

## API 端点
- `POST /api/upload`：
  - 输入：`{ image: base64 }`。
  - 处理：Sharp 压缩 + Azure Blob `BlockBlobClient.uploadData`。
  - 输出：`{ url }` 用于 DashScope。
- `POST /api/tryon`：
  - 输入：`{ jobId, modelImageUrl, clothingImageUrl }`。
  - 处理：调用 DashScope `aitryon`，使用 `axiosInstance`（120s 超时，开启异步），返回 `taskId`。
- `GET /api/status?jobId=`：
  - 校验登录与任务归属，对 DashScope 任务进行带退避的重试；成功后持久化结果并返回 `imageUrl`。
- `POST /api/create-payment`：
  - 仅限登录用户；输入可带 `{ source, jobId? }`。
  - 普通单次付款增加 1 次；历史水印结果可带 `jobId` 原地解锁。
- `GET /api/check-credits` / `POST /api/use-credit`：
  - 查询与原子扣减次数；超时或失败任务自动退回。

## 本地状态与历史
- 临时键：`modelImage`、`clothingImage`、`imageUploadTimestamp`、`pendingPaywall`、`pendingGeneration`、`unlockedJobId`。
- 图片跨登录/支付跳转时同时写入 `localStorage` 和 `sessionStorage`，清理时必须同步删除两处。
- 生成历史以数据库 `TryOnJob` 为准，不依赖浏览器历史缓存。

## 环境变量
- `ALIYUN_API_KEY`：DashScope 鉴权。
- `IMGBB_API_KEY`：旧版 `/api/generate` 上传使用。
- `AZURE_STORAGE_ACCOUNT/KEY/CONTAINER`：Azure Blob。
- `STRIPE_SECRET_KEY`、`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`、`NEXT_PUBLIC_BASE_URL`：支付与前端配置。

## 设计要点与注意事项
- 所有 API 路由仅接受对应的 HTTP 方法，未匹配时返回 405。
- 图片上传与 AI 调用大量依赖外部网络，日志里记录每一步状态便于排查。
- 单次付费墙必须放在 AI 生成前，避免无付款生成成本。
- 支付成功后必须能够自动恢复原图并继续生成；不得把 base64/URL 当 JSON 清理。
- Stripe metadata 的 `source` 用于区分 `generation_paywall`、`generation_paywall_subscription`、`pricing_single`、`legacy_unlock`。
- 付费墙演示图位于 `public/images/paywall-demo/`，由 Azure GPT Image 2 生成；界面明确作为效果演示，不使用用户图片。

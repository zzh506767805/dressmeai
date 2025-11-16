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
- **支付**：Stripe Checkout，`success_url` 跳转到 `/success?session_id=...`，`cancel_url` 返回 `/cancel`。

## 核心流程（端到端）
1. **图片上传**：用户在首页上传模特/服装图片，数据以 base64 保存在浏览器 `localStorage` 中并记录 `imageUploadTimestamp`。
2. **支付**：前端调用 `/api/create-payment` 生成 Stripe Checkout Session，引导用户完成支付。
3. **支付回调页**：Stripe 成功回调 `/success?session_id=...`。
4. **成功页处理**（`pages/success.tsx`）：
   - 等待 `router.isReady` 后读取 `session_id`、`status`、`imageUrl`。
   - 若 URL 已有 `status=completed` 且带 `imageUrl`，直接展示。
   - 否则验证支付（`/api/verify-payment`）。
   - 从 `localStorage` 取出 `modelImage`、`clothingImage`，上传到 `/api/upload`（Azure Blob，Sharp 压缩成 1024px、80% JPEG）。
   - 调用 `/api/tryon`（DashScope 异步任务），拿到 `taskId` 后轮询 `/api/status`，最多 20 次、间隔 5 秒。
   - 成功后写入 `tryonHistory` 与 `currentGeneration`（包含 `sessionId`）并将 URL 改写为 `status=completed&imageUrl=...`，便于刷新/分享。
   - 无论成功与否，最后清理 `modelImage`、`clothingImage`。

## API 端点
- `POST /api/upload`：
  - 输入：`{ image: base64 }`。
  - 处理：Sharp 压缩 + Azure Blob `BlockBlobClient.uploadData`。
  - 输出：`{ url }` 用于 DashScope。
- `POST /api/tryon`：
  - 输入：`{ modelImageUrl, clothingImageUrl }`。
  - 处理：调用 DashScope `aitryon`，使用 `axiosInstance`（120s 超时，开启异步），返回 `taskId`。
- `GET /api/status?taskId=`：
  - 处理：对 DashScope `/api/v1/tasks/:id` 进行带退避的重试，返回 `status` 和 `imageUrl`（当 `SUCCEEDED` 时）。
- `POST /api/generate`：
  - 早期一体化接口：压缩两张 base64、上传至 ImgBB、调用 DashScope、内部轮询，现主要用作备用方案。

## 本地状态与历史
- `localStorage` 键：`modelImage`、`clothingImage`、`imageUploadTimestamp`、`tryonHistory`、`currentGeneration`。
- `currentGeneration` 结构：`{ imageUrl, timestamp, sessionId }`；仅当 `sessionId` 与当前页面一致时才复用。

## 环境变量
- `ALIYUN_API_KEY`：DashScope 鉴权。
- `IMGBB_API_KEY`：旧版 `/api/generate` 上传使用。
- `AZURE_STORAGE_ACCOUNT/KEY/CONTAINER`：Azure Blob。
- `STRIPE_SECRET_KEY`、`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`、`NEXT_PUBLIC_BASE_URL`：支付与前端配置。

## 设计要点与注意事项
- 所有 API 路由仅接受对应的 HTTP 方法，未匹配时返回 405。
- 图片上传与 AI 调用大量依赖外部网络，日志里记录每一步状态便于排查。
- 成功页的缓存复用必须绑定 `sessionId`，防止不同订单读取旧图。
- `localStorage` 清理放在 `finally` 中，确保异常情况下不会遗留大体积 base64。

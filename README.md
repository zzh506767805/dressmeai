# DressMeAI - Virtual Try-On Platform

DressMeAI is an AI-powered virtual try-on platform that allows users to visualize how clothes would look on them using advanced AI technology.

## Features

- Virtual Try-On: See exactly how clothes look on you
- Image Processing: Automatic image compression and optimization
- Secure Payment Integration: Safe and reliable payment processing
- History Tracking: Keep track of all your try-on results

## Tech Stack

- Frontend: Next.js, TypeScript, Tailwind CSS
- APIs: 
  - Aliyun AI for virtual try-on
  - Azure Blob Storage for image hosting
  - Stripe for payment processing

## Getting Started

1. Clone the repository:
```bash
git clone https://github.com/yourusername/dressmeai.git
cd dressmeai
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
- Copy `.env.example` to `.env.local`
- Fill in your API keys and configuration

4. Run the development server:
```bash
npm run dev
```

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```bash
# Aliyun AI Service
ALIYUN_API_KEY=your_aliyun_api_key

# Azure Blob Storage
AZURE_STORAGE_ACCOUNT=your_storage_account
AZURE_STORAGE_KEY=your_storage_key
AZURE_STORAGE_CONTAINER=your_container_name

# Stripe Payment (Production Mode)
STRIPE_SECRET_KEY=sk_live_your_live_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_live_publishable_key

# Base URL (Production)
NEXT_PUBLIC_BASE_URL=https://dressmeai.com
```

**Note**: The project is currently configured to use Stripe in **production mode**. Real payments will be processed and charged.

## Internationalization 多语言支持

- 基于 Next.js 内置 i18n 路由与 `next-intl`，当前提供 `en / zh-CN / ko / ja / ru / fr / de / es / it` 共 9 种语言。
- 文案按照命名空间拆分存放在 `messages/<locale>/<namespace>.json`（目前包含 `common`、`landing`、`components`、`blog`）。需要新增域（例如 `seo`）时，只需在每个语言目录下添加同名 JSON，`i18n/messages.ts` 会自动聚合，命名空间结构也便于按页面/模块维护。
- 可通过 `npm run i18n:check` 检查所有语言键值是否齐全，避免遗漏翻译。
- `i18n/settings.json` 用于配置语言代码、展示名称及默认语言，并被 `next.config.js`、`middleware`、`LanguageSwitcher` 等共享。
- `components/shared/LanguageSwitcher` 提供语言切换，会调用 Next.js 的 locale 路由并写入 `NEXT_LOCALE` cookie。
- 新增语言时：
  1. 在 `i18n/settings.json` 里追加语言元数据；
  2. 复制 `messages/en.json` 生成对应翻译；
  3. 运行 `npm run i18n:check && npm run lint` 确认结构无误；
  4. 必要时在 README 或产品文档更新语言列表。

SEO 层面会根据当前语言动态输出 `<html lang>`, `og:locale`, `hreflang` 以及多语言版 sitemap，确保搜索引擎可正确索引各语言版本。

## Deployment

1. Build the project:
```bash
npm run build
```

2. Start the production server:
```bash
npm start
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## 项目结构

```
dressmeai/
├── components/     # React组件
│   └── ImageUpload.tsx    # 图片上传组件
├── pages/          # 页面文件
│   ├── api/        # API路由（上传/试穿/状态/支付等）
│   └── index.tsx   # 主页面
├── public/         # 静态资源
├── styles/         # 样式文件
└── utils/          # 工具函数
```

## 使用说明

1. 打开网站首页
2. 上传模特图片（支持JPG/PNG格式，最大5MB）
3. 上传想要试穿的服装图片（支持JPG/PNG格式，最大5MB）
4. 点击"开始生成"按钮
5. 等待几秒钟，系统会自动生成换装效果图

## 注意事项

- 模特图片要求：
  - 清晰的全身照
  - 姿势自然
  - 背景简单
- 服装图片要求：
  - 清晰的正面图
  - 白色或简单背景
  - 服装轮廓清晰

## SEO优化

本项目针对以下关键词进行了优化：
- AI clothes changer
- Virtual try-on
- AI fashion assistant
- Digital wardrobe
- Virtual fitting room 

## Cloudflare 迁移分支

当前分支已适配 Cloudflare Workers + 原生 D1 + 私有 R2，正式域名仍由 Azure 提供服务。公开页面/RSS/sitemap 构建后作为静态资源，API 使用 D1 原生查询；Prisma 仅用于类型和 schema 工具，不在请求时加载。
本地验证不等于线上迁移完成，状态见 [执行记录](docs/cloudflare-migration-progress-2026-11-07.md)。

本地命令：

```bash
npm ci
npm run cf:build
npx wrangler deploy --dry-run --outdir .wrangler/dry-run
npm run test:cloudflare
npm run test:integration
npx wrangler d1 migrations apply dressmeai-preview --local
npm run cf:preview
```

- `.dev.vars` 配置本地服务密钥，仅使用测试数据；该文件已忽略，不提交。浏览器压缩图片后以 JPEG 二进制上传。
- 服务端图片地址和 Stripe 返回地址使用运行时 `NEXTAUTH_URL`，前端 SEO 使用构建时 `NEXT_PUBLIC_BASE_URL`。
- 绑定：`DB`（D1）、`IMAGES_BUCKET`（私有 R2）、`ASSETS`（静态文件）。当前配置指向预发布 D1；R2 桶需先开通并创建，正式发布前必须替换为正式资源绑定。
- 密钥：`GOOGLE_CLIENT_ID`、`GOOGLE_CLIENT_SECRET`、`NEXTAUTH_SECRET`、`STRIPE_SECRET_KEY`、`STRIPE_WEBHOOK_SECRET`、`ALIYUN_API_KEY`、`RECOVERY_SECRET`。
- 需先登录 Cloudflare、确认 R2 已启用、创建独立预发布资源，迁移备份，再做云端 CPU、图片转换和回调验收后切换域名。
- 旧 PostgreSQL 数据结构保存在 `prisma/azure-schema.prisma`；原 Azure 版本应从迁移前 Git 版本恢复，不要直接部署本分支到 Azure。
- 数据库/图片备份脚本为 `scripts/export-azure-database.py` 和 `scripts/export-azure-images.mjs`；导入准备为 `scripts/prepare-d1-import.py`。备份含非公开数据，保存在忽略目录 `.migration/`。

2026-11-08 真实验证发现原 aitryon 已不可用（原站 10 月 13 日已有同类失败）。迁移分支默认改用阿里云 wan2.7-image 异步编辑，直接提交私有图片数据，支持长期结果保存；公开价格约 0.20 元/张，站内收费保持原样。可用 TRYON_MODEL 显式配置兼容模型。

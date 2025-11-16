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

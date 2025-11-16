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

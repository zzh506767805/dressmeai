import { useRouter } from 'next/router';
import Head from 'next/head';

export default function Cancel() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-12 px-4 sm:px-6 lg:px-8">
      <Head>
        <title>支付取消 | DressMeAI</title>
      </Head>

      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">支付已取消</h2>
        <p className="text-gray-600 mb-8">您可以随时返回重新尝试生成虚拟试衣效果图</p>
        <button
          onClick={() => router.push('/')}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          返回首页
        </button>
      </div>
    </div>
  );
} 
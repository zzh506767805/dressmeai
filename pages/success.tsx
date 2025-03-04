import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import Head from 'next/head';

type Status = 'loading' | 'success' | 'error' | 'completed' | 'failed';

interface GenerationResult {
  imageUrl: string;
  timestamp: number;
}

const STORAGE_KEY = 'currentGeneration';

export default function Success() {
  const router = useRouter();
  const { session_id, status: urlStatus, imageUrl: urlImageUrl } = router.query;
  const [status, setStatus] = useState<Status>('loading');
  const [step, setStep] = useState<string>('Checking generation status...');
  const [resultImage, setResultImage] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    // 如果 URL 已经包含完成状态和图片 URL，直接显示结果
    if (urlStatus === 'completed' && urlImageUrl) {
      setStatus('completed');
      setResultImage(urlImageUrl as string);
      return;
    }

    // 检查 localStorage 中是否有未完成的生成结果
    const savedResult = localStorage.getItem(STORAGE_KEY);
    if (savedResult) {
      const result: GenerationResult = JSON.parse(savedResult);
      setStatus('completed');
      setResultImage(result.imageUrl);
      // 更新 URL，但不触发页面刷新
      router.replace(
        {
          pathname: router.pathname,
          query: { ...router.query, status: 'completed', imageUrl: result.imageUrl }
        },
        undefined,
        { shallow: true }
      );
      return;
    }

    if (!session_id) return;

    const startGeneration = async () => {
      try {
        // 验证支付状态
        setStep('Verifying payment status...');
        const verifyResponse = await fetch(`/api/verify-payment?session_id=${session_id}`);
        if (!verifyResponse.ok) {
          throw new Error('Payment verification failed');
        }

        const { success } = await verifyResponse.json();
        if (!success) {
          throw new Error('Payment not completed');
        }

        // 从 localStorage 获取图片数据
        setStep('Retrieving image data...');
        const modelImage = localStorage.getItem('modelImage');
        const clothingImage = localStorage.getItem('clothingImage');

        if (!modelImage || !clothingImage) {
          throw new Error('Image data not found, please upload again');
        }

        // 上传模特图片
        setStep('Uploading model image...');
        const modelResponse = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            image: modelImage
          }),
        });

        if (!modelResponse.ok) {
          throw new Error('Failed to upload model image');
        }

        const modelData = await modelResponse.json();

        // 上传服装图片
        setStep('Uploading clothing image...');
        const clothingResponse = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            image: clothingImage
          }),
        });

        if (!clothingResponse.ok) {
          throw new Error('Failed to upload clothing image');
        }

        const clothingData = await clothingResponse.json();

        // 开始生成过程
        setStep('Initializing virtual try-on...');
        const tryonResponse = await fetch('/api/tryon', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            modelImageUrl: modelData.url,
            clothingImageUrl: clothingData.url,
          }),
        });

        if (!tryonResponse.ok) {
          throw new Error('Failed to start try-on process');
        }

        const tryonData = await tryonResponse.json();

        // 轮询检查生成状态
        setStep('Generating try-on result...');
        let retryCount = 0;
        const maxRetries = 20;
        const retryInterval = 5000;

        const saveToHistory = (imageUrl: string) => {
          try {
            // 保存到历史记录
            const historyData = localStorage.getItem('tryonHistory');
            const history = historyData ? JSON.parse(historyData) : [];
            history.unshift({
              imageUrl,
              timestamp: Date.now()
            });
            localStorage.setItem('tryonHistory', JSON.stringify(history));

            // 保存当前生成结果
            const currentResult: GenerationResult = {
              imageUrl,
              timestamp: Date.now()
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(currentResult));

            // 更新 URL
            router.replace(
              {
                pathname: router.pathname,
                query: { ...router.query, status: 'completed', imageUrl }
              },
              undefined,
              { shallow: true }
            );
          } catch (error) {
            console.error('Failed to save results:', error);
          }
        };

        const checkStatus = async () => {
          try {
            const response = await fetch(`/api/status?taskId=${tryonData.taskId}`);
            const data = await response.json();

            if (data.status === 'SUCCEEDED' && data.imageUrl) {
              setStatus('completed');
              setResultImage(data.imageUrl);
              saveToHistory(data.imageUrl);
              return true;
            } else if (data.status === 'FAILED') {
              setStatus('failed');
              return true;
            }
            return false;
          } catch (error) {
            console.error('Error checking status:', error);
            setStatus('failed');
            return true;
          }
        };

        const startChecking = async () => {
          while (retryCount < maxRetries) {
            const isDone = await checkStatus();
            if (isDone) break;
            
            setStep(`Generating try-on result... (${retryCount + 1}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, retryInterval));
            retryCount++;
          }

          if (retryCount >= maxRetries) {
            throw new Error('Generation timed out, please try again');
          }
        };

        await startChecking();
      } catch (err) {
        console.error('Generation error:', err);
        setError(err instanceof Error ? err.message : 'Generation failed');
        setStatus('error');
      } finally {
        // 清理临时图片数据
        localStorage.removeItem('modelImage');
        localStorage.removeItem('clothingImage');
      }
    };

    startGeneration();
  }, [session_id, urlStatus, urlImageUrl, router]);

  // 清理函数：离开页面时清除当前生成结果
  useEffect(() => {
    return () => {
      localStorage.removeItem(STORAGE_KEY);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-12 px-4 sm:px-6 lg:px-8">
      <Head>
        <title>Processing | DressMeAI</title>
      </Head>

      <div className="max-w-3xl mx-auto text-center">
        {status === 'loading' && (
          <div>
            <h2 className="text-2xl font-semibold mb-4">{step}</h2>
            <div className="flex justify-center items-center space-x-2">
              <div className="w-4 h-4 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
              <div className="w-4 h-4 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
              <div className="w-4 h-4 bg-blue-600 rounded-full animate-bounce"></div>
            </div>
            <p className="mt-4 text-gray-600">Please wait, this may take a few minutes</p>
          </div>
        )}

        {(status === 'success' || status === 'completed') && resultImage && (
          <div>
            <h2 className="text-2xl font-semibold mb-4">Generation Successful!</h2>
            <div className="relative w-full h-96 mb-4">
              <Image
                src={resultImage}
                alt="Try-on Result"
                fill
                className="object-contain rounded-lg"
                unoptimized={true}
              />
            </div>
            <button
              onClick={() => router.push('/')}
              className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Back to Home
            </button>
          </div>
        )}

        {(status === 'error' || status === 'failed') && (
          <div>
            <h2 className="text-2xl font-semibold text-red-600 mb-4">Generation Failed</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
} 
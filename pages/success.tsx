import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import Head from 'next/head';
import { safeGetJSONItem, safeSetJSONItem, safeRemoveItem, safeGetItem } from '../utils/localStorage';

type Status = 'loading' | 'success' | 'error' | 'completed' | 'failed';

interface GenerationResult {
  imageUrl: string;
  timestamp: number;
  sessionId?: string;
}

const STORAGE_KEY = 'currentGeneration';

export default function Success() {
  const router = useRouter();
  const { session_id, status: urlStatus, imageUrl: urlImageUrl } = router.query;
  const sessionId = useMemo(() => {
    if (Array.isArray(session_id)) return session_id[0];
    return typeof session_id === 'string' ? session_id : undefined;
  }, [session_id]);
  const statusParam = useMemo(() => {
    if (Array.isArray(urlStatus)) return urlStatus[0];
    return typeof urlStatus === 'string' ? urlStatus : undefined;
  }, [urlStatus]);
  const imageUrlParam = useMemo(() => {
    if (Array.isArray(urlImageUrl)) return urlImageUrl[0];
    return typeof urlImageUrl === 'string' ? urlImageUrl : undefined;
  }, [urlImageUrl]);
  const [status, setStatus] = useState<Status>('loading');
  const [step, setStep] = useState<string>('Checking generation status...');
  const [resultImage, setResultImage] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!router.isReady) return;

    // 如果 URL 已经包含完成状态和图片 URL，直接显示结果
    if (statusParam === 'completed' && imageUrlParam) {
      setStatus('completed');
      setResultImage(imageUrlParam);
      return;
    }

    // 检查 localStorage 中是否有未完成的生成结果
    const savedResult = safeGetJSONItem<GenerationResult | null>(STORAGE_KEY, null);
    if (savedResult && savedResult.imageUrl && sessionId && savedResult.sessionId === sessionId) {
      setStatus('completed');
      setResultImage(savedResult.imageUrl);
      // 更新 URL，但不触发页面刷新
      router.replace(
        {
          pathname: router.pathname,
          query: { ...router.query, session_id: sessionId, status: 'completed', imageUrl: savedResult.imageUrl }
        },
        undefined,
        { shallow: true }
      );
      return;
    }

    if (!sessionId) return;

    const startGeneration = async () => {
      try {
        // 验证支付状态
        setStep('Verifying payment status...');
        const verifyResponse = await fetch(`/api/verify-payment?session_id=${sessionId}`);
        if (!verifyResponse.ok) {
          throw new Error('Payment verification failed');
        }

        const { success } = await verifyResponse.json();
        if (!success) {
          throw new Error('Payment not completed');
        }

        // 从 localStorage 获取图片数据
        setStep('Retrieving image data...');
        console.log('Checking for image data in storage...');
        
        const modelImage = safeGetItem('modelImage');
        const clothingImage = safeGetItem('clothingImage');
        
        console.log('Model image found:', !!modelImage, modelImage ? `${modelImage.length} chars` : 'null');
        console.log('Clothing image found:', !!clothingImage, clothingImage ? `${clothingImage.length} chars` : 'null');
        
        // 检查时间戳
        const timestamp = safeGetItem('imageUploadTimestamp');
        console.log('Image upload timestamp:', timestamp);
        if (timestamp) {
          const uploadTime = new Date(parseInt(timestamp));
          const now = new Date();
          const timeDiff = now.getTime() - uploadTime.getTime();
          console.log('Time since upload:', Math.round(timeDiff / 1000), 'seconds');
        }
        
        // 检查localStorage和sessionStorage的状态
        if (typeof window !== 'undefined') {
          console.log('localStorage keys:', Object.keys(localStorage));
          console.log('sessionStorage keys:', Object.keys(sessionStorage));
        }

        if (!modelImage || !clothingImage) {
          const errorMsg = `Image data not found. Model: ${!!modelImage}, Clothing: ${!!clothingImage}. Please upload again.`;
          console.error(errorMsg);
          throw new Error(errorMsg);
        }

        // 上传模特图片
        setStep('Uploading model image...');
        console.log('Starting model image upload...');
        console.log('Model image data length:', modelImage.length);
        
        const modelResponse = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            image: modelImage
          }),
        });

        console.log('Model upload response status:', modelResponse.status);
        
        if (!modelResponse.ok) {
          const errorText = await modelResponse.text();
          console.error('Model upload failed:', errorText);
          throw new Error(`Failed to upload model image: ${errorText}`);
        }

        const modelData = await modelResponse.json();
        console.log('Model upload successful:', modelData.url);

        // 上传服装图片
        setStep('Uploading clothing image...');
        console.log('Starting clothing image upload...');
        console.log('Clothing image data length:', clothingImage.length);
        
        const clothingResponse = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            image: clothingImage
          }),
        });

        console.log('Clothing upload response status:', clothingResponse.status);
        
        if (!clothingResponse.ok) {
          const errorText = await clothingResponse.text();
          console.error('Clothing upload failed:', errorText);
          throw new Error(`Failed to upload clothing image: ${errorText}`);
        }

        const clothingData = await clothingResponse.json();
        console.log('Clothing upload successful:', clothingData.url);

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
            const history = safeGetJSONItem<any[]>('tryonHistory', []);
            history.unshift({
              imageUrl,
              timestamp: Date.now()
            });
            safeSetJSONItem('tryonHistory', history);

            // 保存当前生成结果
            const currentResult: GenerationResult = {
              imageUrl,
              timestamp: Date.now(),
              sessionId
            };
            safeSetJSONItem(STORAGE_KEY, currentResult);

            // 更新 URL
            router.replace(
              {
                pathname: router.pathname,
                query: { ...router.query, session_id: sessionId, status: 'completed', imageUrl }
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
        safeRemoveItem('modelImage');
        safeRemoveItem('clothingImage');
      }
    };

    startGeneration();
  }, [router.isReady, sessionId, statusParam, imageUrlParam, router]);

  // 清理函数：离开页面时清除当前生成结果
  useEffect(() => {
    return () => {
      safeRemoveItem(STORAGE_KEY);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-12 px-4 sm:px-6 lg:px-8">
      <Head>
        <title>Processing | DressMeAI</title>
        <meta name="robots" content="noindex, nofollow, noarchive" />
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

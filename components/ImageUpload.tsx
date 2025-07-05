import { useState, useRef } from 'react';
import Image from 'next/image';

interface ImageUploadProps {
  label: string;
  onImageSelect: (file: File | null) => void;
  acceptedTypes?: string[];
  maxSize?: number; // 单位: MB
}

// 文件大小格式化函数
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 图片压缩函数
async function compressImage(file: File, maxSize: number): Promise<File> {
  // 如果文件已经很小，直接返回
  if (file.size <= maxSize * 1024 * 1024 * 0.8) { // 80% of max size
    return file;
  }

  return new Promise((resolve, reject) => {
    const image = document.createElement('img');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('无法创建画布上下文'));
      return;
    }

    image.onload = () => {
      // 计算压缩后的尺寸
      let { width, height } = image;
      const maxDimension = 1024; // 最大尺寸限制
      
      if (width > height && width > maxDimension) {
        height = (height * maxDimension) / width;
        width = maxDimension;
      } else if (height > maxDimension) {
        width = (width * maxDimension) / height;
        height = maxDimension;
      }

      canvas.width = width;
      canvas.height = height;
      
      // 绘制压缩后的图片
      ctx.drawImage(image, 0, 0, width, height);
      
      // 动态调整质量以满足大小要求
      let quality = 0.8;
      const tryCompress = (currentQuality: number) => {
        canvas.toBlob(
          (blob) => {
            if (blob) {
              if (blob.size <= maxSize * 1024 * 1024 || currentQuality <= 0.1) {
                resolve(new File([blob], file.name, { 
                  type: 'image/jpeg',
                  lastModified: Date.now()
                }));
              } else {
                // 如果还是太大，继续降低质量
                tryCompress(currentQuality - 0.1);
              }
            } else {
              reject(new Error('图片压缩失败'));
            }
          },
          'image/jpeg',
          currentQuality
        );
      };
      
      tryCompress(quality);
    };

    image.onerror = () => {
      reject(new Error('图片加载失败'));
    };
    
    image.src = URL.createObjectURL(file);
  });
}

export default function ImageUpload({ 
  label, 
  onImageSelect, 
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'],
  maxSize = 1 // 默认最大1MB
}: ImageUploadProps) {
  const [preview, setPreview] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [fileInfo, setFileInfo] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      // 清空选择
      setPreview('');
      setError('');
      setFileInfo('');
      onImageSelect(null);
      return;
    }

    setError('');
    setIsProcessing(true);

    try {
      // 1. 立即检查文件类型
      if (!acceptedTypes.includes(file.type)) {
        throw new Error(`请上传 ${acceptedTypes.map(type => type.split('/')[1].toUpperCase()).join(' 或 ')} 格式的图片`);
      }

      // 2. 立即检查文件大小
      const maxSizeBytes = maxSize * 1024 * 1024;
      if (file.size > maxSizeBytes * 3) { // 如果超过限制的3倍，直接拒绝
        throw new Error(`图片文件过大！\n当前文件：${formatFileSize(file.size)}\n最大限制：${formatFileSize(maxSizeBytes)}\n请选择更小的图片文件`);
      }

      // 3. 显示原始文件信息
      setFileInfo(`原始文件：${formatFileSize(file.size)}`);

      let processedFile = file;

      // 4. 如果文件超过限制，尝试压缩
      if (file.size > maxSizeBytes) {
        setFileInfo(`正在压缩图片...（原始：${formatFileSize(file.size)}）`);
        processedFile = await compressImage(file, maxSize);
        
        if (processedFile.size > maxSizeBytes) {
          throw new Error(`压缩后文件仍然过大！\n压缩后：${formatFileSize(processedFile.size)}\n最大限制：${formatFileSize(maxSizeBytes)}\n请选择分辨率更低的图片`);
        }
      }

      // 5. 创建预览
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(processedFile);

      // 6. 更新文件信息
      const finalInfo = processedFile.size !== file.size 
        ? `已压缩：${formatFileSize(file.size)} → ${formatFileSize(processedFile.size)}`
        : `文件大小：${formatFileSize(processedFile.size)}`;
      
      setFileInfo(finalInfo);
      setError('');
      onImageSelect(processedFile);

    } catch (err: any) {
      setError(err.message || '图片处理失败');
      setPreview('');
      setFileInfo('');
      onImageSelect(null);
      
      // 清空文件输入
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClick = () => {
    if (!isProcessing) {
      fileInputRef.current?.click();
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreview('');
    setError('');
    setFileInfo('');
    onImageSelect(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full">
      <div 
        onClick={handleClick}
        className={`border-2 border-dashed rounded-lg p-6 transition-colors text-center relative
                   ${isProcessing ? 'border-yellow-300 bg-yellow-50 cursor-wait' : 
                     error ? 'border-red-300 bg-red-50 cursor-pointer' : 
                     preview ? 'border-green-300 bg-green-50 cursor-pointer' : 
                     'border-gray-300 hover:border-blue-500 cursor-pointer'}`}
      >
        {isProcessing ? (
          <div className="space-y-2">
            <div className="animate-spin mx-auto w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            <div className="text-blue-600">处理中...</div>
            {fileInfo && <div className="text-sm text-gray-500">{fileInfo}</div>}
          </div>
        ) : preview ? (
          <div className="space-y-3">
            <div className="relative w-full h-64">
              <Image
                src={preview}
                alt="预览"
                fill
                className="object-contain rounded-lg"
                unoptimized={true}
              />
              <button
                onClick={handleClear}
                className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600 transition-colors"
                title="清除图片"
              >
                ×
              </button>
            </div>
            {fileInfo && (
              <div className="text-sm text-green-600 font-medium">{fileInfo}</div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-gray-600">{label}</div>
            <div className="text-sm text-gray-400">
              点击或拖拽上传图片
            </div>
            <div className="text-xs text-gray-500">
              支持 JPG、PNG、WebP 格式<br/>
              文件大小限制：{formatFileSize(maxSize * 1024 * 1024)}
            </div>
          </div>
        )}
        
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedTypes.join(',')}
          onChange={handleFileSelect}
          className="hidden"
          disabled={isProcessing}
        />
      </div>
      
      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start space-x-2">
            <div className="text-red-500 text-sm">⚠️</div>
            <div className="text-red-600 text-sm whitespace-pre-line leading-relaxed">
              {error}
            </div>
          </div>
        </div>
      )}
      
      {!error && !preview && (
        <div className="mt-2 text-xs text-gray-500">
          💡 提示：如果图片过大，系统会自动压缩以符合 {formatFileSize(maxSize * 1024 * 1024)} 的限制
        </div>
      )}
    </div>
  );
} 
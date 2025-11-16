import { useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { useLocale, useTranslations } from 'next-intl'

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

type TranslateFn = ReturnType<typeof useTranslations>

// 图片压缩函数
async function compressImage(file: File, maxSize: number, t: TranslateFn): Promise<File> {
  // 如果文件已经很小，直接返回
  if (file.size <= maxSize * 1024 * 1024 * 0.8) { // 80% of max size
    return file;
  }

  return new Promise((resolve, reject) => {
    const image = document.createElement('img');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error(t('errors.canvas')))
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
              reject(new Error(t('errors.compress')))
            }
          },
          'image/jpeg',
          currentQuality
        );
      };
      
      tryCompress(quality);
    };

    image.onerror = () => {
      reject(new Error(t('errors.load')))
    }

    image.src = URL.createObjectURL(file);
  });
}

export default function ImageUpload({ 
  label, 
  onImageSelect, 
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'],
  maxSize = 5 // 默认最大5MB
}: ImageUploadProps) {
  const [preview, setPreview] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [fileInfo, setFileInfo] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = useTranslations('components.imageUpload')
  const locale = useLocale()

  const acceptedTypeLabels = useMemo(
    () => acceptedTypes.map(type => type.split('/')[1]?.toUpperCase() ?? type),
    [acceptedTypes]
  )

  const formattedTypeList = useMemo(() => {
    try {
      const formatter = new Intl.ListFormat(locale, { style: 'long', type: 'disjunction' })
      return formatter.format(acceptedTypeLabels)
    } catch {
      return acceptedTypeLabels.join(', ')
    }
  }, [acceptedTypeLabels, locale])

  const readableSizeLimit = formatFileSize(maxSize * 1024 * 1024)

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
        throw new Error(t('errors.invalidType', { types: formattedTypeList }));
      }

      // 2. 立即检查文件大小
      const maxSizeBytes = maxSize * 1024 * 1024;
      if (file.size > maxSizeBytes * 3) { // 如果超过限制的3倍，直接拒绝
        throw new Error(
          t('errors.tooLarge', {
            current: formatFileSize(file.size),
            max: formatFileSize(maxSizeBytes)
          })
        )
      }

      // 3. 显示原始文件信息
      setFileInfo(t('info.originalSize', { size: formatFileSize(file.size) }));

      let processedFile = file;

      // 4. 如果文件超过限制，尝试压缩
      if (file.size > maxSizeBytes) {
        setFileInfo(t('info.compressing', { size: formatFileSize(file.size) }));
        processedFile = await compressImage(file, maxSize, t);
        
        if (processedFile.size > maxSizeBytes) {
          throw new Error(
            t('errors.stillTooLarge', {
              compressed: formatFileSize(processedFile.size),
              max: formatFileSize(maxSizeBytes)
            })
          )
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
        ? t('info.compressed', {
            from: formatFileSize(file.size),
            to: formatFileSize(processedFile.size)
          })
        : t('info.fileSize', { size: formatFileSize(processedFile.size) });
      
      setFileInfo(finalInfo);
      setError('');
      onImageSelect(processedFile);

    } catch (err: any) {
      setError(err instanceof Error ? err.message : t('errors.generic'));
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
            <div className="text-blue-600">{t('processing')}</div>
            {fileInfo && <div className="text-sm text-gray-500">{fileInfo}</div>}
          </div>
        ) : preview ? (
          <div className="space-y-3">
            <div className="relative w-full h-64">
              <Image
                src={preview}
                alt={t('previewAlt')}
                fill
                className="object-contain rounded-lg"
                unoptimized={true}
              />
              <button
                onClick={handleClear}
                className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600 transition-colors"
                title={t('clearButton')}
                aria-label={t('clearButton')}
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
              {t('uploadPrompt')}
            </div>
            <div className="text-xs text-gray-500 space-y-1">
              <div>{t('supportedFormats', { types: formattedTypeList })}</div>
              <div>{t('sizeLimit', { size: readableSizeLimit })}</div>
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
          💡 {t('autoCompressHint', { size: readableSizeLimit })}
        </div>
      )}
    </div>
  );
} 

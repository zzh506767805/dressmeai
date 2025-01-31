import { useState, useRef } from 'react';
import Image from 'next/image';

interface ImageUploadProps {
  label: string;
  onImageSelect: (file: File) => void;
  acceptedTypes?: string[];
  maxSize?: number; // 单位: MB
}

// 图片压缩函数
async function compressImage(file: File): Promise<File> {
  // 检查文件大小是否超过3M
  if (file.size > 3 * 1024 * 1024) {
    throw new Error('Image size cannot exceed 3MB');
  }

  // 如果小于1M就不压缩了
  if (file.size < 1024 * 1024) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const image = document.createElement('img');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    image.onload = () => {
      canvas.width = image.width;
      canvas.height = image.height;
      ctx?.drawImage(image, 0, 0);
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(new File([blob], file.name, { type: 'image/jpeg' }));
          } else {
            reject(new Error('压缩失败'));
          }
        },
        'image/jpeg',
        0.7
      );
    };

    image.onerror = () => {
      reject(new Error('Failed to load image'));
    };
    
    image.src = URL.createObjectURL(file);
  });
}

export default function ImageUpload({ 
  label, 
  onImageSelect, 
  acceptedTypes = ['image/jpeg', 'image/png'],
  maxSize = 3 // 默认最大3MB
}: ImageUploadProps) {
  const [preview, setPreview] = useState<string>('');
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    if (!acceptedTypes.includes(file.type)) {
      setError('Please upload JPG or PNG format images');
      return;
    }

    try {
      // 压缩图片
      const compressedFile = await compressImage(file);
      
      // 创建预览URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(compressedFile);

      setError('');
      onImageSelect(compressedFile);
    } catch (err: any) {
      setError(err.message || 'Failed to process image');
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full">
      <div 
        onClick={handleClick}
        className="border-2 border-dashed border-gray-300 rounded-lg p-6 cursor-pointer
                   hover:border-blue-500 transition-colors text-center"
      >
        {preview ? (
          <div className="relative w-full h-64">
            <Image
              src={preview}
              alt="Preview"
              fill
              className="object-contain rounded-lg"
              unoptimized={true}
            />
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-gray-600">{label}</div>
            <div className="text-sm text-gray-400">Click or drag to upload</div>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedTypes.join(',')}
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
      {error && <p className="mt-2 text-red-500 text-sm">{error}</p>}
    </div>
  );
} 
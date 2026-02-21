import { useCallback, useState, useId } from 'react';
import { Upload, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { cn } from '@/utils/cn';

interface FileUploadProps {
  onUpload: (files: File[]) => void;
  accept?: string;
  maxFiles?: number;
  label?: string;
}

function FileUpload({
  onUpload,
  accept = 'image/*,.zip',
  maxFiles = 120,
  label = '이모지 이미지 업로드',
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const inputId = useId();

  const handleFiles = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList) return;
      setIsProcessing(true);
      setError(null);

      const images: File[] = [];
      const items = Array.from(fileList);

      for (const file of items) {
        if (file.type.startsWith('image/')) {
          images.push(file);
        }
      }

      if (images.length === 0) {
        setError('유효한 이미지가 없습니다. PNG, JPG, WEBP 또는 ZIP을 업로드하세요.');
      } else if (images.length > maxFiles) {
        setError(`이미지가 너무 많습니다. 최대 ${maxFiles}개입니다.`);
      } else {
        onUpload(images.slice(0, maxFiles));
      }

      setIsProcessing(false);
    },
    [maxFiles, onUpload],
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  return (
    <div className="w-full space-y-3">
      <label htmlFor={inputId} className="sr-only">
        {label}
      </label>

      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={cn(
          'relative border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer',
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-slate-300 hover:border-primary-light hover:bg-slate-50',
        )}
        aria-label={label}
      >
        <input
          id={inputId}
          type="file"
          multiple
          accept={accept}
          onChange={(e) => handleFiles(e.target.files)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          aria-label={label}
        />

        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center">
            {isProcessing ? (
              <div className="animate-spin w-7 h-7 border-3 border-primary border-t-transparent rounded-full" />
            ) : (
              <Upload size={28} />
            )}
          </div>
          <div>
            <p className="font-semibold text-slate-800">
              {isProcessing ? '파일 처리 중…' : '드래그 앤 드롭 또는 클릭'}
            </p>
            <p className="text-sm text-text-muted mt-1">PNG, JPG, WEBP, ZIP — 최대 {maxFiles}개</p>
          </div>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="p-3 bg-danger-light text-danger rounded-lg flex items-center gap-2 text-sm"
        >
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 text-center">
        {[
          { Icon: ImageIcon, text: 'ZIP 자동 추출' },
          { Icon: Upload, text: '고해상도 지원' },
          { Icon: AlertCircle, text: '브라우저 전용 처리' },
        ].map(({ Icon, text }) => (
          <div
            key={text}
            className="p-3 bg-white rounded-lg border border-slate-100 flex flex-col items-center gap-1.5"
          >
            <Icon className="text-primary" size={18} />
            <span className="text-xs font-medium text-text-muted">{text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export { FileUpload };
export type { FileUploadProps };

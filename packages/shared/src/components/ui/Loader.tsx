import { Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';

interface LoaderProps {
  text?: string;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_MAP: Record<NonNullable<LoaderProps['size']>, number> = {
  sm: 16,
  md: 24,
  lg: 36,
};

function Loader({ text, size = 'md' }: LoaderProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={text ?? 'Loading'}
      className="flex flex-col items-center justify-center gap-3 py-12"
    >
      <Loader2
        className={cn('animate-spin text-primary')}
        size={SIZE_MAP[size]}
      />
      {text && <p className="text-sm text-text-muted">{text}</p>}
    </div>
  );
}

export { Loader };
export type { LoaderProps };

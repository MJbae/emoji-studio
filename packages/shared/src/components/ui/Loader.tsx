import { cn } from '@/utils/cn';

interface LoaderProps {
  text?: string;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_MAP: Record<NonNullable<LoaderProps['size']>, { w: string; inner: string }> = {
  sm: { w: 'w-6 h-6', inner: 'inset-[2px] rounded-full' },
  md: { w: 'w-12 h-12', inner: 'inset-[3px] rounded-full' },
  lg: { w: 'w-20 h-20', inner: 'inset-[4px] rounded-full' },
};

function Loader({ text, size = 'md' }: LoaderProps) {
  const dimensions = SIZE_MAP[size] || SIZE_MAP.md;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={text ?? 'Loading'}
      className="flex flex-col items-center justify-center gap-4 py-8"
    >
      <div
        className={cn('relative overflow-hidden rounded-full', dimensions.w)}
        aria-hidden="true"
      >
        <span className="absolute left-1/2 top-1/2 aspect-square w-[200%] -translate-x-1/2 -translate-y-1/2 animate-[spin_1.5s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_0_270deg,rgba(6,199,85,0.2)_330deg,#06C755_360deg)]" />
        <span className={cn('absolute bg-white', dimensions.inner)} />
      </div>
      {text && <p className="text-sm font-medium text-slate-700 animate-pulse">{text}</p>}
    </div>
  );
}

export { Loader };
export type { LoaderProps };

import { cn } from '@/lib/utils';

export type ChipColor = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'default';
export type ChipVariant = 'contained' | 'outlined';

type ChipProps = {
  label: React.ReactNode;
  icon?: React.ElementType;
  color?: ChipColor;
  variant?: ChipVariant;
  className?: string;
};

const colorVariantClasses: Record<ChipColor, Record<ChipVariant, string>> = {
  primary: {
    contained: 'border border-primary bg-primary-subtle text-primary',
    outlined: 'border border-primary bg-transparent text-primary',
  },
  secondary: {
    contained: 'border border-secondary bg-secondary-subtle text-secondary',
    outlined: 'border border-secondary bg-transparent text-secondaryy',
  },
  success: {
    contained: 'border border-success bg-success-subtle text-success',
    outlined: 'border border-success bg-transparent text-success',
  },
  warning: {
    contained: 'border border-warning bg-warning-subtle text-warning',
    outlined: 'border border-warning bg-transparent text-warning',
  },
  error: {
    contained: 'border border-destructive bg-destructive-subtle text-destructive',
    outlined: 'border border-destructive bg-transparent text-destructive',
  },
  default: {
    contained: 'bg-secondary text-secondary-foreground',
    outlined: 'border border-border bg-transparent text-foreground',
  },
};

export const Chip = ({
  label,
  icon: Icon,
  color = 'default',
  variant = 'contained',
  className,
}: ChipProps) => (
  <div
    className={cn(
      'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-caption font-medium w-fit',
      colorVariantClasses[color][variant],
      className
    )}
  >
    {Icon && <Icon className="h-3 w-3 shrink-0" />}
    {label}
  </div>
);

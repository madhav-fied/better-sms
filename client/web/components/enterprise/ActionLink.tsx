import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ActionLinkProps {
  href: string;
  children: React.ReactNode;
  variant?: 'default' | 'outline' | 'secondary' | 'destructive';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
}

export default function ActionLink({
  href,
  children,
  variant = 'outline',
  size = 'sm',
  className,
}: ActionLinkProps) {
  return (
    <Link href={href} className={cn(buttonVariants({ variant, size }), className)}>
      {children}
    </Link>
  );
}

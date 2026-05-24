import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface LabeledSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  hint?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export default function LabeledSelect({
  label,
  hint,
  options,
  placeholder = 'Select…',
  className,
  id,
  ...props
}: LabeledSelectProps) {
  const selectId = id ?? label.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="space-y-1.5">
      <Label htmlFor={selectId} className="text-slate-700">
        {label}
      </Label>
      <select
        id={selectId}
        className={cn(
          'block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200',
          className,
        )}
        {...props}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

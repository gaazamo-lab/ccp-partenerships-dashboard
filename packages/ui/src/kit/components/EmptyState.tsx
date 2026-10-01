import type { ReactNode } from 'react';

interface EmptyStateProps {
  /** One line saying what is missing. */
  message: string;
  /** Optional second line telling the user how to fix it. */
  hint?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

/**
 * The "nothing here" panel. Always pair the message with either a hint or an
 * action so an empty screen tells the user what to do next.
 */
export function EmptyState({ message, hint, icon, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      {icon ? (
        <span className="grid size-11 place-items-center rounded-full bg-primary/10 text-primary">
          {icon}
        </span>
      ) : null}
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{message}</p>
        {hint ? <p className="text-sm text-foreground-muted">{hint}</p> : null}
      </div>
      {action}
    </div>
  );
}

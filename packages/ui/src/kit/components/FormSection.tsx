import { type ReactNode, useId } from 'react';

interface FormSectionProps {
  title: ReactNode;
  /** One line under the title saying what this group of fields is for. */
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * A titled group of fields on a form page: a soft, roomy card with the title
 * and a one-line description above the fields. Form pages stack these instead
 * of `SectionCard`, which is sized for dense detail screens.
 */
export function FormSection({ title, description, children, className }: FormSectionProps) {
  const titleId = useId();
  return (
    <section
      aria-labelledby={titleId}
      className={[
        'rounded-[20px] border border-border-subtle bg-surface p-5 shadow-[0_1px_2px_rgb(16_24_40/0.03)] sm:p-8',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <header className="mb-6 space-y-1">
        <h2 id={titleId} className="text-xl font-semibold tracking-tight text-foreground">
          {title}
        </h2>
        {description ? (
          <p className="text-[15px] leading-6 text-foreground-secondary">{description}</p>
        ) : null}
      </header>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

/** The Cancel / Submit row under a form page's sections. */
export function FormActions({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center justify-end gap-3">{children}</div>;
}

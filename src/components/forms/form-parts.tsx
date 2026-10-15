import { Alert, AlertDescription } from '@/components/ui/alert';
import type { AuthFormState } from '@/lib/auth/form-state';

/**
 * Inline validation message for a single field.
 *
 * Rendered with a stable id so the input can point at it via
 * aria-describedby, and role="alert" so it is announced when it appears.
 */
export function FieldError({ id, message }: { id: string; message?: string }) {
  if (message === undefined) {
    return null;
  }

  return (
    <p id={id} role="alert" className="text-sm font-medium text-destructive">
      {message}
    </p>
  );
}

/** Form-level banner for the result of a submission. */
export function FormMessage({ state }: { state: AuthFormState }) {
  if (state.message === null || state.status === 'idle') {
    return null;
  }

  return (
    <Alert variant={state.status === 'success' ? 'success' : 'destructive'}>
      <AlertDescription>{state.message}</AlertDescription>
    </Alert>
  );
}

/**
 * Accessibility wiring for an input that may carry an error.
 *
 * Spread onto the input so aria-invalid and aria-describedby cannot drift out
 * of step with whether a message is actually being shown.
 */
export function errorProps(
  fieldName: string,
  fields: Record<string, string>,
): { 'aria-invalid'?: true; 'aria-describedby'?: string } {
  return fields[fieldName] === undefined
    ? {}
    : { 'aria-invalid': true, 'aria-describedby': `${fieldName}-error` };
}

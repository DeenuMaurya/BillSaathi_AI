/**
 * Shared state shape for authentication forms.
 *
 * Lives in its own module because a `'use server'` file may only export async
 * functions -- exporting this type and constant from actions.ts would be a
 * build error, and the client form components need both.
 */
export interface AuthFormState {
  status: 'idle' | 'error' | 'success';
  message: string | null;
  /** Field name -> validation message, for rendering beside each input. */
  fields: Record<string, string>;
}

export const initialAuthFormState: AuthFormState = {
  status: 'idle',
  message: null,
  fields: {},
};

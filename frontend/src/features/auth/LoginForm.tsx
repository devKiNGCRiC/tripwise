/**
 * LoginForm.tsx — email + password login.
 * Field errors come from Zod (instant, client-side); server errors (wrong password,
 * blocked account) appear in an alert banner above the fields.
 */
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ApiError } from '@/lib/api/errors';
import { useAuth } from './AuthProvider';
import { loginSchema, type LoginValues } from './schemas';
import { useFinishAuth } from './useFinishAuth';

export function LoginForm() {
  const { login } = useAuth();
  const finishAuth = useFinishAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  /** Runs only after Zod validation passes. */
  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      finishAuth(await login(values), 'login');
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : 'Something went wrong. Please try again.');
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {serverError && <FormAlert message={serverError} />}
      <Input label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
      <Input
        label="Password"
        type="password"
        autoComplete="current-password"
        error={errors.password?.message}
        {...register('password')}
      />
      <Button type="submit" size="lg" fullWidth loading={isSubmitting}>
        Log in
      </Button>
    </form>
  );
}

/** Red banner for errors that come back from the server. */
export function FormAlert({ message }: { message: string }) {
  return (
    <p role="alert" className="rounded-2xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
      {message}
    </p>
  );
}

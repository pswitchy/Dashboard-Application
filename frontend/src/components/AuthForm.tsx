'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import { toast } from 'sonner'; // Use Sonner for toasts
import { AxiosError } from 'axios';
// Need to import useRouter from 'next/navigation' at the top
import { useRouter } from 'next/navigation';
// Need to import axios if not already imported
import axios from 'axios';

const formSchema = z.object({
  username: z.string().min(3, { message: 'Username must be at least 3 characters.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

type FormData = z.infer<typeof formSchema>;

interface AuthFormProps {
  mode: 'login' | 'signup';
}

export function AuthForm({ mode }: AuthFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter(); // Import from next/navigation

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    const endpoint = mode === 'login' ? '/auth/login' : '/auth/signup';
    console.log(`AuthForm: Submitting to ${endpoint}`);
    try {
      const response = await api.post(endpoint, data);
      console.log('AuthForm: API Response Data:', response.data);

      // Check for success status and USER data (token is now in cookie)
      if (response.data.status === 'success' && response.data.data?.user) {
        toast.success(mode === 'login' ? 'Login successful! Proceeding...' : 'Signup successful! Proceeding...');
        console.log('AuthForm: Success condition met. Calling context login...');
        // Pass only the user data to the context's login function
        login(response.data.data.user); // <-- Adjust arguments
        console.log('AuthForm: Context login function invoked.');
      } else {
        console.error('AuthForm: API response status was not "success" or user data missing.', response.data);
        toast.error(response.data?.message || 'Login failed: Invalid response from server.');
      }
    } catch (error) {
       console.error(`${mode} failed:`, error);
       let errorMessage = `An error occurred during ${mode}.`;
       if (axios.isAxiosError(error)) {
           const axiosError = error as AxiosError<{ message?: string }>;
           errorMessage = axiosError.response?.data?.message || axiosError.message || errorMessage;
       } else if (error instanceof Error) {
           errorMessage = error.message;
       }
       toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-sm shadow-lg">
      <CardHeader>
        <CardTitle>{mode === 'login' ? 'Login' : 'Sign Up'}</CardTitle>
        <CardDescription>
          {mode === 'login' ? 'Enter your credentials to access your dashboard.' : 'Create an account to get started.'}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              {...register('username')}
              placeholder="yourusername"
              disabled={isLoading}
            />
            {errors.username && <p className="text-xs text-red-500">{errors.username.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              {...register('password')}
              placeholder="••••••••"
              disabled={isLoading}
            />
            {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-3">
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Processing...' : (mode === 'login' ? 'Login' : 'Sign Up')}
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <Link href={mode === 'login' ? '/signup' : '/login'} className="underline hover:text-primary">
              {mode === 'login' ? 'Sign up' : 'Login'}
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}


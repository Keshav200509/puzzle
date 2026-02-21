import { AuthClient } from '@/components/auth-client';
import { isGoogleAuthConfigured, isNextAuthConfigured } from '@/lib/server/auth';

export default function AuthPage() {
  return <AuthClient googleConfigured={isGoogleAuthConfigured()} nextAuthConfigured={isNextAuthConfigured()} />;
}

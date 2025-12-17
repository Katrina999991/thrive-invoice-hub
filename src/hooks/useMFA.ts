import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface MFAStatus {
  enabled: boolean;
  enabledAt?: string;
  lastVerifiedAt?: string;
  remainingRecoveryCodes: number;
}

interface SetupData {
  secret: string;
  otpAuthUri: string;
}

export function useMFA() {
  const { user } = useAuth();
  const [status, setStatus] = useState<MFAStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke('mfa-totp', {
        body: { action: 'status' }
      });
      
      if (fnError) throw fnError;
      setStatus(data);
    } catch (err: any) {
      console.error('Error fetching MFA status:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const initiateSetup = async (): Promise<SetupData | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke('mfa-totp', {
        body: { action: 'setup' }
      });
      
      if (fnError) throw fnError;
      return data as SetupData;
    } catch (err: any) {
      console.error('Error initiating MFA setup:', err);
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const verifySetup = async (code: string): Promise<{ success: boolean; recoveryCodes?: string[] }> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke('mfa-totp', {
        body: { action: 'verify-setup', code }
      });
      
      if (fnError) throw fnError;
      
      if (data.success) {
        await fetchStatus();
        return { success: true, recoveryCodes: data.recoveryCodes };
      }
      
      throw new Error(data.error || 'Vérification échouée');
    } catch (err: any) {
      console.error('Error verifying MFA setup:', err);
      setError(err.message);
      return { success: false };
    } finally {
      setIsLoading(false);
    }
  };

  const disable = async (code: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke('mfa-totp', {
        body: { action: 'disable', code }
      });
      
      if (fnError) throw fnError;
      
      if (data.success) {
        await fetchStatus();
        return true;
      }
      
      throw new Error(data.error || 'Désactivation échouée');
    } catch (err: any) {
      console.error('Error disabling MFA:', err);
      setError(err.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    status,
    isLoading,
    error,
    fetchStatus,
    initiateSetup,
    verifySetup,
    disable
  };
}

// Separate function for login verification (no auth context needed)
export async function verifyMFALogin(userId: string, code: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error: fnError } = await supabase.functions.invoke('mfa-totp', {
      body: { action: 'verify-login', code, userId }
    });
    
    if (fnError) {
      const errorBody = await fnError.context?.json?.() || {};
      throw new Error(errorBody.error || fnError.message);
    }
    
    if (data.error) {
      return { success: false, error: data.error };
    }
    
    return { success: data.success };
  } catch (err: any) {
    console.error('Error verifying MFA login:', err);
    return { success: false, error: err.message };
  }
}

export async function verifyRecoveryCodeLogin(userId: string, recoveryCode: string): Promise<{ success: boolean; remainingCodes?: number; error?: string }> {
  try {
    const { data, error: fnError } = await supabase.functions.invoke('mfa-totp', {
      body: { action: 'verify-recovery-login', recoveryCode, userId }
    });
    
    if (fnError) {
      const errorBody = await fnError.context?.json?.() || {};
      throw new Error(errorBody.error || fnError.message);
    }
    
    if (data.error) {
      return { success: false, error: data.error };
    }
    
    return { success: data.success, remainingCodes: data.remainingCodes };
  } catch (err: any) {
    console.error('Error verifying recovery code:', err);
    return { success: false, error: err.message };
  }
}

export async function checkMFARequired(userId: string): Promise<boolean> {
  try {
    const { data, error: fnError } = await supabase.functions.invoke('mfa-totp', {
      body: { action: 'check-mfa-required', userId }
    });
    
    if (fnError) return false;
    return data?.mfaRequired || false;
  } catch {
    return false;
  }
}

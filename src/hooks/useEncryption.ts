import { supabase } from "@/integrations/supabase/client";

// Fields that should be encrypted for each table
export const ENCRYPTED_FIELDS = {
  clients: ['email', 'phone'],
  profiles: ['phone_number', 'recovery_email'],
} as const;

type TableName = keyof typeof ENCRYPTED_FIELDS;

export function useEncryption() {
  const encryptFields = async <T extends Record<string, any>>(
    tableName: TableName,
    data: T
  ): Promise<T> => {
    const fieldsToEncrypt = ENCRYPTED_FIELDS[tableName];
    const fieldsWithValues = fieldsToEncrypt.filter(
      (field) => data[field as keyof T] !== undefined && data[field as keyof T] !== null && data[field as keyof T] !== ''
    );

    if (fieldsWithValues.length === 0) {
      return data;
    }

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        console.warn('No session available for encryption, returning unencrypted data');
        return data;
      }

      const { data: response, error } = await supabase.functions.invoke('encrypt-decrypt', {
        body: {
          action: 'encrypt',
          data: data,
          fields: fieldsWithValues,
        },
      });

      if (error) {
        console.error('Encryption error:', error);
        return data; // Return unencrypted data as fallback
      }

      return response.data as T;
    } catch (err) {
      console.error('Encryption failed:', err);
      return data; // Return unencrypted data as fallback
    }
  };

  const decryptFields = async <T extends Record<string, any>>(
    tableName: TableName,
    data: T
  ): Promise<T> => {
    const fieldsToDecrypt = ENCRYPTED_FIELDS[tableName];
    const fieldsWithValues = fieldsToDecrypt.filter(
      (field) => data[field as keyof T] !== undefined && data[field as keyof T] !== null && data[field as keyof T] !== ''
    );

    if (fieldsWithValues.length === 0) {
      return data;
    }

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        console.warn('No session available for decryption, returning encrypted data');
        return data;
      }

      const { data: response, error } = await supabase.functions.invoke('encrypt-decrypt', {
        body: {
          action: 'decrypt',
          data: data,
          fields: fieldsWithValues,
        },
      });

      if (error) {
        console.error('Decryption error:', error);
        return data; // Return data as-is
      }

      return response.data as T;
    } catch (err) {
      console.error('Decryption failed:', err);
      return data; // Return data as-is
    }
  };

  const decryptArray = async <T extends Record<string, any>>(
    tableName: TableName,
    dataArray: T[]
  ): Promise<T[]> => {
    if (dataArray.length === 0) return dataArray;

    // Decrypt each item in parallel
    const decryptedItems = await Promise.all(
      dataArray.map((item) => decryptFields(tableName, item))
    );

    return decryptedItems;
  };

  return {
    encryptFields,
    decryptFields,
    decryptArray,
  };
}

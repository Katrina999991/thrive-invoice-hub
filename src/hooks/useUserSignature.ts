import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface UserSignature {
  id: string;
  user_id: string;
  signature_type: "typed" | "drawn" | "uploaded";
  signature_value: string;
  signer_name: string | null;
  signer_title: string | null;
  created_at: string;
  updated_at: string;
}

export function useUserSignature() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: signature, isLoading } = useQuery({
    queryKey: ["userSignature", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("user_signatures" as any)
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data as UserSignature | null;
    },
    enabled: !!user?.id,
  });

  const saveSignature = useMutation({
    mutationFn: async (input: {
      signature_type: "typed" | "drawn" | "uploaded";
      signature_value: string;
      signer_name?: string;
      signer_title?: string;
    }) => {
      if (!user?.id) throw new Error("Not authenticated");

      // If uploaded type, upload to storage first
      let finalValue = input.signature_value;
      if (input.signature_type === "uploaded" && input.signature_value.startsWith("data:")) {
        const base64 = input.signature_value.split(",")[1];
        const ext = input.signature_value.includes("png") ? "png" : "jpg";
        const path = `${user.id}/signature.${ext}`;
        const blob = Uint8Array.from(atob(base64), c => c.charCodeAt(0));

        const { error: uploadError } = await supabase.storage
          .from("user-signatures")
          .upload(path, blob, { contentType: `image/${ext}`, upsert: true });
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("user-signatures")
          .getPublicUrl(path);
        finalValue = urlData.publicUrl;
      }

      // If drawn, upload base64 canvas as image
      if (input.signature_type === "drawn" && input.signature_value.startsWith("data:")) {
        const base64 = input.signature_value.split(",")[1];
        const path = `${user.id}/signature-drawn.png`;
        const blob = Uint8Array.from(atob(base64), c => c.charCodeAt(0));

        const { error: uploadError } = await supabase.storage
          .from("user-signatures")
          .upload(path, blob, { contentType: "image/png", upsert: true });
        if (uploadError) throw uploadError;

        // Keep base64 as value for PDF rendering (more reliable)
        finalValue = input.signature_value;
      }

      // Upsert signature
      const { data: existing } = await supabase
        .from("user_signatures" as any)
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("user_signatures" as any)
          .update({
            signature_type: input.signature_type,
            signature_value: finalValue,
            signer_name: input.signer_name || null,
            signer_title: input.signer_title || null,
          })
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_signatures" as any)
          .insert({
            user_id: user.id,
            signature_type: input.signature_type,
            signature_value: finalValue,
            signer_name: input.signer_name || null,
            signer_title: input.signer_title || null,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userSignature", user?.id] });
    },
  });

  const deleteSignature = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("user_signatures" as any)
        .delete()
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userSignature", user?.id] });
    },
  });

  return {
    signature,
    isLoading,
    saveSignature,
    deleteSignature,
    hasSignature: !!signature,
  };
}

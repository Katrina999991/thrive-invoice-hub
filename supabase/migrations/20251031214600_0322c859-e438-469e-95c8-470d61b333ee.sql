-- Modifier la fonction handle_new_user pour stocker le display_name comme username
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, username)
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data ->> 'display_name',
    NEW.raw_user_meta_data ->> 'display_name'
  );
  RETURN NEW;
END;
$function$;
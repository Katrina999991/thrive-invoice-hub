-- Create trigger to initialize user subscription when a profile is created
CREATE TRIGGER trigger_initialize_user_subscription
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.initialize_user_subscription();
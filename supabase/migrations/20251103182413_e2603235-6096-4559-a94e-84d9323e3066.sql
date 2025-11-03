-- Add translation columns for categories
ALTER TABLE public.categories 
ADD COLUMN name_en TEXT,
ADD COLUMN name_fr TEXT,
ADD COLUMN description_en TEXT,
ADD COLUMN description_fr TEXT;

-- Migrate existing data (assuming existing data is in English)
UPDATE public.categories
SET 
  name_en = name,
  description_en = description
WHERE name_en IS NULL;

-- Update French translations for default categories
UPDATE public.categories SET name_fr = 'Développement Web', description_fr = 'Services et produits de développement web' WHERE name_en = 'Web Development';
UPDATE public.categories SET name_fr = 'Développement Mobile', description_fr = 'Développement d''applications mobiles' WHERE name_en = 'Mobile Development';
UPDATE public.categories SET name_fr = 'Logiciels', description_fr = 'Produits logiciels et licences' WHERE name_en = 'Software';
UPDATE public.categories SET name_fr = 'Consultation', description_fr = 'Services de consultation' WHERE name_en = 'Consulting';
UPDATE public.categories SET name_fr = 'Design', description_fr = 'Services de design' WHERE name_en = 'Design';
UPDATE public.categories SET name_fr = 'Marketing', description_fr = 'Marketing et publicité' WHERE name_en = 'Marketing';
UPDATE public.categories SET name_fr = 'Formation', description_fr = 'Formation et éducation' WHERE name_en = 'Training';
UPDATE public.categories SET name_fr = 'Support', description_fr = 'Support technique' WHERE name_en = 'Support';
UPDATE public.categories SET name_fr = 'Bureau', description_fr = 'Fournitures et dépenses de bureau' WHERE name_en = 'Office';
UPDATE public.categories SET name_fr = 'Repas', description_fr = 'Repas et divertissement' WHERE name_en = 'Meals';
UPDATE public.categories SET name_fr = 'Voyage', description_fr = 'Frais de voyage' WHERE name_en = 'Travel';
UPDATE public.categories SET name_fr = 'Services publics', description_fr = 'Services publics et utilitaires' WHERE name_en = 'Utilities';
UPDATE public.categories SET name_fr = 'Autre', description_fr = 'Divers' WHERE name_en = 'Other';
import { useEffect } from 'react';
import { useLanguage } from './useLanguage';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  ogImage?: string;
  ogType?: string;
  canonical?: string;
  structuredData?: object;
}

export const useSEO = ({
  title,
  description,
  keywords,
  ogImage,
  ogType = 'website',
  canonical,
  structuredData
}: SEOProps = {}) => {
  const { language } = useLanguage();
  const isEnglish = language === 'en';

  useEffect(() => {
    // Update lang attribute
    document.documentElement.lang = language;

    // Default SEO values based on language
    const defaultTitle = isEnglish
      ? 'GestionFlow - Business Management Software | Invoices, Expenses & Clients'
      : 'GestionFlow - Logiciel de Gestion d\'Entreprise | Factures, Dépenses & Clients';
    
    const defaultDescription = isEnglish
      ? 'Complete business management: create invoices, track expenses, manage clients and generate detailed reports. Simple, efficient and intuitive.'
      : "Gestion d'entreprise complète : factures, suivi des dépenses, clients et rapports détaillés. Simple, efficace et intuitif.";
    
    const defaultKeywords = isEnglish
      ? 'invoice management, expense tracking, client management, business reports, accounting software, invoice generator, expense management, business management software'
      : 'gestion de factures, suivi des dépenses, gestion clients, rapports d\'entreprise, logiciel comptable, générateur de factures, gestion des dépenses, logiciel de gestion';

    // Update title
    document.title = title || defaultTitle;

    // Update or create meta tags
    const updateMetaTag = (name: string, content: string, isProperty = false) => {
      const attribute = isProperty ? 'property' : 'name';
      let element = document.querySelector(`meta[${attribute}="${name}"]`);
      
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attribute, name);
        document.head.appendChild(element);
      }
      
      element.setAttribute('content', content);
    };

    // Basic meta tags
    updateMetaTag('description', description || defaultDescription);
    updateMetaTag('keywords', keywords || defaultKeywords);
    updateMetaTag('author', 'GestionFlow');
    updateMetaTag('robots', 'index, follow');
    
    // Always normalize to the production canonical domain — preview/lovable.app
    // hosts must not advertise themselves to crawlers.
    const CANONICAL_BASE = 'https://gestionflow.net';
    const canonicalUrl = canonical || CANONICAL_BASE + window.location.pathname;

    // Open Graph tags
    updateMetaTag('og:title', title || defaultTitle, true);
    updateMetaTag('og:description', description || defaultDescription, true);
    updateMetaTag('og:type', ogType, true);
    updateMetaTag('og:url', canonicalUrl, true);
    updateMetaTag('og:locale', isEnglish ? 'en_US' : 'fr_FR', true);
    updateMetaTag('og:site_name', 'GestionFlow', true);
    
    const resolvedOgImage = ogImage || 'https://gestionflow.net/og-image.png?v=4';
    updateMetaTag('og:image', resolvedOgImage, true);
    updateMetaTag('og:image:alt', title || defaultTitle, true);
    updateMetaTag('og:image:width', '1200', true);
    updateMetaTag('og:image:height', '630', true);

    // Twitter Card tags
    updateMetaTag('twitter:card', 'summary_large_image');
    updateMetaTag('twitter:title', title || defaultTitle);
    updateMetaTag('twitter:description', description || defaultDescription);
    updateMetaTag('twitter:image', resolvedOgImage);

    // Canonical URL
    let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.rel = 'canonical';
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.href = canonicalUrl;

    // Structured Data (JSON-LD)
    if (structuredData) {
      let script = document.querySelector('script[type="application/ld+json"]') as HTMLScriptElement;
      if (!script) {
        script = document.createElement('script');
        script.type = 'application/ld+json';
        document.head.appendChild(script);
      }
      script.textContent = JSON.stringify(structuredData);
    }

  }, [title, description, keywords, ogImage, ogType, canonical, structuredData, language, isEnglish]);
};

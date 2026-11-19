import type { FaqItem } from './faq';
import { SECTION_NAME, absoluteUrl } from './site';

export interface BreadcrumbEntry {
  name: string;
  url: string;
}

const STRUCTURED_CONTEXT = 'https://schema.org';
const STRUCTURED_FREE_PRICE = 0;

/** `BreadcrumbList`; las URL son rutas de la web y se convierten en absolutas. */
export function breadcrumbJsonLd(items: BreadcrumbEntry[]): Record<string, unknown> {
  return {
    '@context': STRUCTURED_CONTEXT,
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.url),
    })),
  };
}

/** `WebApplication` gratuita de la página principal. */
export function webApplicationJsonLd(description: string): Record<string, unknown> {
  return {
    '@context': STRUCTURED_CONTEXT,
    '@type': 'WebApplication',
    name: SECTION_NAME,
    description,
    url: absoluteUrl('/'),
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Any',
    inLanguage: 'es',
    offers: { '@type': 'Offer', price: STRUCTURED_FREE_PRICE, priceCurrency: 'EUR' },
  };
}

/** `FAQPage` con las mismas preguntas que se ven en la página. */
export function faqPageJsonLd(items: FaqItem[]): Record<string, unknown> {
  return {
    '@context': STRUCTURED_CONTEXT,
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };
}

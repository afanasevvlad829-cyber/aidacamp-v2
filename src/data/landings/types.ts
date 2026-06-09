export interface Section {
  h2: string;
  text: string;
  list?: string[];
}

export interface FAQItem {
  q: string;
  a: string;
}

export interface LandingData {
  slug: string;
  title: string;
  description: string;
  h1: string;
  canonical: string;
  noindex?: boolean;
  heroImage: string;
  faqItems: FAQItem[];
  courseSchema: {
    name: string;
    description: string;
  };
  hero: {
    subtitle: string;
    breadcrumb: string;
    keywords: string[];
    imageAlt: string;
  };
  sections: Section[];
}

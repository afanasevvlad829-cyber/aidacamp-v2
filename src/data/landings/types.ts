export interface Section {
  h2: string;
  text: string;
  list?: string[];
}

export interface FAQItem {
  q: string;
  a: string;
}

export interface RelatedCityLink {
  href: string;
  text: string;
}

export interface SeeAlsoBlock {
  label: string;
  separator?: string;
  links: RelatedCityLink[];
  asBlock?: boolean;
}

export interface InternalLinkItem {
  href: string;
  label: string;
  description: string;
}

export interface InternalLinksSection {
  title: string;
  intro: string;
  links: InternalLinkItem[];
}

export interface EducationEventOffer {
  '@type': 'Offer';
  name: string;
  price: string;
  priceCurrency: string;
  availability: string;
  url: string;
}

export interface EducationEventSchema {
  '@context': 'https://schema.org';
  '@type': 'EducationEvent';
  name: string;
  description: string;
  image: string;
  startDate: string;
  endDate: string;
  eventStatus: string;
  eventAttendanceMode: string;
  location: {
    '@type': 'Place';
    name: string;
    address: {
      '@type': 'PostalAddress';
      addressLocality: string;
      addressRegion: string;
      postalCode: string;
      addressCountry: string;
    };
  };
  organizer: {
    '@type': 'Organization';
    name: string;
    url: string;
    logo: string;
  };
  offers: EducationEventOffer[];
  aggregateRating: {
    '@type': 'AggregateRating';
    ratingValue: string;
    ratingCount: string;
    bestRating: string;
    worstRating: string;
  };
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
  relatedCities?: RelatedCityLink[];
  seeAlso?: SeeAlsoBlock;
  internalLinksSection?: InternalLinksSection;
  educationEvent?: EducationEventSchema;
}

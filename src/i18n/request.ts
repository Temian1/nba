import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async () => {
  // Provide a static locale, other languages can be added later
  const locale = 'es';

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default
  };
});
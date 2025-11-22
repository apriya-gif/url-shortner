declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

export const initGA = (measurementId: string) => {
  if (!measurementId || window.gtag) return;

  // Create the script tag
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);

  // Initialize dataLayer
  window.dataLayer = window.dataLayer || [];
  window.gtag = function() {
    window.dataLayer.push(arguments);
  };
  
  window.gtag('js', new Date());
  window.gtag('config', measurementId, {
    send_page_view: false // We will manually track page views for specific redirects
  });
};

export const trackRedirect = (measurementId: string, slug: string, targetUrl: string) => {
  if (!window.gtag) return;

  // Send a specific event for the redirect
  window.gtag('event', 'short_link_visit', {
    event_category: 'engagement',
    event_label: slug,
    destination: targetUrl,
    transport_type: 'beacon' // Ensures data is sent even if page unloads immediately
  });

  // Also manually trigger a page view so it shows up in standard reports
  window.gtag('config', measurementId, {
    page_path: `/${slug}`,
    page_title: `Redirect: ${slug}`
  });
};
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface AnalyticsScript {
  id: string;
  name: string;
  platform: string;
  tracking_id: string;
  is_active: boolean;
}

// Secure script templates - only these are allowed to be injected
const SECURE_TEMPLATES: Record<string, (id: string) => string> = {
  google_analytics: (id: string) => `
    <!-- Google tag (gtag.js) -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=${id}"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${id}');
    </script>
  `,
  facebook_pixel: (id: string) => `
    <!-- Meta Pixel Code -->
    <script>
      !function(f,b,e,v,n,t,s) {
        if(f.fbq)return;
        n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;
        n.push=n;
        n.loaded=!0;
        n.version='2.0';
        n.queue=[];
        t=b.createElement(e);
        t.async=!0;
        t.src=v;
        s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)
      }(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
      
      fbq('init', '${id}');
      fbq('track', 'PageView');
    </script>
    <noscript>
      <img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${id}&ev=PageView&noscript=1"/>
    </noscript>
  `,
  google_tag_manager: (id: string) => `
    <!-- Google Tag Manager -->
    <script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
    new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
    j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
    'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
    })(window,document,'script','dataLayer','${id}');</script>
    <!-- End Google Tag Manager -->
  `,
  hotjar: (id: string) => `
    <!-- Hotjar Tracking Code -->
    <script>
        (function(h,o,t,j,a,r){
            h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
            h._hjSettings={hjid:${id},hjsv:6};
            a=o.getElementsByTagName('head')[0];
            r=o.createElement('script');r.async=1;
            r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
            a.appendChild(r);
        })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');
    </script>
  `,
  microsoft_clarity: (id: string) => `
    <!-- Microsoft Clarity -->
    <script type="text/javascript">
        (function(c,l,a,r,i,t,y){
            c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
            t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
            y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
        })(window, document, "clarity", "script", "${id}");
    </script>
  `
};

const AnalyticsScriptInjector: React.FC = () => {
  const [scripts, setScripts] = useState<AnalyticsScript[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadScripts = async () => {
      try {
        const { data, error } = await supabase
          .from('analytics_scripts')
          .select('id, name, platform, tracking_id, is_active')
          .eq('is_active', true);

        if (error) throw error;

        setScripts(data || []);
        setError(null);
      } catch (err) {
        console.error('Error loading analytics scripts:', err);
        setError('Failed to load analytics scripts');
      } finally {
        setLoaded(true);
      }
    };

    loadScripts();
  }, []);

  useEffect(() => {
    if (!loaded || scripts.length === 0) return;

    // Keep track of injected scripts for cleanup
    const injectedScripts: HTMLScriptElement[] = [];

    // Inject each script into the document using secure templates
    scripts.forEach(script => {
      try {
        // Validate tracking ID format for security
        if (!script.tracking_id || script.tracking_id.length > 50) {
          console.warn(`Invalid tracking ID for script ${script.name}`);
          return;
        }

        // Get secure template
        const template = SECURE_TEMPLATES[script.platform];
        if (!template) {
          console.warn(`No secure template found for platform: ${script.platform}`);
          return;
        }

        // Sanitize tracking ID (remove any non-alphanumeric characters except hyphens and underscores)
        const sanitizedId = script.tracking_id.replace(/[^a-zA-Z0-9\-_]/g, '');
        if (sanitizedId !== script.tracking_id) {
          console.warn(`Tracking ID sanitized for script ${script.name}`);
        }

        // Generate secure script content
        const scriptContent = template(sanitizedId);
        
        // Create a temporary div to parse the HTML safely
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = scriptContent;

        // Find all script tags
        const scriptTags = tempDiv.getElementsByTagName('script');

        // Handle each script tag
        Array.from(scriptTags).forEach(originalScript => {
          const newScript = document.createElement('script');
          
          // Copy safe attributes only
          if (originalScript.src) {
            // Validate that src is from allowed domains
            const allowedDomains = [
              'googletagmanager.com',
              'google-analytics.com',
              'connect.facebook.net',
              'static.hotjar.com',
              'clarity.ms'
            ];
            
            const srcUrl = new URL(originalScript.src);
            if (allowedDomains.some(domain => srcUrl.hostname.includes(domain))) {
              newScript.src = originalScript.src;
              if (originalScript.async) newScript.async = true;
            } else {
              console.warn(`Blocked script from unauthorized domain: ${srcUrl.hostname}`);
              return;
            }
          } else if (originalScript.textContent) {
            // For inline scripts, use the content as-is since it comes from our secure templates
            newScript.textContent = originalScript.textContent;
          }
          
          // Add to document and track for cleanup
          document.head.appendChild(newScript);
          injectedScripts.push(newScript);
        });

        console.log(`Analytics script injected: ${script.name} (${script.platform})`);
      } catch (error) {
        console.error(`Error injecting analytics script ${script.name}:`, error);
      }
    });

    // Cleanup function to remove scripts when component unmounts
    return () => {
      injectedScripts.forEach(script => {
        if (script && script.parentNode) {
          script.parentNode.removeChild(script);
        }
      });
    };
  }, [scripts, loaded]);

  // This component doesn't render anything visible
  return null;
};

export default AnalyticsScriptInjector;
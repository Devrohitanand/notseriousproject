import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

/**
 * Ensures every client-side navigation starts at the top of the page,
 * while still honouring in-page hash anchors (e.g. /#faq) and the
 * browser's own scroll restoration on back/forward (POP) navigation.
 */
export default function ScrollToTop() {
  const { pathname, hash } = useLocation();
  const navType = useNavigationType(); // 'PUSH' | 'REPLACE' | 'POP'

  // Disable the browser's automatic scroll restoration once, so history-preserved
  // positions from long pages don't leak into new PUSH navigations.
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  useEffect(() => {
    // Let the browser restore its own position on back/forward navigation.
    if (navType === 'POP') return;

    const scrollTop = () => {
      // 'instant' is not universally supported; 'auto' does the same job.
      try { window.scrollTo({ top: 0, left: 0, behavior: 'auto' }); } catch { window.scrollTo(0, 0); }
      // Belt-and-braces for engines that ignore window.scrollTo on some layouts.
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };

    if (hash) {
      // Anchor may not exist yet on the first render — wait a frame.
      requestAnimationFrame(() => {
        const el = document.querySelector(hash);
        if (el) el.scrollIntoView({ behavior: 'auto', block: 'start' });
        else scrollTop();
      });
      return;
    }

    // Run immediately AND on the next frame — covers React commit ordering.
    scrollTop();
    requestAnimationFrame(scrollTop);
  }, [pathname, hash, navType]);

  return null;
}

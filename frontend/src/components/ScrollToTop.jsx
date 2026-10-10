import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Automatically scrolls the window to the top on every route change.
 * Prevents SPA scroll-retention where navigating from the bottom of one page
 * lands the user at the bottom of the next page.
 */
const ScrollToTop = () => {
  const { pathname, search, hash } = useLocation();

  useEffect(() => {
    // If navigating to an in-page anchor, scroll smoothly to the targeted element
    if (hash) {
      const element = document.getElementById(hash.replace('#', ''));
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }

    // Otherwise, immediately scroll to the top of the window
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant',
    });
  }, [pathname, search, hash]);

  return null;
};

export default ScrollToTop;

import { useEffect, useRef } from 'react';
import { useMenuStore } from '../../stores/menuStore';

/** Watches the DOM for MUI Popover/Menu appearing — no per-Select props needed. */
export default function MenuPauseObserver() {
  const registerOpen = useMenuStore((s) => s.registerOpen);
  const registerClose = useMenuStore((s) => s.registerClose);
  const watchingRef = useRef(false);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const visible = document.querySelector(
        '.MuiPopover-root:not([style*="visibility: hidden"]), .MuiMenu-root:not([style*="visibility: hidden"])',
      ) as HTMLElement | null;

      if (visible && !watchingRef.current) {
        watchingRef.current = true;
        registerOpen();

        // Poll every 200ms to detect removal — simpler and leak-proof
        const interval = setInterval(() => {
          if (!document.body.contains(visible)) {
            clearInterval(interval);
            watchingRef.current = false;
            registerClose();
          }
        }, 200);
      }
    });

    observer.observe(document.body, { childList: true, subtree: false });
    return () => {
      observer.disconnect();
      watchingRef.current = false;
    };
  }, [registerOpen, registerClose]);

  return null;
}

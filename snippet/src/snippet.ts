(function() {
  'use strict';

  interface TouchEvent {
    x: number;
    y: number;
    viewport_w: number;
    viewport_h: number;
    thumb_zone: string;
    mis_tap: boolean;
    pressure: number | null;
    selector: string | null;
    url: string;
  }

  const config = {
    projectId: '',
    endpoint: '',
    throttleMs: 100,
    misTapWindow: 150,
  };

  let lastTapTime = 0;
  let lastTapCoords: { x: number; y: number } | null = null;
  let eventQueue: TouchEvent[] = [];
  let isSending = false;

  function getThumbZone(x: number, viewportW: number): string {
    const percent = (x / viewportW) * 100;
    if (percent < 33) return 'left';
    if (percent > 66) return 'right';
    return 'center';
  }

  function getSelector(element: Element | null): string | null {
    if (!element) return null;
    
    try {
      if (element.id) return `#${element.id}`;
      
      const path: string[] = [];
      let current: Element | null = element;
      
      while (current && current !== document.body && path.length < 5) {
        let selector = current.tagName.toLowerCase();
        
        if (current.className && typeof current.className === 'string') {
          const classes = current.className.trim().split(/\s+/).slice(0, 2).join('.');
          if (classes) selector += `.${classes}`;
        }
        
        if (current.parentElement) {
          const siblings = Array.from(current.parentElement.children);
          const index = siblings.indexOf(current);
          if (siblings.length > 1) selector += `:nth-child(${index + 1})`;
        }
        
        path.unshift(selector);
        current = current.parentElement;
      }
      
      return path.join(' > ');
    } catch {
      return null;
    }
  }

  function detectMisTap(x: number, y: number): boolean {
    const now = Date.now();
    if (lastTapCoords && (now - lastTapTime) < config.misTapWindow) {
      const distance = Math.sqrt(
        Math.pow(x - lastTapCoords.x, 2) + Math.pow(y - lastTapCoords.y, 2)
      );
      if (distance < 50) {
        return true;
      }
    }
    lastTapTime = now;
    lastTapCoords = { x, y };
    return false;
  }

  function createEvent(
    x: number,
    y: number,
    pressure: number | null,
    selector: string | null,
    misTap: boolean
  ): TouchEvent {
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    
    return {
      x: Math.round(x),
      y: Math.round(y),
      viewport_w: viewportW,
      viewport_h: viewportH,
      thumb_zone: getThumbZone(x, viewportW),
      mis_tap: misTap,
      pressure: pressure ? Math.round(pressure * 100) / 100 : null,
      selector,
      url: window.location.href,
    };
  }

  function sendEvents() {
    if (isSending || eventQueue.length === 0) return;
    
    isSending = true;
    const events = eventQueue.splice(0, 50);
    
    const payload = JSON.stringify({
      project_id: config.projectId,
      events: events,
    });

    const url = config.endpoint;
    
    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: 'application/json' });
      navigator.sendBeacon(url, blob);
      isSending = false;
    } else {
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      })
        .catch(() => {})
        .finally(() => {
          isSending = false;
          if (eventQueue.length > 0) {
            setTimeout(sendEvents, config.throttleMs);
          }
        });
    }
  }

  function handleTouch(e: TouchEvent | MouseEvent) {
    const target = e.target as Element;
    const touch = 'touches' in e ? e.touches[0] : null;
    const clientX = touch ? touch.clientX : e.clientX;
    const clientY = touch ? touch.clientY : e.clientY;
    const pressure = touch && 'force' in touch ? (touch as any).force : null;
    
    const selector = getSelector(target);
    const misTap = detectMisTap(clientX, clientY);
    
    const event = createEvent(clientX, clientY, pressure, selector, misTap);
    eventQueue.push(event);
    
    if (eventQueue.length >= 10) {
      sendEvents();
    } else {
      setTimeout(sendEvents, config.throttleMs);
    }
  }

  function init() {
    const script = document.currentScript as HTMLScriptElement;
    const projectId = script?.getAttribute('data-project');
    
    if (!projectId) {
      console.warn('TouchHeat: Missing data-project attribute');
      return;
    }
    
    config.projectId = projectId;
    
    // Determine API endpoint from script source
    if (script && script.src) {
      try {
        const scriptUrl = new URL(script.src);
        config.endpoint = scriptUrl.origin + '/api/ingest';
      } catch {
        // Fallback to relative path if URL parsing fails
        config.endpoint = '/api/ingest';
      }
    } else {
      config.endpoint = '/api/ingest';
    }
    
    if (typeof window !== 'undefined') {
      document.addEventListener('touchstart', handleTouch, { passive: true });
      document.addEventListener('click', handleTouch, { passive: true });
      
      window.addEventListener('beforeunload', () => {
        if (eventQueue.length > 0) {
          sendEvents();
        }
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();


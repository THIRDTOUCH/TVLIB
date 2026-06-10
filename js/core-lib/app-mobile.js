class MobileAdapter {
  constructor() {
    this.isMobile = this._detectMobile();
    this.isTablet = this._detectTablet();
    this.isTouch = this._detectTouch();
    this.breakpoint = this._getBreakpoint();
    this._init();
  }

  _detectMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           (window.innerWidth < 768);
  }

  _detectTablet() {
    return /iPad|Android/i.test(navigator.userAgent) ||
           (window.innerWidth >= 768 && window.innerWidth < 1024);
  }

  _detectTouch() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  _getBreakpoint() {
    const width = window.innerWidth;
    if (width < 480) return 'xs';
    if (width < 768) return 'sm';
    if (width < 1024) return 'md';
    if (width < 1440) return 'lg';
    return 'xl';
  }

  _init() {
    document.documentElement.classList.toggle('is-mobile', this.isMobile);
    document.documentElement.classList.toggle('is-tablet', this.isTablet);
    document.documentElement.classList.toggle('is-touch', this.isTouch);
    document.documentElement.dataset.breakpoint = this.breakpoint;

    window.addEventListener('resize', PerformanceUtils.debounce(() => {
      this._onResize();
    }, 200));

    if (this.isMobile) {
      this._optimizeForMobile();
    }
  }

  _onResize() {
    const oldBreakpoint = this.breakpoint;
    this.isMobile = this._detectMobile();
    this.isTablet = this._detectTablet();
    this.breakpoint = this._getBreakpoint();

    document.documentElement.classList.toggle('is-mobile', this.isMobile);
    document.documentElement.classList.toggle('is-tablet', this.isTablet);
    document.documentElement.dataset.breakpoint = this.breakpoint;

    if (oldBreakpoint !== this.breakpoint) {
      window.dispatchEvent(new CustomEvent('breakpointchange', { detail: this.breakpoint }));
    }
  }

  _optimizeForMobile() {
    this._disableHoverEffects();
    this._optimizeScrolling();
    this._setupTouchGestures();
    this._optimizeFontSize();
  }

  _disableHoverEffects() {
    const style = document.createElement('style');
    style.textContent = `
      @media (hover: none) {
        *:hover { background-color: inherit !important; }
        .btn:hover, .card:hover, .modal-content:hover {
          transform: none !important;
          box-shadow: inherit !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  _optimizeScrolling() {
    document.documentElement.style.setProperty('--scroll-behavior', 'smooth');
  }

  _setupTouchGestures() {
    let startX = 0;
    let startY = 0;
    const threshold = 50;

    document.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
      const deltaX = e.changedTouches[0].clientX - startX;
      const deltaY = e.changedTouches[0].clientY - startY;

      if (Math.abs(deltaX) > threshold && Math.abs(deltaX) > Math.abs(deltaY)) {
        if (deltaX > 0) {
          window.dispatchEvent(new CustomEvent('swipeleft', { detail: { deltaX } }));
        } else {
          window.dispatchEvent(new CustomEvent('swiperight', { detail: { deltaX } }));
        }
      }
    }, { passive: true });
  }

  _optimizeFontSize() {
    const baseSize = this.breakpoint === 'xs' ? 14 : 15;
    document.documentElement.style.setProperty('--font-size-base', baseSize + 'px');
  }

  getConfig() {
    return {
      isMobile: this.isMobile,
      isTablet: this.isTablet,
      isTouch: this.isTouch,
      breakpoint: this.breakpoint,
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio
    };
  }
}

class TouchHandler {
  constructor(element, options = {}) {
    this.element = typeof element === 'string' ? document.querySelector(element) : element;
    this.options = {
      onSwipeLeft: options.onSwipeLeft || null,
      onSwipeRight: options.onSwipeRight || null,
      onSwipeUp: options.onSwipeUp || null,
      onSwipeDown: options.onSwipeDown || null,
      onLongPress: options.onLongPress || null,
      threshold: options.threshold || 50,
      longPressDelay: options.longPressDelay || 500,
      ...options
    };
    this._init();
  }

  _init() {
    let startX = 0, startY = 0;
    let longPressTimer = null;

    this.element.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;

      if (this.options.onLongPress) {
        longPressTimer = setTimeout(() => {
          this.options.onLongPress(e);
        }, this.options.longPressDelay);
      }
    }, { passive: true });

    this.element.addEventListener('touchmove', () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
    }, { passive: true });

    this.element.addEventListener('touchend', (e) => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }

      const deltaX = e.changedTouches[0].clientX - startX;
      const deltaY = e.changedTouches[0].clientY - startY;
      const absDeltaX = Math.abs(deltaX);
      const absDeltaY = Math.abs(deltaY);

      if (absDeltaX > this.options.threshold && absDeltaX > absDeltaY) {
        if (deltaX > 0 && this.options.onSwipeRight) {
          this.options.onSwipeRight(e);
        } else if (deltaX < 0 && this.options.onSwipeLeft) {
          this.options.onSwipeLeft(e);
        }
      } else if (absDeltaY > this.options.threshold && absDeltaY > absDeltaX) {
        if (deltaY > 0 && this.options.onSwipeDown) {
          this.options.onSwipeDown(e);
        } else if (deltaY < 0 && this.options.onSwipeUp) {
          this.options.onSwipeUp(e);
        }
      }
    }, { passive: true });
  }

  destroy() {
    this.element.remove();
  }
}

class BottomSheet {
  constructor(options = {}) {
    this.options = {
      content: options.content || '',
      title: options.title || '',
      height: options.height || '60vh',
      onClose: options.onClose || null,
      ...options
    };
    this.isOpen = false;
    this._create();
  }

  _create() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'bottom-sheet-overlay';
    this.overlay.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.5);
      z-index: 9999;
      opacity: 0;
      transition: opacity 0.3s ease;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
    `;

    this.sheet = document.createElement('div');
    this.sheet.className = 'bottom-sheet';
    this.sheet.style.cssText = `
      background: var(--bg-light, #1e293b);
      border-radius: 20px 20px 0 0;
      max-height: ${this.options.height};
      width: 100%;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      transform: translateY(100%);
      transition: transform 0.3s ease;
    `;

    this.sheet.innerHTML = `
      <div style="padding: 12px 16px; border-bottom: 1px solid var(--border, #334155); display: flex; justify-content: space-between; align-items: center; flex-shrink: 0;">
        <div style="font-weight: bold; color: var(--text);">${this.options.title}</div>
        <button class="bottom-sheet-close" style="background: none; border: none; color: var(--text-dim); font-size: 20px; cursor: pointer; padding: 4px;">✕</button>
      </div>
      <div style="flex: 1; overflow-y: auto; padding: 16px;">${this.options.content}</div>
    `;

    this.overlay.appendChild(this.sheet);
    document.body.appendChild(this.overlay);

    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.close();
    });

    this.sheet.querySelector('.bottom-sheet-close').addEventListener('click', () => this.close());
  }

  open() {
    this.isOpen = true;
    this.overlay.style.opacity = '1';
    this.sheet.style.transform = 'translateY(0)';
    document.body.style.overflow = 'hidden';
  }

  close() {
    this.isOpen = false;
    this.overlay.style.opacity = '0';
    this.sheet.style.transform = 'translateY(100%)';
    document.body.style.overflow = '';
    setTimeout(() => {
      this.overlay.remove();
      if (this.options.onClose) this.options.onClose();
    }, 300);
  }

  setContent(content) {
    const contentEl = this.sheet.querySelector('div:last-child');
    contentEl.innerHTML = content;
  }
}

const MobileManager = new MobileAdapter();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MobileAdapter, TouchHandler, BottomSheet, MobileManager };
}

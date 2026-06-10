class PerformanceUtils {
  static debounce(fn, delay = 300) {
    let timer = null;
    return function(...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  static throttle(fn, delay = 100) {
    let lastTime = 0;
    return function(...args) {
      const now = Date.now();
      if (now - lastTime >= delay) {
        lastTime = now;
        fn.apply(this, args);
      }
    };
  }

  static rafThrottle(fn) {
    let rafId = null;
    return function(...args) {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        fn.apply(this, args);
        rafId = null;
      });
    };
  }
}

class LRUCache {
  constructor(maxSize = 100) {
    this.maxSize = maxSize;
    this.cache = new Map();
  }

  get(key) {
    if (!this.cache.has(key)) return null;
    const value = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  set(key, value) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  has(key) {
    return this.cache.has(key);
  }

  delete(key) {
    return this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  get size() {
    return this.cache.size;
  }
}

class VirtualScroll {
  constructor(container, options = {}) {
    this.container = typeof container === 'string' ? document.querySelector(container) : container;
    this.options = {
      itemHeight: options.itemHeight || 60,
      bufferSize: options.bufferSize || 5,
      renderItem: options.renderItem || (() => '<div></div>'),
      ...options
    };
    this.items = [];
    this.scrollTop = 0;
    this.visibleCount = 0;
    this.renderedItems = new Map();
    this._init();
  }

  _init() {
    this.container.style.overflow = 'auto';
    this.container.style.position = 'relative';
    
    this.scrollHandler = () => {
      this.scrollTop = this.container.scrollTop;
      this._render();
    };
    
    this.container.addEventListener('scroll', PerformanceUtils.rafThrottle(this.scrollHandler));
    this._resizeObserver = new ResizeObserver(() => this._onResize());
    this._resizeObserver.observe(this.container);
  }

  _onResize() {
    this.visibleCount = Math.ceil(this.container.clientHeight / this.options.itemHeight);
    this._render();
  }

  setItems(items) {
    this.items = items;
    this.renderedItems.clear();
    this._onResize();
  }

  _render() {
    const totalHeight = this.items.length * this.options.itemHeight;
    const startIndex = Math.max(0, Math.floor(this.scrollTop / this.options.itemHeight) - this.options.bufferSize);
    const endIndex = Math.min(
      this.items.length,
      Math.ceil((this.scrollTop + this.container.clientHeight) / this.options.itemHeight) + this.options.bufferSize
    );

    if (!this._contentEl) {
      this._contentEl = document.createElement('div');
      this._contentEl.style.cssText = 'position:relative;';
      this.container.appendChild(this._contentEl);
    }
    this._contentEl.style.height = totalHeight + 'px';

    for (const [index, el] of this.renderedItems) {
      if (index < startIndex || index >= endIndex) {
        el.style.display = 'none';
      } else {
        el.style.display = 'block';
        el.style.position = 'absolute';
        el.style.top = (index * this.options.itemHeight) + 'px';
        el.style.left = '0';
        el.style.right = '0';
      }
    }

    for (let i = startIndex; i < endIndex; i++) {
      if (!this.renderedItems.has(i)) {
        const item = this.items[i];
        const el = document.createElement('div');
        el.style.cssText = `position:absolute;top:${i * this.options.itemHeight}px;left:0;right:0;height:${this.options.itemHeight}px;`;
        el.innerHTML = this.options.renderItem(item, i);
        this._contentEl.appendChild(el);
        this.renderedItems.set(i, el);
      }
    }
  }

  destroy() {
    this.container.removeEventListener('scroll', this.scrollHandler);
    this._resizeObserver.disconnect();
    if (this._contentEl) this._contentEl.remove();
    this.renderedItems.clear();
  }
}

class LazyLoader {
  static observe(element, callback, options = {}) {
    if (!element) return;
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          callback(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, {
      root: options.root || null,
      rootMargin: options.rootMargin || '50px',
      threshold: options.threshold || 0
    });

    observer.observe(element);
    return observer;
  }

  static loadImage(img, src) {
    return new Promise((resolve, reject) => {
      const tempImg = new Image();
      tempImg.onload = () => {
        img.src = src;
        img.classList.remove('lazy-loading');
        resolve();
      };
      tempImg.onerror = reject;
      tempImg.src = src;
    });
  }
}

class ImageOptimizer {
  static async compress(file, options = {}) {
    const maxWidth = options.maxWidth || 1920;
    const quality = options.quality || 0.8;
    
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
          
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob(resolve, 'image/jpeg', quality);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  static getPlaceholder(width, height, color = '#1e293b') {
    return `data:image/svg+xml,${encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <rect fill="${color}" width="100%" height="100%"/>
        <text fill="#64748b" x="50%" y="50%" text-anchor="middle" dy=".3em" font-size="14">加载中...</text>
      </svg>`
    )}`;
  }
}

window.PerformanceUtils = PerformanceUtils;
window.LRUCache = LRUCache;
window.VirtualScroll = VirtualScroll;
window.LazyLoader = LazyLoader;
window.ImageOptimizer = ImageOptimizer;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PerformanceUtils, LRUCache, VirtualScroll, LazyLoader, ImageOptimizer };
}

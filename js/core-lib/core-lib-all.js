class ErrorHandler {
  constructor() {
    this.errorTypes = {
      NETWORK: 'network',
      AUTH: 'auth',
      VALIDATION: 'validation',
      LLM: 'llm',
      DATABASE: 'database',
      UNKNOWN: 'unknown'
    };
    
    this.errorMessages = {
      network: {
        title: '网络错误',
        message: '网络连接失败，请检查网络设置后重试',
        action: '刷新页面'
      },
      auth: {
        title: '认证失败',
        message: 'API Key 无效或已过期，请重新配置',
        action: '重新配置'
      },
      validation: {
        title: '数据验证失败',
        message: '输入数据格式不正确，请检查后重试',
        action: '重新输入'
      },
      llm: {
        title: 'AI 服务不可用',
        message: '当前 AI 服务暂时不可用，已自动切换到离线模式',
        action: '稍后重试'
      },
      database: {
        title: '数据库错误',
        message: '数据保存失败，请稍后重试',
        action: '重试'
      },
      unknown: {
        title: '未知错误',
        message: '发生未知错误，请刷新页面重试',
        action: '刷新页面'
      }
    };
  }

  capture(error, context = {}) {
    const errorInfo = this._parseError(error);
    console.error(`[ErrorHandler] ${errorInfo.type}: ${errorInfo.message}`, { context });
    
    if (context.notify !== false) {
      this.notify(errorInfo);
    }
    
    return errorInfo;
  }

  async captureAsync(error, context = {}) {
    return this.capture(error, context);
  }

  _parseError(error) {
    let type = this.errorTypes.UNKNOWN;
    let message = error.message || '未知错误';
    let code = error.code || error.status || null;

    if (error.message?.includes('NetworkError') || 
        error.message?.includes('Failed to fetch') ||
        error.code === 'ERR_NETWORK') {
      type = this.errorTypes.NETWORK;
    } else if (error.message?.includes('401') || 
               error.message?.includes('Unauthorized') ||
               error.code === 401) {
      type = this.errorTypes.AUTH;
    } else if (error.message?.includes('400') || 
               error.message?.includes('Validation') ||
               error.code === 400) {
      type = this.errorTypes.VALIDATION;
    } else if (error.message?.includes('LLM') || 
               error.message?.includes('model') ||
               error.message?.includes('API')) {
      type = this.errorTypes.LLM;
    } else if (error.message?.includes('IndexedDB') || 
               error.message?.includes('database') ||
               error.message?.includes('storage')) {
      type = this.errorTypes.DATABASE;
    }

    return {
      type,
      message,
      code,
      timestamp: new Date().toISOString(),
      stack: error.stack
    };
  }

  notify(errorInfo) {
    const template = this.errorMessages[errorInfo.type] || this.errorMessages.unknown;
    
    const toast = document.createElement('div');
    toast.className = 'error-toast';
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: linear-gradient(135deg, #ef4444, #dc2626);
      color: white;
      padding: 14px 20px;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(239, 68, 68, 0.4);
      max-width: 320px;
      z-index: 10000;
      animation: slideIn 0.3s ease-out;
    `;

    toast.innerHTML = `
      <div style="display:flex;align-items:flex-start;gap:12px;">
        <div style="font-size:20px;">⚠️</div>
        <div style="flex:1;">
          <div style="font-weight:bold;font-size:14px;margin-bottom:4px;">${template.title}</div>
          <div style="font-size:13px;opacity:0.9;">${errorInfo.message || template.message}</div>
          ${template.action ? `
            <button style="margin-top:8px;padding:5px 14px;background:rgba(255,255,255,0.2);border:none;border-radius:6px;color:white;font-size:12px;cursor:pointer;">
              ${template.action}
            </button>
          ` : ''}
        </div>
        <button onclick="this.parentElement.parentElement.remove()" 
                style="background:none;border:none;color:rgba(255,255,255,0.8);font-size:16px;cursor:pointer;">✕</button>
      </div>
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease-out';
      setTimeout(() => toast.remove(), 300);
    }, 5000);

    return toast;
  }

  wrap(fn, context = {}) {
    return (...args) => {
      try {
        const result = fn(...args);
        if (result instanceof Promise) {
          return result.catch(error => this.capture(error, context));
        }
        return result;
      } catch (error) {
        this.capture(error, context);
        throw error;
      }
    };
  }

  async wrapAsync(fn, context = {}) {
    try {
      return await fn();
    } catch (error) {
      this.capture(error, context);
      throw error;
    }
  }
}

const ErrorManager = new ErrorHandler();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ErrorHandler, ErrorManager };
}

class SecureStorage {
  constructor() {
    this.KEY_PREFIX = 'secure_';
    this.SALT = 'drama_workshop_2024';
    this.ITERATIONS = 10000;
    this.KEY_LENGTH = 256;
  }

  async _deriveKey(password) {
    const encoder = new TextEncoder();
    const salt = encoder.encode(this.SALT);
    const passwordKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: this.ITERATIONS, hash: 'SHA-256' },
      passwordKey,
      { name: 'AES-GCM', length: this.KEY_LENGTH },
      false,
      ['encrypt', 'decrypt']
    );
  }

  async encrypt(text, password = this._getDefaultPassword()) {
    if (!text) return '';
    
    try {
      const key = await this._deriveKey(password);
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encoder = new TextEncoder();
      const data = encoder.encode(text);
      const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);
      
      return this._arrayBufferToBase64(iv) + ':' + this._arrayBufferToBase64(ciphertext);
    } catch (e) {
      console.error('Encryption failed:', e);
      return text;
    }
  }

  async decrypt(encryptedText, password = this._getDefaultPassword()) {
    if (!encryptedText || !encryptedText.includes(':')) return encryptedText;
    
    try {
      const key = await this._deriveKey(password);
      const [ivB64, ciphertextB64] = encryptedText.split(':');
      const iv = this._base64ToArrayBuffer(ivB64);
      const ciphertext = this._base64ToArrayBuffer(ciphertextB64);
      const data = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
      
      const decoder = new TextDecoder();
      return decoder.decode(data);
    } catch (e) {
      console.error('Decryption failed:', e);
      return encryptedText;
    }
  }

  _getDefaultPassword() {
    let password = localStorage.getItem('secure_password');
    if (!password) {
      password = this._generateRandomPassword();
      localStorage.setItem('secure_password', password);
    }
    return password;
  }

  _generateRandomPassword() {
    return Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  _arrayBufferToBase64(buffer) {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)));
  }

  _base64ToArrayBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  async setItem(key, value) {
    if (typeof value === 'object') {
      value = JSON.stringify(value);
    }
    const encrypted = await this.encrypt(value);
    localStorage.setItem(this.KEY_PREFIX + key, encrypted);
  }

  async getItem(key) {
    const encrypted = localStorage.getItem(this.KEY_PREFIX + key);
    if (!encrypted) return null;
    
    const decrypted = await this.decrypt(encrypted);
    try {
      return JSON.parse(decrypted);
    } catch {
      return decrypted;
    }
  }

  removeItem(key) {
    localStorage.removeItem(this.KEY_PREFIX + key);
  }

  clear() {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(this.KEY_PREFIX));
    keys.forEach(k => localStorage.removeItem(k));
  }
}

const SecureStorageManager = new SecureStorage();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SecureStorage, SecureStorageManager };
}
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

class PromptEngine {
  constructor() {
    this.templates = {
      outline: {
        system: `你是一位资深的短剧编剧和故事策划专家。请根据用户提供的题材或主题，创作一个引人入胜的短剧大纲。

要求：
1. 结构清晰：包含开头、发展、高潮、结尾
2. 人物鲜明：至少3个主要角色，有明确的性格特点
3. 情节紧凑：适合5-10分钟的短剧时长
4. 有冲突点：包含至少一个核心矛盾或转折点
5. 主题明确：传达一个清晰的主题或价值观

输出格式：
- 故事标题
- 核心主题
- 人物介绍（3-5人）
- 故事梗概（500字以内）
- 分幕大纲（3-5幕）`,
        fewShot: [
          {
            input: "题材：校园青春",
            output: `故事标题：《雨季不再来》
核心主题：青春的遗憾与成长
人物介绍：
1. 林小雨 - 内向敏感的高中生，热爱文学
2. 陈阳 - 阳光开朗的转学生，篮球队队长
3. 班主任 - 温柔睿智的老师

故事梗概：
林小雨暗恋陈阳却不敢表白，毕业前夕鼓起勇气写了一封情书，却阴差阳错被班主任看到。班主任用特别的方式鼓励她勇敢表达，最终小雨在毕业典礼上说出了心里话。

分幕大纲：
第一幕：雨季的邂逅
第二幕：心跳的靠近
第三幕：错过的勇气
第四幕：雨季不再来`
          }
        ]
      },
      script: {
        system: `你是一位专业的剧本创作专家。请根据提供的故事大纲，创作完整的剧本。

要求：
1. 对话自然：符合人物性格和场景
2. 场景明确：每个场景有清晰的时间、地点
3. 动作描写：包含必要的动作和表情描述
4. 节奏适宜：适合短剧节奏

输出格式：
场景号. 场景名称
时间：XXX
地点：XXX
人物：XXX

[场景描述]
对话内容...`,
        fewShot: []
      },
      shot: {
        system: `你是一位资深的影视分镜师。请根据剧本内容，生成分镜脚本。

每个分镜需要包含：
1. 镜号：按顺序编号
2. 镜别：全景/中景/近景/特写等
3. 场景：地点和环境描述
4. 人物：人物位置和动作
5. 运镜：推/拉/摇/移/跟等
6. 画面内容：详细的视觉描述
7. AI绘画提示词：用于AI生成画面的提示词
8. 时长：该镜头预计时长

请确保分镜连贯，视觉效果丰富。`,
        fewShot: [
          {
            input: "场景：教室，小雨递给陈阳情书",
            output: `镜号：1
镜别：中景
场景：高三(2)班教室，下午阳光透过窗户
人物：林小雨（紧张地攥着信封）、陈阳（正在整理书包）
运镜：固定镜头
画面内容：小雨站在陈阳桌旁，脸颊微红，双手递出信封。陈阳抬头露出疑惑的表情。窗外的阳光在他们身上形成光晕。
AI绘画提示词：青春校园教室场景，温暖的午后阳光，少女羞涩递信，男生疑惑抬头，光影斑驳，电影感构图
时长：5秒

镜号：2
镜别：特写
场景：同前
人物：林小雨的手
运镜：缓慢推进
画面内容：特写小雨颤抖的手，信封上写着"陈阳亲启"，字迹清秀。手指因为紧张而微微发白。
AI绘画提示词：少女颤抖的手，信封特写，细腻的皮肤纹理，柔和光线，电影感特写镜头
时长：3秒`
          }
        ]
      },
      character: {
        system: `你是一位专业的人物设定师。请根据故事背景，创作生动的角色设定。

要求：
1. 姓名和身份
2. 外貌特征（年龄、身高、发型、穿着风格）
3. 性格特点（优点、缺点、口头禅）
4. 背景故事（简要经历）
5. 在故事中的作用

输出格式：JSON`,
        fewShot: []
      },
      analyze: {
        system: `你是一位专业的剧本分析专家。请对用户提供的剧本进行深度分析，并给出改进建议。

分析维度：
1. 故事结构：是否完整，节奏是否恰当
2. 人物塑造：角色是否立体，动机是否合理
3. 情节逻辑：是否有漏洞，转折是否自然
4. 主题表达：主题是否明确，是否传达到位

输出格式：
- 优点：列出3-5点
- 问题：列出3-5点
- 改进建议：针对问题给出具体建议`,
        fewShot: []
      },
      rewrite: {
        system: `你是一位专业的剧本润色专家。请根据用户的要求，对剧本进行优化和润色。

要求：
1. 语言更生动：使用更具表现力的词汇
2. 对话更自然：符合人物性格
3. 节奏更紧凑：删除冗余内容
4. 情感更饱满：增强情感表达`,
        fewShot: []
      },
      beatSheet: {
        system: `你是一位专业的故事结构专家。请根据用户提供的故事，生成标准的节拍表。

格式选择（根据故事类型）：
1. 三幕式结构：开场、对抗、结局
2. Save The Cat：15个节拍
3. 四幕式结构：开端、发展、高潮、结局

请选择最适合的结构并详细填写每个节拍。`,
        fewShot: []
      },
      translate: {
        system: `你是一位专业的翻译专家。请将中文内容翻译成英文，确保：
1. 忠于原文含义
2. 语言自然流畅
3. 符合英文表达习惯
4. 保留原文的情感色彩`,
        fewShot: []
      },
      brainstorm: {
        system: `你是一位创意策划专家。请针对用户的需求，进行头脑风暴，提供多种创意方案。

要求：
1. 多样性：提供至少5种不同角度的方案
2. 创新性：包含一些新颖的想法
3. 可行性：方案要考虑实际可行性

输出格式：列出方案，每个方案包含：
- 方案名称
- 核心思路
- 亮点
- 注意事项`,
        fewShot: []
      }
    };

    this.roles = {
      professional: '你是一位经验丰富的专业编剧，善于创作结构严谨、情感真挚的故事。',
      creative: '你是一位充满创意的故事家，善于打破常规，创造独特的叙事方式。',
      concise: '你是一位简洁高效的创作者，能用最少的文字表达最丰富的内容。',
      emotional: '你是一位情感细腻的作家，善于捕捉人物内心的细微变化。',
      humorous: '你是一位幽默风趣的编剧，善于在故事中融入轻松有趣的元素。',
      philosophical: '你是一位富有哲理的创作者，善于在故事中探讨深刻的人生问题。'
    };

    this.cotEnabled = true;
    this.fewShotEnabled = true;
    this.role = 'professional';
  }

  setRole(role) {
    if (this.roles[role]) {
      this.role = role;
    }
    return this.roles[this.role];
  }

  enableCoT(enabled) {
    this.cotEnabled = enabled;
  }

  enableFewShot(enabled) {
    this.fewShotEnabled = enabled;
  }

  buildPrompt(taskType, userInput, options = {}) {
    const template = this.templates[taskType];
    if (!template) {
      throw new Error(`Unknown task type: ${taskType}`);
    }

    let prompt = '';

    // 角色设定
    if (this.role && options.role !== false) {
      prompt += this.roles[this.role] + '\n\n';
    }

    // 系统提示
    prompt += '## 任务要求\n' + template.system + '\n\n';

    // CoT 提示
    if (this.cotEnabled && options.cot !== false) {
      prompt += '## 思考过程\n请先分析需求，再逐步推导答案。\n\n';
    }

    // Few-shot 示例
    if (this.fewShotEnabled && template.fewShot && template.fewShot.length > 0 && options.fewShot !== false) {
      prompt += '## 参考示例\n';
      template.fewShot.forEach((example, index) => {
        prompt += `示例 ${index + 1}：\n输入：${example.input}\n输出：${example.output}\n\n`;
      });
    }

    // 用户输入
    prompt += '## 用户输入\n' + userInput + '\n\n';

    // 输出格式要求
    prompt += '## 输出格式\n请按照上述要求的格式输出结果，不要添加额外解释。';

    return prompt;
  }

  generateOutline(topic, options = {}) {
    return this.buildPrompt('outline', topic, options);
  }

  generateScript(outline, options = {}) {
    return this.buildPrompt('script', outline, options);
  }

  generateShotScript(script, options = {}) {
    return this.buildPrompt('shot', script, options);
  }

  generateCharacter(description, options = {}) {
    return this.buildPrompt('character', description, options);
  }

  analyzeScript(script, options = {}) {
    return this.buildPrompt('analyze', script, options);
  }

  rewriteScript(script, instructions, options = {}) {
    return this.buildPrompt('rewrite', `原文：\n${script}\n\n修改要求：\n${instructions}`, options);
  }

  generateBeatSheet(story, options = {}) {
    return this.buildPrompt('beatSheet', story, options);
  }

  translate(text, options = {}) {
    return this.buildPrompt('translate', text, options);
  }

  brainstorm(topic, options = {}) {
    return this.buildPrompt('brainstorm', topic, options);
  }

  createCustomPrompt(system, userInput, examples = [], options = {}) {
    let prompt = '';
    
    if (this.role && options.role !== false) {
      prompt += this.roles[this.role] + '\n\n';
    }
    
    prompt += '## 系统指令\n' + system + '\n\n';
    
    if (this.cotEnabled && options.cot !== false) {
      prompt += '## 思考过程\n请先分析需求，再逐步推导答案。\n\n';
    }
    
    if (examples && examples.length > 0 && options.fewShot !== false) {
      prompt += '## 参考示例\n';
      examples.forEach((example, index) => {
        prompt += `示例 ${index + 1}：\n输入：${example.input}\n输出：${example.output}\n\n`;
      });
    }
    
    prompt += '## 用户输入\n' + userInput + '\n\n';
    prompt += '## 输出格式\n请按照要求输出结果。';
    
    return prompt;
  }

  getAvailableRoles() {
    return Object.keys(this.roles);
  }

  getAvailableTemplates() {
    return Object.keys(this.templates);
  }

  addTemplate(name, template) {
    this.templates[name] = template;
  }

  addRole(name, description) {
    this.roles[name] = description;
  }
}

const PromptManager = new PromptEngine();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PromptEngine, PromptManager };
}

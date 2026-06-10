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

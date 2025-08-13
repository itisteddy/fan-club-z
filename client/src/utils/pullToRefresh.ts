import React from 'react';

interface PullToRefreshOptions {
  threshold?: number;
  onRefresh: () => Promise<void> | void;
  element?: HTMLElement;
  disabled?: boolean;
}

interface PullToRefreshInstance {
  destroy: () => void;
  setDisabled: (disabled: boolean) => void;
}

export class PullToRefresh {
  private options: Required<PullToRefreshOptions>;
  private element: HTMLElement;
  private startY: number = 0;
  private currentY: number = 0;
  private pullDistance: number = 0;
  private isRefreshing: boolean = false;
  private isPulling: boolean = false;
  private rafId: number | null = null;
  private indicatorElement: HTMLElement | null = null;
  private disabled: boolean = false;

  constructor(options: PullToRefreshOptions) {
    this.options = {
      threshold: 80,
      element: document.body,
      disabled: false,
      ...options,
    };
    
    this.element = this.options.element;
    this.disabled = this.options.disabled;
    this.init();
  }

  private init(): void {
    this.createIndicator();
    this.bindEvents();
  }

  private createIndicator(): void {
    this.indicatorElement = document.createElement('div');
    this.indicatorElement.className = 'pull-to-refresh-indicator';
    this.indicatorElement.innerHTML = `
      <div class="pull-to-refresh-content">
        <div class="pull-to-refresh-icon">
          <svg class="pull-to-refresh-arrow" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 5v14M5 12l7-7 7 7"/>
          </svg>
          <svg class="pull-to-refresh-spinner" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 12a9 9 0 11-6.219-8.56"/>
          </svg>
        </div>
        <span class="pull-to-refresh-text">Pull to refresh</span>
      </div>
    `;

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
      .pull-to-refresh-indicator {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        height: 80px;
        background: linear-gradient(135deg, #10b981, #059669);
        display: flex;
        align-items: center;
        justify-content: center;
        transform: translateY(-80px);
        transition: transform 0.2s ease;
        z-index: 9999;
        color: white;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        backdrop-filter: blur(10px);
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }
      
      .pull-to-refresh-indicator.visible {
        transform: translateY(0);
      }
      
      .pull-to-refresh-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
      }
      
      .pull-to-refresh-icon {
        position: relative;
        width: 24px;
        height: 24px;
      }
      
      .pull-to-refresh-arrow,
      .pull-to-refresh-spinner {
        position: absolute;
        top: 0;
        left: 0;
        transition: opacity 0.2s ease, transform 0.2s ease;
      }
      
      .pull-to-refresh-arrow {
        opacity: 1;
        transform: rotate(180deg);
      }
      
      .pull-to-refresh-spinner {
        opacity: 0;
        animation: spin 1s linear infinite;
      }
      
      .pull-to-refresh-indicator.refreshing .pull-to-refresh-arrow {
        opacity: 0;
      }
      
      .pull-to-refresh-indicator.refreshing .pull-to-refresh-spinner {
        opacity: 1;
      }
      
      .pull-to-refresh-indicator.ready .pull-to-refresh-arrow {
        transform: rotate(0deg);
      }
      
      .pull-to-refresh-text {
        font-size: 14px;
        font-weight: 500;
      }
      
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `;

    if (!document.head.querySelector('#pull-to-refresh-styles')) {
      style.id = 'pull-to-refresh-styles';
      document.head.appendChild(style);
    }

    document.body.appendChild(this.indicatorElement);
  }

  private bindEvents(): void {
    this.element.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: true });
    this.element.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
    this.element.addEventListener('touchend', this.onTouchEnd.bind(this));
  }

  private unbindEvents(): void {
    this.element.removeEventListener('touchstart', this.onTouchStart.bind(this));
    this.element.removeEventListener('touchmove', this.onTouchMove.bind(this));
    this.element.removeEventListener('touchend', this.onTouchEnd.bind(this));
  }

  private findScrollableParent(element: HTMLElement): HTMLElement | null {
    let parent = element.parentElement;
    
    while (parent) {
      const style = window.getComputedStyle(parent);
      const overflowY = style.overflowY;
      
      if (overflowY === 'auto' || overflowY === 'scroll') {
        return parent;
      }
      
      // Check if element has scrollable content
      if (parent.scrollHeight > parent.clientHeight) {
        return parent;
      }
      
      parent = parent.parentElement;
    }
    
    return null;
  }

  private onTouchStart(e: TouchEvent): void {
    if (this.disabled || this.isRefreshing) return;
    
    // Only start if we're at the very top of the page (strict check)
    if (window.scrollY > 5) return;
    
    // Also check if the target element is scrolled
    const target = e.target as HTMLElement;
    const scrollableParent = this.findScrollableParent(target);
    if (scrollableParent && scrollableParent.scrollTop > 5) return;
    
    this.startY = e.touches[0].clientY;
    this.isPulling = false;
  }

  private onTouchMove(e: TouchEvent): void {
    if (this.disabled || this.isRefreshing) return;
    
    this.currentY = e.touches[0].clientY;
    this.pullDistance = Math.max(0, this.currentY - this.startY);
    
    // More restrictive conditions - prevent accidental triggers
    const isAtTop = window.scrollY <= 5;
    const target = e.target as HTMLElement;
    const scrollableParent = this.findScrollableParent(target);
    const isScrollableAtTop = !scrollableParent || scrollableParent.scrollTop <= 5;
    const isPullingSignificantly = this.pullDistance > 50; // Further increased threshold for less sensitivity
    
    // Only prevent default and show indicator if all conditions are met
    if (isPullingSignificantly && isAtTop && isScrollableAtTop) {
      e.preventDefault();
      this.isPulling = true;
      this.updateIndicator();
    }
  }

  private onTouchEnd(): void {
    if (this.disabled || this.isRefreshing || !this.isPulling) return;
    
    if (this.pullDistance >= this.options.threshold) {
      this.refresh();
    } else {
      this.resetIndicator();
    }
    
    this.isPulling = false;
    this.pullDistance = 0;
  }

  private updateIndicator(): void {
    if (!this.indicatorElement) return;
    
    const progress = Math.min(1, this.pullDistance / this.options.threshold);
    const translateY = Math.min(0, progress * 80 - 80);
    
    this.indicatorElement.style.transform = `translateY(${translateY}px)`;
    
    if (this.pullDistance >= this.options.threshold) {
      this.indicatorElement.classList.add('ready');
      this.indicatorElement.querySelector('.pull-to-refresh-text')!.textContent = 'Release to refresh';
    } else {
      this.indicatorElement.classList.remove('ready');
      this.indicatorElement.querySelector('.pull-to-refresh-text')!.textContent = 'Pull to refresh';
    }
  }

  private async refresh(): Promise<void> {
    if (!this.indicatorElement) return;
    
    this.isRefreshing = true;
    this.indicatorElement.classList.add('refreshing', 'visible');
    this.indicatorElement.style.transform = 'translateY(0)';
    this.indicatorElement.querySelector('.pull-to-refresh-text')!.textContent = 'Refreshing...';
    
    try {
      await this.options.onRefresh();
    } catch (error) {
      console.error('Pull to refresh error:', error);
    }
    
    // Show refreshing state for at least 1 second for better UX
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    this.resetIndicator();
  }

  private resetIndicator(): void {
    if (!this.indicatorElement) return;
    
    this.isRefreshing = false;
    this.indicatorElement.classList.remove('refreshing', 'ready', 'visible');
    this.indicatorElement.style.transform = 'translateY(-80px)';
    this.indicatorElement.querySelector('.pull-to-refresh-text')!.textContent = 'Pull to refresh';
  }

  public setDisabled(disabled: boolean): void {
    this.disabled = disabled;
  }

  public destroy(): void {
    this.unbindEvents();
    if (this.indicatorElement) {
      this.indicatorElement.remove();
    }
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
  }
}

// Hook for easy React integration
export const usePullToRefresh = (onRefresh: () => Promise<void> | void, options: Omit<PullToRefreshOptions, 'onRefresh'> = {}) => {
  const instanceRef = React.useRef<PullToRefresh | null>(null);
  
  React.useEffect(() => {
    instanceRef.current = new PullToRefresh({
      ...options,
      onRefresh,
    });
    
    return () => {
      instanceRef.current?.destroy();
    };
  }, [onRefresh]);
  
  return {
    setDisabled: (disabled: boolean) => instanceRef.current?.setDisabled(disabled),
    destroy: () => instanceRef.current?.destroy(),
  };
};
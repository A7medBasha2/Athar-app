import { App } from '@capacitor/app';

export type BackHandler = () => boolean | Promise<boolean>;

interface RegisteredHandler {
  id: string;
  priority: number; // Higher number = executed first
  handler: BackHandler;
}

class BackNavigationServiceClass {
  private handlers: RegisteredHandler[] = [];
  private isInitialized = false;
  private lastBackPressTime = 0;
  private doublePressIntervalMs = 2000;
  private onRootBackPress?: () => void;

  public init(options?: {
    onRootBackPress?: () => void;
    doublePressIntervalMs?: number;
  }) {
    if (this.isInitialized) return;
    this.isInitialized = true;

    if (options?.onRootBackPress) {
      this.onRootBackPress = options.onRootBackPress;
    }
    if (options?.doublePressIntervalMs) {
      this.doublePressIntervalMs = options.doublePressIntervalMs;
    }

    // 1. Listen to Capacitor App Hardware/Gesture Back Button
    try {
      App.addListener('backButton', async () => {
        await this.handleBack();
      });
    } catch (err) {
      console.warn('Capacitor App.addListener not supported in current environment', err);
    }

    // 2. Fallbacks for browser/WebView popstate or legacy Cordova/Android backbutton
    if (typeof window !== 'undefined') {
      window.addEventListener('popstate', () => {
        this.handleBack();
      });

      document.addEventListener('backbutton', (e) => {
        e.preventDefault();
        this.handleBack();
      }, false);

      // Keyboard Escape key support for accessibility and testing
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          this.handleBack();
        }
      });
    }
  }

  /**
   * Register a contextual handler (e.g., modal, drawer, sub-view, audio player).
   * Returns a cleanup unregister function.
   */
  public registerHandler(id: string, priority: number, handler: BackHandler): () => void {
    this.handlers = this.handlers.filter((h) => h.id !== id);
    this.handlers.push({ id, priority, handler });
    this.handlers.sort((a, b) => b.priority - a.priority);

    return () => {
      this.unregisterHandler(id);
    };
  }

  public unregisterHandler(id: string) {
    this.handlers = this.handlers.filter((h) => h.id !== id);
  }

  /**
   * Trigger back action programmatically or from native button.
   * Returns true if handled by an active handler.
   */
  public async handleBack(): Promise<boolean> {
    for (const item of [...this.handlers]) {
      try {
        const handled = await item.handler();
        if (handled) {
          return true; // Successfully consumed
        }
      } catch (err) {
        console.error(`Error in back handler ${item.id}:`, err);
      }
    }

    // If no active modal, subview, or tab history consumed it: trigger root exit sequence
    this.handleRootExit();
    return false;
  }

  /**
   * Double-tap exit logic when at the root view.
   */
  private handleRootExit() {
    const now = Date.now();
    if (now - this.lastBackPressTime < this.doublePressIntervalMs) {
      // Second tap within 2 seconds -> Exit app!
      this.exitApp();
    } else {
      this.lastBackPressTime = now;
      if (this.onRootBackPress) {
        this.onRootBackPress();
      } else if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('athar_show_exit_toast', {
          detail: { message: 'اضغط مرة أخرى للخروج من أثر' }
        }));
      }
    }
  }

  public async exitApp() {
    try {
      await App.exitApp();
    } catch {
      // Native Bridge Fallback for Android MainActivity
      if (typeof window !== 'undefined' && (window as any).AtharNative?.exitApp) {
        (window as any).AtharNative.exitApp();
      }
    }
  }

  public async minimizeApp() {
    try {
      if (typeof window !== 'undefined' && (window as any).AtharNative?.minimizeApp) {
        (window as any).AtharNative.minimizeApp();
      } else {
        await (App as any).minimizeApp?.();
      }
    } catch {}
  }
}

export const BackNavigationService = new BackNavigationServiceClass();

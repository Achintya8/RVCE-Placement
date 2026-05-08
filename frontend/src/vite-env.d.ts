/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

/** Non-standard; not in all TS lib.dom builds. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

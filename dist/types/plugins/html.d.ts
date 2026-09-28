/**
 * Official v-html plugin.
 *
 * Not part of the core bundle: v-html sets innerHTML directly, which is an
 * XSS risk if bound to untrusted content, so it's opt-in rather than always
 * shipped.
 *
 * @example
 * import { createApp } from '@wrium/wrium';
 * import { HtmlPlugin } from '@wrium/wrium/plugins/html';
 *
 * createApp(() => ({ ... })).use(HtmlPlugin).mount('#app');
 *
 * <div v-html="htmlContent"></div>
 */
export declare const HtmlPlugin: {
    install(api: any): void;
};

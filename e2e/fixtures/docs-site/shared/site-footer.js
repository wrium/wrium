/**
 * Shared footer component - same idea as SiteHeader: written once, imported
 * and registered by every page.
 */
export const SiteFooter = {
    template: `<span>Wrium v{{ version }} · MIT License</span>`,
    setup(props) {
        return { version: props.version };
    }
};

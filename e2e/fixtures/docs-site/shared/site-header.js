/**
 * Shared header component - imported and registered by every page of this
 * demo site, so the markup and behavior are written once. `current` (a
 * plain string prop) picks which nav link gets the active style.
 */
export const SiteHeader = {
    template: `
        <a class="logo" href="index.html">Wrium</a>
        <nav>
            <a href="index.html" :class="{ active: current === 'home' }" data-testid="nav-home">Home</a>
            <a href="guide.html" :class="{ active: current === 'guide' }" data-testid="nav-guide">Guide</a>
        </nav>
    `,
    setup(props) {
        return { current: props.current };
    }
};

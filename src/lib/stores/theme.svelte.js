// Thèmes clairs : ils ignorent la préférence système de mode sombre.
// Doit rester aligné avec le script anti-clignotement de `src/app.html`.
const LIGHT_ONLY_THEMES = ['atelier', 'paper'];

export const themeStore = new class {
    isDark = $state(false);
    colorTheme = $state('atelier'); // 'atelier', 'purple', 'blue', 'emerald', 'rose', 'amber', 'paper'

    init() {
        if (typeof window === 'undefined') return;

        // Écoute les préférences système pour le mode sombre
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        this.isDark = mediaQuery.matches;
        mediaQuery.addEventListener('change', e => {
            this.isDark = e.matches;
            this.applyTheme();
        });

        const savedColorTheme = localStorage.getItem('colorTheme');
        if (savedColorTheme) {
            this.colorTheme = savedColorTheme;
        }

        this.applyTheme();
    }

    // Mode réellement rendu. Différent de `!isDark` : un thème clair ignore
    // la préférence système. C'est cette valeur qui décide du logo employé.
    get isLight() {
        return !this.isDark || LIGHT_ONLY_THEMES.includes(this.colorTheme);
    }

    setColorTheme(theme) {
        this.colorTheme = theme;
        localStorage.setItem('colorTheme', theme);
        this.applyTheme();
    }

    applyTheme() {
        if (typeof document === 'undefined') return;

        // Mode sombre, sauf pour les thèmes qui n'existent qu'en clair
        if (this.isDark && !LIGHT_ONLY_THEMES.includes(this.colorTheme)) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }

        document.documentElement.setAttribute('data-theme', this.colorTheme);
    }
}();

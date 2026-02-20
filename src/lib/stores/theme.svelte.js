export const themeStore = new class {
    isDark = $state(true);
    colorTheme = $state('paper'); // 'purple', 'blue', 'emerald', 'rose', 'amber', 'paper'

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

    setColorTheme(theme) {
        this.colorTheme = theme;
        localStorage.setItem('colorTheme', theme);
        this.applyTheme();
    }

    applyTheme() {
        if (typeof document === 'undefined') return;

        // Dark/Light mode
        // Le thème 'paper' force un affichage clair
        if (this.isDark && this.colorTheme !== 'paper') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }

        // Color theme mapping
        if (this.colorTheme === 'purple') {
            document.documentElement.removeAttribute('data-theme');
        } else {
            document.documentElement.setAttribute('data-theme', this.colorTheme);
        }
    }
}();

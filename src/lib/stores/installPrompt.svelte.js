/**
 * Invite d'installation de la PWA.
 * PWA install prompt.
 *
 * Le navigateur n'émet `beforeinstallprompt` qu'une fois, et l'événement doit
 * être conservé pour être rejoué au moment où l'utilisateur clique. Cette
 * mécanique vivait dans le script de la page ; elle est regroupée ici.
 *
 * The browser fires `beforeinstallprompt` only once, and the event must be
 * kept so it can be replayed when the user clicks. This machinery used to live
 * in the page script; it is gathered here.
 */
class InstallPrompt {
	// Événement retenu, à rejouer au clic / Retained event, replayed on click
	#deferred = null;

	// Vrai quand l'installation peut être proposée / True when install can be offered
	available = $state(false);

	// Vrai dès qu'un événement a été capté, même si le bouton reste masqué
	// True as soon as an event was captured, even if the button stays hidden
	captured = $state(false);

	/**
	 * Écoute les événements d'installation. Renvoie une fonction de nettoyage.
	 * Listens for install events. Returns a cleanup function.
	 *
	 * @param {() => boolean} [canOffer] - Permet de masquer le bouton sur un
	 *   appareil trop limité, tout en gardant l'événement.
	 * @returns {() => void}
	 */
	listen(canOffer = () => true) {
		if (typeof window === 'undefined') return () => {};

		const onBeforeInstall = (event) => {
			event.preventDefault();
			this.#deferred = event;
			this.captured = true;
			this.available = canOffer();
		};

		const onInstalled = () => {
			this.#deferred = null;
			this.captured = false;
			this.available = false;
		};

		window.addEventListener('beforeinstallprompt', onBeforeInstall);
		window.addEventListener('appinstalled', onInstalled);

		return () => {
			window.removeEventListener('beforeinstallprompt', onBeforeInstall);
			window.removeEventListener('appinstalled', onInstalled);
		};
	}

	/**
	 * Affiche l'invite native et attend le choix de l'utilisateur.
	 * Shows the native prompt and waits for the user's choice.
	 *
	 * @returns {Promise<string | null>} l'issue rapportée par le navigateur
	 */
	async prompt() {
		if (!this.#deferred) return null;

		this.#deferred.prompt();
		const { outcome } = await this.#deferred.userChoice;

		// L'événement n'est rejouable qu'une fois / The event is replayable once
		this.#deferred = null;
		this.captured = false;
		this.available = false;

		return outcome;
	}
}

export const installPrompt = new InstallPrompt();

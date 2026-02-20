import { error } from '@sveltejs/kit';

// Charge tous les fichiers Markdown du dossier /docs
// Load all Markdown files from the /docs folder
const docs = import.meta.glob('../../../../../docs/**/*.md', {
    query: '?raw',
    import: 'default',
    eager: true
});

export function GET({ params }) {
    // Si aucun fichier spécifié, renvoyer README.md par défaut
    // If no file specified, default to README.md
    const file = params.file || 'README.md';

    // Ajoute l'extension .md si elle n'est pas présente
    // Add .md extension if missing
    const fileName = file.endsWith('.md') ? file : `${file}.md`;

    // Construit le chemin relatif tel qu'il est indexé par Vite
    // Build the relative path as indexed by Vite
    const path = `../../../../../docs/${fileName}`;

    if (docs[path]) {
        return new Response(docs[path], {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8'
            }
        });
    }

    throw error(404, 'Fichier de documentation introuvable / Documentation file not found');
}

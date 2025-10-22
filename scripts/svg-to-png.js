/**
 * Script pour convertir le logo SVG en PNG source pour les icônes
 * Script to convert SVG logo to PNG source for icons
 * 
 * Utilisation / Usage:
 * bun run scripts/svg-to-png.js
 * 
 * Ce script convertit src/lib/assets/logo.svg en static/icon-source.png (1024x1024px)
 * This script converts src/lib/assets/logo.svg to static/icon-source.png (1024x1024px)
 */

import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// Chemins / Paths
const SOURCE_SVG = 'src/lib/assets/logo.svg';
const OUTPUT_PNG = 'static/icon-source.png';
const SIZE = 1024;

/**
 * Fonction principale / Main function
 */
async function main() {
	console.log('🎨 Conversion du logo SVG en PNG source / Converting SVG logo to source PNG\n');
	
	try {
		// Lit le fichier SVG / Read SVG file
		console.log(`📖 Lecture du fichier / Reading file: ${SOURCE_SVG}`);
		const svgBuffer = readFileSync(SOURCE_SVG);
		
		// Modifie le SVG pour avoir un fond transparent / Modify SVG for transparent background
		// On ajoute un fond de couleur si nécessaire / Add background color if needed
		console.log(`🔄 Conversion en PNG ${SIZE}x${SIZE}px...`);
		
		await sharp(svgBuffer)
			.resize(SIZE, SIZE, {
				fit: 'contain',
				background: { r: 15, g: 23, b: 42, alpha: 1 } // Couleur de fond de l'app / App background color
			})
			.png()
			.toFile(OUTPUT_PNG);
		
		console.log(`✅ PNG source créé avec succès / Source PNG created successfully!`);
		console.log(`📁 Fichier / File: ${OUTPUT_PNG}`);
		console.log(`\n💡 Prochaine étape / Next step:`);
		console.log(`   Exécutez / Run: bun run generate:icons`);
		
	} catch (error) {
		console.error('❌ Erreur lors de la conversion / Error during conversion:', error.message);
		process.exit(1);
	}
}

// Exécute / Execute
main();

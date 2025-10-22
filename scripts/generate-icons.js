/**
 * Script pour générer les icônes PWA / Script to generate PWA icons
 * 
 * Utilisation / Usage:
 * bun run scripts/generate-icons.js
 * 
 * Requis / Required:
 * - Une image source de 1024x1024px minimum dans static/icon-source.png
 * - A source image of at least 1024x1024px in static/icon-source.png
 */

import sharp from 'sharp';
import { mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

// Tailles d'icônes à générer / Icon sizes to generate
const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

// Tailles d'icônes maskable / Maskable icon sizes
const MASKABLE_SIZES = [192, 512];

// Chemins / Paths
const SOURCE_ICON = 'static/icon-source.png';
const OUTPUT_DIR = 'static';

/**
 * Génère une icône à la taille spécifiée / Generate icon at specified size
 */
async function generateIcon(size, isMaskable = false) {
	const filename = isMaskable 
		? `icon-maskable-${size}x${size}.png`
		: `icon-${size}x${size}.png`;
	
	const outputPath = join(OUTPUT_DIR, filename);
	
	console.log(`📦 Génération / Generating: ${filename}`);
	
	try {
		let pipeline = sharp(SOURCE_ICON);
		
		if (isMaskable) {
			// Pour les icônes maskable, on ajoute un padding de 10%
			// For maskable icons, add 10% padding
			const paddedSize = Math.round(size * 0.8);
			const padding = Math.round((size - paddedSize) / 2);
			
			pipeline = pipeline
				.resize(paddedSize, paddedSize, {
					fit: 'contain',
					background: { r: 124, g: 58, b: 237, alpha: 1 } // theme_color
				})
				.extend({
					top: padding,
					bottom: padding,
					left: padding,
					right: padding,
					background: { r: 124, g: 58, b: 237, alpha: 1 }
				});
		} else {
			// Icône normale / Normal icon
			pipeline = pipeline.resize(size, size, {
				fit: 'contain',
				background: { r: 15, g: 23, b: 42, alpha: 1 } // background_color
			});
		}
		
		await pipeline.png().toFile(outputPath);
		
		console.log(`✅ Créé / Created: ${filename}`);
	} catch (error) {
		console.error(`❌ Erreur / Error generating ${filename}:`, error.message);
		throw error;
	}
}

/**
 * Génère le favicon / Generate favicon
 */
async function generateFavicon() {
	console.log('📦 Génération du favicon / Generating favicon...');
	
	try {
		await sharp(SOURCE_ICON)
			.resize(32, 32, {
				fit: 'contain',
				background: { r: 15, g: 23, b: 42, alpha: 1 }
			})
			.png()
			.toFile('static/favicon.png');
		
		console.log('✅ Favicon créé / Favicon created');
	} catch (error) {
		console.error('❌ Erreur favicon / Error generating favicon:', error.message);
		throw error;
	}
}

/**
 * Génère l'icône Apple Touch / Generate Apple Touch icon
 */
async function generateAppleTouchIcon() {
	console.log('📦 Génération Apple Touch Icon...');
	
	try {
		await sharp(SOURCE_ICON)
			.resize(180, 180, {
				fit: 'contain',
				background: { r: 15, g: 23, b: 42, alpha: 1 }
			})
			.png()
			.toFile('static/apple-touch-icon.png');
		
		console.log('✅ Apple Touch Icon créé / Apple Touch Icon created');
	} catch (error) {
		console.error('❌ Erreur Apple Touch Icon:', error.message);
		throw error;
	}
}

/**
 * Main function
 */
async function main() {
	console.log('🚀 Génération des icônes PWA / Generating PWA icons\n');
	
	// Vérifie que l'image source existe / Check if source image exists
	if (!existsSync(SOURCE_ICON)) {
		console.error(`❌ Image source non trouvée / Source image not found: ${SOURCE_ICON}`);
		console.log('\n💡 Conseil / Tip:');
		console.log('   Placez une image PNG de 1024x1024px dans static/icon-source.png');
		console.log('   Place a 1024x1024px PNG image in static/icon-source.png');
		process.exit(1);
	}
	
	// Le dossier static existe déjà / The static directory already exists
	console.log(`📁 Génération des icônes dans / Generating icons in: ${OUTPUT_DIR}\n`);
	
	try {
		// Génère les icônes normales / Generate normal icons
		console.log('📦 Icônes normales / Normal icons:');
		for (const size of ICON_SIZES) {
			await generateIcon(size, false);
		}
		
		console.log('\n📦 Icônes maskable:');
		// Génère les icônes maskable / Generate maskable icons
		for (const size of MASKABLE_SIZES) {
			await generateIcon(size, true);
		}
		
		console.log('\n📦 Icônes spéciales / Special icons:');
		// Génère les icônes spéciales / Generate special icons
		await generateFavicon();
		await generateAppleTouchIcon();
		
		console.log('\n✅ Toutes les icônes ont été générées avec succès !');
		console.log('✅ All icons generated successfully!');
		console.log(`\n📁 Dossier / Folder: ${OUTPUT_DIR}`);
		
	} catch (error) {
		console.error('\n❌ Erreur lors de la génération / Error during generation');
		process.exit(1);
	}
}

// Execute
main();

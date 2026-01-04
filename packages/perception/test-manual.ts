/**
 * Manual test script for perception package
 *
 * Run with: npx tsx test-manual.ts <url> [delay_ms]
 * Examples:
 *   npx tsx test-manual.ts https://example.com
 *   npx tsx test-manual.ts https://example.com 3000
 */

import {
  captureFullPage,
  captureSections,
  detectVisualBoundaries,
  closeBrowser,
} from './src/index';
import { writeFileSync, mkdirSync } from 'fs';

const url = process.argv[2] || 'https://example.com';
const delay = parseInt(process.argv[3] || '2000', 10); // Default 2 seconds

// Extract domain for output folder (e.g., "example.com" from "https://example.com/path")
const domain = new URL(url).hostname.replace(/^www\./, '');
const outputDir = `output/${domain}`;

async function main() {
  console.log(`\n🔍 Perception Pipeline Test`);
  console.log(`   URL: ${url}`);
  console.log(`   Delay: ${delay}ms\n`);

  try {
    // Create output directory
    mkdirSync(outputDir, { recursive: true });

    // Step 1: Capture full page screenshot
    console.log('1️⃣  Capturing full page screenshot...');
    const screenshot = await captureFullPage(url, {
      timeout: 60000,
      waitUntil: 'load',
      delay,
      waitForImages: true,
    });

    const fullPagePath = `${outputDir}/full-page.png`;
    writeFileSync(fullPagePath, screenshot.buffer);
    console.log(`   ✓ Captured: ${screenshot.width}x${screenshot.height}px (${(screenshot.buffer.length / 1024).toFixed(1)} KB)`);
    console.log(`   ✓ Saved: ${fullPagePath}\n`);

    // Step 2: Detect visual boundaries (requires AI API key)
    console.log('2️⃣  Detecting visual boundaries...');
    let boundaries: Awaited<ReturnType<typeof detectVisualBoundaries>> = [];
    const hasApiKey = process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY;

    if (!hasApiKey) {
      console.log('   ⚠️  No AI API key found (set ANTHROPIC_API_KEY or OPENAI_API_KEY)');
      console.log('   ⚠️  Skipping AI boundary detection\n');
    } else {
      try {
        boundaries = await detectVisualBoundaries(screenshot);
        console.log(`   ✓ Found ${boundaries.length} sections:`);
        boundaries.forEach((b, i) => {
          const height = b.bottom - b.top;
          console.log(`     [${i + 1}] y: ${b.top}-${b.bottom} (${height}px) confidence: ${(b.confidence * 100).toFixed(0)}%${b.description ? ` - ${b.description}` : ''}`);
        });
        console.log();
      } catch (err) {
        console.log(`   ⚠️  Boundary detection failed: ${err instanceof Error ? err.message : err}\n`);
      }
    }

    // Step 3: Capture individual sections (if boundaries detected)
    if (boundaries.length > 0) {
      console.log('3️⃣  Capturing section screenshots...');
      await closeBrowser(); // Reset browser for section capture

      try {
        const sections = await captureSections(url, {
          timeout: 60000,
          waitUntil: 'load',
          delay,
          waitForImages: true,
        });

        console.log(`   ✓ Captured ${sections.length} sections:`);
        sections.forEach((section, i) => {
          const sectionPath = `${outputDir}/section-${i + 1}.png`;
          writeFileSync(sectionPath, section.buffer);
          console.log(`     [${i + 1}] ${section.width}x${section.height}px → ${sectionPath}`);
        });

        // Summary
        console.log(`\n✅ Pipeline complete!`);
        console.log(`   Output directory: ${outputDir}/`);
        console.log(`   - full-page.png`);
        sections.forEach((_, i) => {
          console.log(`   - section-${i + 1}.png`);
        });
      } catch (err) {
        console.log(`   ⚠️  Section capture failed: ${err instanceof Error ? err.message : err}`);
        console.log(`\n✅ Partial pipeline complete!`);
        console.log(`   Output directory: ${outputDir}/`);
        console.log(`   - full-page.png`);
      }
    } else {
      console.log('3️⃣  Skipping section capture (no boundaries detected)\n');
      console.log(`✅ Partial pipeline complete!`);
      console.log(`   Output directory: ${outputDir}/`);
      console.log(`   - full-page.png`);
    }

  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    await closeBrowser();
  }
}

main();

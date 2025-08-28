// generator/build.js
const fs = require('fs-extra');
const path = require('path');
const simpleGit = require('simple-git');
const { parseWorkflows } = require('./parse.js');
const { renderSite, generateSitemap } = require('./render.js'); // Ensure generateSitemap is imported

const SOURCE_REPO = 'https://github.com/Zie619/n8n-workflows.git';
const TMP_DIR = path.join(__dirname, '../tmp/n8n-workflows');
const STATIC_DIR = path.join(__dirname, '../static');
const OUTPUT_DIR = path.join(__dirname, '../docs');

async function main() {
    console.log('Starting build process...');

    // 1. Clone or pull the source repository
    console.log('Fetching source workflows...');
    await fs.ensureDir(TMP_DIR);
    const git = simpleGit();
    if (await fs.pathExists(path.join(TMP_DIR, '.git'))) {
        await git.cwd(TMP_DIR).pull();
    } else {
        await git.clone(SOURCE_REPO, TMP_DIR);
    }
    
    // 2. Parse workflows into metadata
    console.log('Parsing workflows...');
    const data = await parseWorkflows();
    
    // Ensure the output directory exists
    await fs.ensureDir(OUTPUT_DIR);

    // Copy everything from /static into /docs/src
    console.log('Copying static assets...');
    await fs.copy(STATIC_DIR, path.join(OUTPUT_DIR, 'src'));

    // 3. Generate the searchable index file
    await fs.writeJson(path.join(OUTPUT_DIR, 'index.json'), data.workflows);
    console.log(`Created index.json with ${data.workflows.length} workflows.`);

    // 4. Generate static HTML pages
    console.log('Generating static site...');
    await renderSite(data);

    // 5. Generate sitemap --- THIS IS THE CRITICAL STEP THAT WAS MISSING ---
    console.log('Generating sitemap...');
    await generateSitemap(data);
    console.log('Created sitemap.xml');

    // 6. Clean up temporary files
    console.log('Cleaning up temporary files...');
    await fs.remove(TMP_DIR);

    console.log('Build process completed successfully!');
}

main().catch(error => {
    console.error('Build failed:', error);
    process.exit(1);
});
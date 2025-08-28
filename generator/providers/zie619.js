// generator/providers/zie619.js
const fs = require('fs-extra');
const path = require('path');

const TMP_DIR = path.join(__dirname, '../../tmp/n8n-workflows');
const SOURCE_DIR = path.join(TMP_DIR, 'workflows');
const DOCS_DIR = path.join(TMP_DIR, 'Documentation');

const STOP_WORDS = new Set(['a', 'an', 'the', 'is', 'in', 'it', 'of', 'for', 'on', 'with', 'to', 'and', 'when', 'add', 'edit', 'set', 'get', 'return', 'then', 'or', 'if', 'by', 'from', 'at', 'as']);

/**
 * Parses all .md files in the Documentation directory to extract workflow descriptions.
 * @returns {Promise<Map<string, string>>} A map where the key is the workflow filename and the value is its description.
 */
async function parseMarkdownDescriptions() {
    const descriptions = new Map();
    if (!await fs.pathExists(DOCS_DIR)) {
        console.warn('Documentation directory not found. Skipping description parsing.');
        return descriptions;
    }

    const docFiles = await fs.readdir(DOCS_DIR);
    const mdRegex = /^\*\*Filename:\*\*\s`(.+?)`\s*\n\*\*Description:\*\*\s(.*?)\s*\n/gm;

    for (const file of docFiles) {
        if (path.extname(file) === '.md') {
            const content = await fs.readFile(path.join(DOCS_DIR, file), 'utf-8');
            let match;
            while ((match = mdRegex.exec(content)) !== null) {
                const filename = match[1];
                const description = match[2].trim();
                descriptions.set(filename, description);
            }
        }
    }
    console.log(`Parsed ${descriptions.size} descriptions from documentation files.`);
    return descriptions;
}

function generateTags(nodes) {
    if (!nodes || nodes.length === 0) return [];
    const wordCounts = new Map();
    nodes.forEach(node => {
        const words = node.name.toLowerCase().split(/[\s_-]+/);
        words.forEach(word => {
            if (word.length > 2 && !STOP_WORDS.has(word) && isNaN(word)) {
                wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
            }
        });
    });
    return Array.from(wordCounts.entries())
        .sort(([, countA], [, countB]) => countB - countA)
        .slice(0, 10)
        .map(([word]) => word);
}

async function parse() {
    console.log('Running Zie619 provider...');
    const descriptionsMap = await parseMarkdownDescriptions();
    const workflows = [];
    const tools = new Map();
    const toolDirs = await fs.readdir(SOURCE_DIR);

    for (const tool of toolDirs) {
        const toolPath = path.join(SOURCE_DIR, tool);
        if ((await fs.stat(toolPath)).isDirectory()) {
            if (!tools.has(tool)) tools.set(tool, 0);
            const files = await fs.readdir(toolPath);

            for (const file of files) {
                if (path.extname(file) === '.json') {
                    const filePath = path.join(toolPath, file);
                    const fileContent = await fs.readJson(filePath, { throws: false });

                    const title = path.basename(file, '.json').replace(/^\d+_+/, '').replace(/_/g, ' ');
                    const tags = generateTags(fileContent ? fileContent.nodes : []);
                    const slug = title.replace(/\s+/g, '-').toLowerCase();
                    
                    // The standardized output object
                    workflows.push({
                        id: `${tool}-${slug}`,
                        title: title,
                        description: descriptionsMap.get(file) || 'No description available.', // NEW
                        tool: tool,
                        rawFilename: file,
                        tags: tags,
                        path: `workflow/${tool}/${slug}/`,
                        downloadUrl: `https://raw.githubusercontent.com/Zie619/n8n-workflows/main/workflows/${tool}/${file}`,
                        sourceFile: `https://github.com/Zie619/n8n-workflows/blob/main/workflows/${tool}/${file}`
                    });

                    tools.set(tool, tools.get(tool) + 1);
                }
            }
        }
    }
    return { workflows, tools: Object.fromEntries(tools) };
}

module.exports = { parse };
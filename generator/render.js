// generator/render.js
const fs = require('fs-extra');
const path = require('path');
const { SitemapStream, streamToPromise } = require('sitemap');

const DOCS_DIR = path.join(__dirname, '../docs');
const TEMPLATES_DIR = path.join(__dirname, 'templates');
const HIGHLIGHT_FILE = path.join(__dirname, '../highlight.json');
const BASE_URL = 'https://n8n.mgks.dev';

let templates;
async function loadTemplates() {
    if (templates) return templates;
    const [layout, homepage, workflow, tool] = await Promise.all([
        fs.readFile(path.join(TEMPLATES_DIR, 'layout.html'), 'utf-8'),
        fs.readFile(path.join(TEMPLATES_DIR, 'homepage.html'), 'utf-8'),
        fs.readFile(path.join(TEMPLATES_DIR, 'workflow.html'), 'utf-8'),
        fs.readFile(path.join(TEMPLATES_DIR, 'tag.html'), 'utf-8'),
    ]);
    templates = { layout, homepage, workflow, tool };
    return templates;
}

function renderInLayout(content, meta, bodyClass = '', data) {
    if (!data || !data.workflows) {
        throw new Error('The "data" object with a "workflows" property must be provided to renderInLayout.');
    }
    const canonicalUrl = `${BASE_URL}${meta.url}`;
    const ogImage = `${BASE_URL}/src/og-image.png`;
    return templates.layout
        .replace('{{content}}', content)
        .replace(/{{title}}/g, meta.title)
        .replace(/{{meta_description}}/g, meta.description)
        .replace('{{body_class}}', bodyClass)
        .replace('{{workflow_count}}', data.workflows.length)
        .replace(/{{canonical_url}}/g, canonicalUrl)
        .replace(/{{og_image}}/g, ogImage);
}

function createPill(text, type, url = null) {
    if (url) {
        return `<a href="${url}" class="pill pill-${type}">${text}</a>`;
    }
    return `<span class="pill pill-${type}">${text}</span>`;
}

// --- THIS FUNCTION IS NOW THE TEMPLATE FOR ALL WORKFLOW CARDS ---
function createWorkflowListItem(wf) {
    const toolPill = createPill(wf.tool, 'tool', `/workflow/${wf.tool}/`); // Now a link
    const tagsHTML = wf.tags.slice(0, 4).map(tag => createPill(tag, 'tag')).join('');
    
    const trimmedDescription = wf.description.length > 120 
        ? wf.description.substring(0, 120) + '...' 
        : wf.description;

    return `
        <div class="list-item">
            <div class="item-content">
                <h3><a href="/${wf.path}">${wf.title}</a></h3>
                <p class="item-description">${trimmedDescription}</p>
                <div class="pills-container">${toolPill}${tagsHTML}</div>
            </div>
            <div class="item-actions">
                <a href="${wf.downloadUrl}" class="icon-button" download target="_blank" title="Download JSON">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" /><path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" /></svg>
                </a>
            </div>
        </div>
    `;
}

async function renderSite(data) {
    await loadTemplates();
    const defaultDesc = "The first centralised, searchable, and hosted directory of n8n workflows. Find automations for any tool or category.";

    // 1. Render Homepage
    const toolLinks = Object.keys(data.tools).slice(0, 12).map(t => `<a href="/workflow/${t}/" class="pill pill-tool">${t}</a>`).join('');
    const highlightData = await fs.readJson(HIGHLIGHT_FILE, { throws: false });
    let homepageContent = templates.homepage
        .replace('{{tools}}', toolLinks)
        .replace('{{workflow_count}}', data.workflows.length)
        .replace('{{tool_count}}', Object.keys(data.tools).length);

    if (highlightData && highlightData.enabled) {
        const hw = highlightData.workflow;
        const tagsHTML = hw.tags.map(tag => createPill(tag, 'tag')).join('');
        const highlightedHTML = `<div class="highlighted-workflow"><h3><a href="${hw.url}" target="_blank" rel="noopener noreferrer">${hw.title}</a></h3><div class="pills-container">${createPill(hw.category || 'Featured', 'tool')}${tagsHTML}</div></div>`;
        homepageContent = homepageContent.replace('{{highlighted_workflow}}', highlightedHTML);
    } else {
        homepageContent = homepageContent.replace('{{highlighted_workflow}}', '');
    }

    const homepageMeta = { 
        title: 'n8n Workflow Hub - Find Your Perfect Automation', 
        description: defaultDesc, 
        url: '/' 
    };
    const homepageHtml = renderInLayout(homepageContent, homepageMeta, 'homepage', data);
    await fs.writeFile(path.join(DOCS_DIR, 'index.html'), homepageHtml);

    // 2. Render Workflow Pages
    for (const wf of data.workflows) {
        const pillsHTML = createPill(wf.tool, 'tool', `/workflow/${wf.tool}/`) + wf.tags.map(t => createPill(t, 'tag')).join('');
        
        const wfContent = templates.workflow
            .replace(/{{title}}/g, wf.title)
            .replace('{{pills}}', pillsHTML)
            .replace('{{description}}', wf.description)
            .replace('{{sourceFile}}', wf.sourceFile)
            .replace('{{downloadUrl}}', wf.downloadUrl)
            .replace(/{{rawFilename}}/g, wf.rawFilename);
        
        const meta = { title: `${wf.title} - n8n Workflow`, description: wf.description };
        const wfHtml = renderInLayout(wfContent, meta, 'subpage', data);
        
        const wfDir = path.join(DOCS_DIR, wf.path);
        await fs.ensureDir(wfDir);
        await fs.writeFile(path.join(wfDir, 'index.html'), wfHtml);
    }

    // 3. Render Tool Pages
    const workflowsByTool = data.workflows.reduce((acc, wf) => {
        if (!acc[wf.tool]) acc[wf.tool] = [];
        acc[wf.tool].push(wf);
        return acc;
    }, {});

    for (const toolName in workflowsByTool) {
        const toolWorkflows = workflowsByTool[toolName];
        const workflowListHtml = toolWorkflows.map(createWorkflowListItem).join('');
        const toolContent = templates.tool.replace('{{title}}', `Tool: ${toolName}`).replace('{{list}}', workflowListHtml);
        const meta = { title: `Workflows for ${toolName}`, description: `Find n8n workflows for the ${toolName} tool.` };
        
        const toolHtml = renderInLayout(toolContent, meta, 'subpage', data);
        
        const toolDir = path.join(DOCS_DIR, 'workflow', toolName);
        await fs.ensureDir(toolDir);
        await fs.writeFile(path.join(toolDir, 'index.html'), toolHtml);
    }
}

async function generateSitemap(data) {
    console.log('[Sitemap] Starting sitemap generation...');
    try {
        const stream = new SitemapStream({ hostname: BASE_URL });

        // Create an array of all links
        const links = [
            { url: '/', changefreq: 'daily', priority: 1.0 }
        ];

        for (const toolName in data.tools) {
            links.push({ url: `/workflow/${toolName}/`, changefreq: 'daily', priority: 0.8 });
        }

        for (const wf of data.workflows) {
            links.push({ url: `/${wf.path}`, changefreq: 'weekly', priority: 0.6 });
        }

        // Write all links to the stream
        links.forEach(link => stream.write(link));
        stream.end();

        // Convert the stream to a string in memory
        const sitemapXml = (await streamToPromise(stream)).toString();
        console.log(`[Sitemap] Generated XML content (${sitemapXml.length} bytes).`);

        // Write the complete string to the file
        const sitemapPath = path.join(DOCS_DIR, 'sitemap.xml');
        await fs.writeFile(sitemapPath, sitemapXml);
        console.log(`[Sitemap] Successfully written to ${sitemapPath}`);

    } catch (error) {
        console.error('[Sitemap] Failed to generate sitemap:', error);
        // We re-throw the error to ensure the build process fails if the sitemap fails
        throw error;
    }
}

module.exports = { renderSite, generateSitemap };
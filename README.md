# n8n Workflow Hub

> The largest searchable directory of community-sourced n8n workflows. A fast, self-updating, and fully-hosted static site.

**Live Site:** [**n8n.mgks.dev**](https://n8n.mgks.dev)

## About The Project

This project provides the largest centralized, searchable, and hosted directory for the incredible collection of community-sourced n8n workflows from the [`Zie619/n8n-workflows`](https://github.com/Zie619/n8n-workflows) repository.

Previously, accessing this massive library required cloning the repository and running a local server. This project automates that entire process, generating a fast, static, and SEO-friendly website that is **updated daily**, so you always have access to the latest workflows.

### Key Features

* **Instant Search:** Quickly find workflows by title, tool, or tags using Fuse.js.
* **Massive Collection:** Browse 2,000+ workflows in one place — the most comprehensive directory available.
* **Always Fresh:** A GitHub Action updates the site every day with the latest workflows.
* **Zero Setup:** Fully hosted on GitHub Pages. No installs, no servers, no friction.

## How It Works

This project is powered by a simple and robust automation pipeline built with GitHub Actions and Node.js:

1. **Fetch:** A scheduled GitHub Action clones the `Zie619/n8n-workflows` repository.
2. **Parse:** A Node.js script reads all workflow `.json` files, extracting metadata like the title, tool, and generating search tags from the node names.
3. **Build:** The script generates a complete static HTML website (homepage, tool pages, and workflow detail pages) along with an `index.json` file for the client-side search.
4. **Deploy:** The final site, located in the `/docs` directory, is automatically committed and deployed to GitHub Pages.

## Acknowledgements

This project is a frontend and automation layer built on top of an existing data source. It would not be possible without the incredible work of:

* **[Zie619](https://github.com/Zie619)** for creating and maintaining the comprehensive [**n8n-workflows**](https://github.com/Zie619/n8n-workflows) repository. Please consider supporting their work.
* The entire n8n community for contributing workflows.

The generator pipeline and frontend for this hub were built by **[mgks](https://github.com/mgks)**.
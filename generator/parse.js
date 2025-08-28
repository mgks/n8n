// generator/parse.js
const zie619Provider = require('./providers/zie619.js');

/**
 * Orchestrates the parsing of workflows from all configured providers.
 * For now, it only calls the Zie619 provider.
 * In the future, this function could aggregate data from multiple sources.
 */
async function parseWorkflows() {
    console.log('Starting workflow parsing orchestration...');
    
    // Call the provider to get the standardized workflow data
    const data = await zie619Provider.parse();
    
    // Here you could add logic to merge data from other providers if needed
    // For example: const otherData = await otherProvider.parse();
    // const combinedData = { ... };

    console.log(`Parsing complete. Total workflows processed: ${data.workflows.length}`);
    return data;
}

module.exports = { parseWorkflows };
#!/usr/bin/env node
const yargs = require('yargs');
const api = require('../lib/api/api');

// configure the options
const options = yargs.usage('Call tool-runner')
    .option("r", {describe: 'Default result Path for STEP files.', alias: 'resultPath', type: 'string', demandOption: false})
    .option("p", {alias: 'port', describe: 'Port to use for the API server', type: 'number', demandOption: false})
    .option("production", {describe: 'Run the server in production mode.', demandOption: false, type: 'boolean'})
    .help(true)
    .argv

// run the server
api.runServer({
    port: options.port, 
    resultPath: options.resultPath, 
    production: !!options.production
})

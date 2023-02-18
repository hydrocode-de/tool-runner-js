import * as express from 'express';
import * as run from '../run';
import { ToolConfig } from '../models/ToolConfig'

// cereate the API server
const app = express()


let TOOL_CACHE: ToolConfig[] = []

// refresh the tool cache
const refreshCache = async (query: {refresh?: any} = {}): Promise<void> => {
    // check if the tools have been cached
    if (TOOL_CACHE.length === 0 || (query.refresh && Boolean(query.refresh))) {
        // update the tools cache
        await run.listTools()
            .then(tools => TOOL_CACHE = tools)
            .then(() => console.log(`[${new Date().toISOString()}] The tools cache was updated.`))
    }

    return Promise.resolve()
}


// create the routes
app.get('/', (req, res) => {
    res.json({
        message: 'Tool Runner JS API',
        endpoints: [

        ],
        dev: {
            params: req.params,
            url: req.baseUrl,
            headers: req.headers,
            q: req.query
        }
    })
})

app.get('/tools', async (req, res) => {
    // wait until the TOOL cache is refreshed
    await refreshCache(req.query)    

    // tools are cached now
    res.status(200).json({
        count: TOOL_CACHE.length,
        tools: TOOL_CACHE
    })
})

app.get('/tools/:toolName', async (req, res) => {
    // wait until the TOOL cache is refreshed
    await refreshCache(req.query)

    // get the tool
    const tool = TOOL_CACHE.find(t => t.name.toLowerCase() === req.params.toolName.toLowerCase())

    if (!tool) {
        res.status(404).json({
            message: `The tool '${req.params.toolName}' could not be found.`
        })
    }
    res.status(200).json({
        tool
    })

})

export interface RunServerOptions {
    port?: number
}

export const runServer = (options: RunServerOptions= {}) => {
    // get the port
    const port = options.port || process.env.PORT || 3000;
    
    // run the app
    app.listen(port, () => {
        console.log(`Tool Runner JS API running at http://localhost:${port}`)
    })
}
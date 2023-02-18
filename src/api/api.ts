import * as express from 'express';
import e = require('express');

import { refreshCache, filterToolName, ReqTools, ReqTool } from './middleware';


// cereate the API server
const app = express()

// always use the caching middleware
app.use('/tools*', refreshCache)
app.use('/tools/:toolName*', filterToolName )


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

app.get('/tools', (req, res) => {
    // tools are cached now
    res.status(200).json({
        count: (req as e.Request & ReqTools).tools.length,
        tools: (req as e.Request & ReqTools).tools
    })
})

app.get('/tools/:toolName',(req, res) => {
    // just send back the tool
    res.status(200).json({
        tool: (req as e.Request<{toolName: string}> & ReqTool).tool
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
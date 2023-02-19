import * as express from 'express';
import * as e from 'express';
import * as cors from 'cors';

import { refreshCache, filterToolName, ReqTools, ReqTool } from './middleware';
import * as run from '../run';


const _addAPIEndpoints = (app: e.Express, production=false, defaultResultPath?: string): e.Express => { 
    // create the routes
    app.get('/', (req, res) => {
        const response: any = {
            message: 'Tool Runner JS API',
            endpoints: [

            ]
        }

        if (!production) {
            response['dev'] = {
                params: req.params,
                url: req.baseUrl,
                headers: req.headers,
                q: req.query
            }
        }
        res.json(response)
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

    app.get('/tools/:toolName/run', async (req, res) => {
        // get the tool
        const tool = (req as e.Request<{toolName: string}> & ReqTool).tool

        // check the query params, anything that is not refresh, will be parsed
        const { refresh, resultPath, mountPath, ...args} = req.query

        // build the options
        const opts: run.RunOptions = {
            resultPath: resultPath as string | undefined,
            mountPath: mountPath as string | undefined
        }

        // add the defaultResultPath if set
        if (defaultResultPath) {
            opts.resultPath = defaultResultPath
        }

        // run the tool
        const response = await run.runTool(tool, opts, args)

        // return 
        res.status(200).json({
            message: `Run of tool '${tool.name}' finished.`,
            output: response
        })
    })

    // return 
    return app
}


export interface RunServerOptions {
    port?: number,
    production?: boolean,
    resultPath?: string,
}

export const runServer = (options: RunServerOptions= {}) => {
    // get the port
    const port = options.port || process.env.PORT || 3000;

    // get the options
    if (!options.production) {
        console.log('Tool Runner JS API starting...')
        console.log(options)
    }

    // cereate the API server
    let app = express()

    // always enable CORS
    app.use(cors())

    // always use the caching middleware
    app.use('/tools*', refreshCache)
    app.use('/tools/:toolName*', filterToolName )

    // add more middleware
    ;

    // add the final routes
    app = _addAPIEndpoints(app, !!options.production, options.resultPath)

    // run the app
    app.listen(port, () => {
        console.log(`  * http://localhost:${port}`)
    })
}
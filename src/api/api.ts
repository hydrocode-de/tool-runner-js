import * as express from 'express';
import * as e from 'express';
import * as cors from 'cors';
import * as fs from 'fs';

import { refreshCache, filterToolName, ReqTools, ReqTool } from './tool-middleware';
import { addResultPath, loadStep, ReqResultPath, ReqStep, StepParams } from './step-middleware';
import * as run from '../run';
import * as step from '../step';


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

    app.get('/steps', (req, res) => {
        // make sure either resultPath is set or passed as query param
        const resultPath = (req as e.Request & ReqResultPath).resultPath

        // get the filter from the files
        const filter = {...(req.query.toolName && {toolName: req.query.toolName as string})}
        
        const stepPreviews = step.listStepFiles(resultPath, filter)

        // send the response
        res.status(200).json({
            count: stepPreviews.length,
            steps: stepPreviews
        })
    })

    app.get('/steps/:stepName', (req, res) => {
        // get the result path
        const step = (req as e.Request<StepParams> & ReqStep).step

        res.status(200).json(step)
    })

    app.get('/steps/:stepName/:file', (req, res) => {
        // get the result path
        const step = (req as e.Request<StepParams> & ReqStep).step

        res.status(200).json(step)
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

    // add result path handling
    app.use('/steps', addResultPath(options.resultPath))

    // always use the caching middleware
    app.use('/tools*', refreshCache)
    app.use('/tools/:toolName*', filterToolName)
    app.use('/steps/:stepName', loadStep)


    // add more middleware
    ;

    // add the final routes
    app = _addAPIEndpoints(app, !!options.production, options.resultPath)

    // run the app
    app.listen(port, () => {
        console.log(`  * http://localhost:${port}`)
    })
}
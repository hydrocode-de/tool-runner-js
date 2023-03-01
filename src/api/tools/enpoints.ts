import * as e from 'express';

import { ReqTool, ReqTools } from './middleware';
import * as run from '../../run';


export const addToolEndpoints = (app: e.Express, defaultResultPath?: string): e.Express => {
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

        let runArgs: {[key: string]: any} = {};
        if (args.runArgs) {
            runArgs = JSON.parse(args.runArgs as string)
        } else {
            runArgs = args
        }

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
        const response = await run.runTool(tool, opts, runArgs)

        // return 
        res.status(200).json({
            message: `Run of tool '${tool.name}' finished.`,
            output: response
        })
    })

    app.post('/tools/:toolName/run', async (req, res) => {
        // get the tool
        const tool = (req as e.Request<{toolName: string}> & ReqTool).tool

        // check the query params, anything that is not refresh, will be parsed
        const { refresh, resultPath, mountPath, ...args} = req.body
        
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

    return app

}
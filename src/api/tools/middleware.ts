import * as e from 'express'
import { performance } from 'perf_hooks';

import { ToolConfig } from '../../models/ToolConfig'
import * as run from '../../run';


// caching
let TOOL_CACHE: ToolConfig[] = []
let CACHE_AGE = performance.now()
const MAX_AGE = process.env.CACHE_MAX_AGE || 24 * 60 * 60 * 1000

export interface ReqTools {
    tools: ToolConfig[]
}

export interface ReqTool extends ReqTools {
    tool: ToolConfig;
}


// middleware to refresh the TOOL cache
export const refreshCache = async (req: e.Request, res: e.Response, next: e.NextFunction) => {
    // check if the tools have been cached
    if (
        TOOL_CACHE.length === 0 || 
        (req.query.refresh && Boolean(req.query.refresh)) || 
        performance.now() - CACHE_AGE > MAX_AGE)
    {    
        // update the tools cache
        await run.listTools()
            .then(tools => TOOL_CACHE = tools)
            .then(() => console.log(`[${new Date().toISOString()}] The tools cache was updated.`))
    }

    // here the TOOL_CACHE is updated, add the list to the request
    (req as e.Request & {tools: ToolConfig[]}).tools = TOOL_CACHE


    // jump to the next middleware
    next()
}

export const filterToolName = async (req: e.Request<{toolName: string}>, res: e.Response, next: e.NextFunction) => {
    // the tools Middleware has to be run first
    const toolName = req.params.toolName.toLowerCase()
    const tool = (req as e.Request<{toolName: string}> & ReqTools).tools.find(t => t.name.toLowerCase() === toolName)

    // check if a tool was found
    if (tool) {
        (req as e.Request<{toolName: string}> & ReqTool).tool = tool
        next()
    } else {
        res.status(404).send({
            message: `The tool '${toolName}' could not be found.`
        })
    }
}
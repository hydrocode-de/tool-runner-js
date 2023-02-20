import * as e from 'express';
import * as memoize from 'memoizee';

import { StepContent, showStepContent, ShowStepOptions } from '../step'; 


// create a cached version
const loadStepContent = memoize((tarName: string, options: ShowStepOptions ={}): StepContent => {
    return showStepContent(tarName, options)
}, {maxAge: Number(process.env.CACHE_MAX_AGE) || 60 * 60 * 1000})

export interface ReqResultPath {
    resultPath: string
}

export const addResultPath = (defaultResultPath?: string) =>  (req: e.Request, res: e.Response, next: e.NextFunction) => {
    // make sure either resultPath is set or passed as query param
    const resultPath: string | null = defaultResultPath || req.query.resultPath as string || null

    if (!resultPath) {
        res.status(404).send({
            message: 'No resultPath is set. Either send the path to STEP files as query parameter or start the API with a result path like: npx @hydrocode/tool-runner --resultPath=/path/to/STEP-files.'
        })
    } else {
        (req as e.Request & ReqResultPath).resultPath = resultPath
        next()
    }
}

export interface ReqStep {
    step: StepContent
}

export const loadStep = async (req: e.Request<{stepName: string}>, res: e.Response, next: e.NextFunction) => {
    // load the requested step
    const stepName = req.params.stepName.toLowerCase()
    const step = loadStepContent(stepName);

    // add to the request
    if (step) {
        (req as e.Request<{stepName: string}> & ReqStep).step = step
        // continue with next 
        next()
    } else {
        res.status(404).send({
            message: `The STEP file '${stepName}' was not found.`
        })
    }
}
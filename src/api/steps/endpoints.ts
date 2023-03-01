import * as e from 'express'

import * as step from '../../step'
import { ReqResultPath, ReqStep, StepParams } from './middleware'


export const addStepsEndpoints = (app: e.Express): e.Express => {
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

    return app
}
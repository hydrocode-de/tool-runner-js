import * as express from 'express';
import * as e from 'express';
import * as cors from 'cors';

import { refreshCache, filterToolName, addToolEndpoints } from './tools';
import { addResultPath, loadStep, addStepsEndpoints } from './steps';
import { healthz } from '../docker';


const _addAPIEndpoints = (app: e.Express, production=false, defaultResultPath?: string): e.Express => { 
    // ADD general routes
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

    app.get('/healthz', async (req, res) => {
        const health = await healthz()

        res.status(200).json(health)
    })

    // add the tool endpoints
    app = addToolEndpoints(app, defaultResultPath)

    // add the steps endpoints
    app = addStepsEndpoints(app)

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

    // automatically parse json body
    app.use(express.json())

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
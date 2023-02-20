import * as tar from 'tar';

export interface StepContent {
    input: string[],
    output: string[],
    metadata: {[key: string]: any},
    log: string,
    errors: string
}

const listStepContent = (path: string) => {}
import * as tar from 'tar';
import * as fs from 'fs';

export interface StepContent {
    inputs: string[],
    outputs: string[],
    metadata: {[key: string]: any},
    log?: string,
    errors?: string
}

export interface StepPreview {
    name: string,
    toolName?: string,
    created?: string | Date
}

export interface ListStepFilter {
    toolName?: string
}

export const listStepFiles = (resultPath: string, filter: ListStepFilter ={}): StepPreview[] => {
    // read the files
    const files = fs.readdirSync(resultPath, {withFileTypes: true}).filter(f => {
        return f.isFile() && f.name.endsWith('.tar.gz')
    })

    // transform to previews
    let previews = files.map(f => {
        return { 
            name: f.name, 
            toolName: f.name.split('_').pop()?.split('.')[0],
            created: new Date(Number(f.name.split('_')[0]) * 1000)
        }
    })

    if (filter.toolName) {
        previews = previews.filter(p => p.toolName === filter.toolName)
    }

    return previews
}


export const extractFile = (tarPath: string, filename: string, encoding?: BufferEncoding): Buffer | string => {
    // create a buffer
    const buffer: Buffer[] = []

    // read the tar
    tar.t({
        sync: true,
        file: tarPath,
        onentry: e => {
            if (e.path.endsWith(filename)) {
                e.on('data', c => buffer.push(c))
            }
        }
    })

    // create the Buffer
    const buf = Buffer.concat(buffer)

    // return buffer or string if encoding is given
    if (encoding) {
        return buf.toString(encoding)
    } else {
        return buf
    }
}

export interface ShowStepOptions {
    skipErrors?: boolean,
    skipLog?: boolean,
    skipMetadata?: boolean,
    loadFiles?: string[]
}

export const showStepContent = (path: string, opt: ShowStepOptions ={}): StepContent => {
    // create the step container contents
    const inputs: string[] = []
    const outputs: string[] = []
    let metadata: {[key: string]: any} = {}
    let log: string | undefined = undefined
    let errors: string | undefined = undefined

    // define the callback for handling the content files
    const onentry = (e: tar.ReadEntry) => {
        // get the input files and output filenames
        if (e.path.includes('/in/') && !e.path.endsWith('/in/')) {
            inputs.push(e.path.slice(e.path.indexOf('/in/') + 4))
        }
        if (e.path.includes('/out/') && !e.path.endsWith('/out/')) {
            outputs.push(e.path.slice(e.path.indexOf('/out/') + 5))
        }

        // load metadata if not skipped
        if (e.path.endsWith('metadata.json') && !opt.skipMetadata) {
            metadata = JSON.parse(extractFile(path, e.path, 'utf8') as string)
        }

        // load standard-error stream output if not skipped
        if (e.path.endsWith('STDERR.log') && !opt.skipErrors) {
            errors = extractFile(path, e.path, 'utf8') as string
        }

        // load standard output stream if not skipped
        if (e.path.endsWith('STDOUT.log') && !opt.skipLog) {
            log = extractFile(path, e.path, 'utf8') as string
        }
    }

    // open the tar
    tar.t({
        sync: true,
        onentry,
        file: path
    })

    // return the StepContent
    return {
        inputs,
        outputs,
        metadata,
        ...(typeof log !== 'undefined' && { log }),
        ...(typeof errors !== 'undefined' && { errors })
    }
}

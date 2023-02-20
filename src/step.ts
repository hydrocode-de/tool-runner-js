import * as tar from 'tar';

export interface StepContent {
    inputs: string[],
    outputs: string[],
    metadata: {[key: string]: any},
    log?: string,
    errors?: string
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

export interface ListStepOptions {
    skipErrors?: boolean,
    skipLog?: boolean
}

export const listStepContent = (path: string, opt: ListStepOptions ={}): StepContent => {
    // create the step container contents
    const inputs: string[] = []
    const outputs: string[] = []
    let metadata: {[key: string]: any} = {}
    let log: string | undefined = undefined
    let errors: string | undefined = undefined

    // define the callback for handling the content files
    const onentry = (e: tar.ReadEntry) => {
        if (e.path.includes('/in/') && !e.path.endsWith('/in/')) {
            inputs.push(e.path.slice(e.path.indexOf('/in/') + 4))
        }
        if (e.path.includes('/out/') && !e.path.endsWith('/out/')) {
            outputs.push(e.path.slice(e.path.indexOf('/out/') + 5))
        }
        if (e.path.endsWith('metadata.json')) {
            metadata = JSON.parse(extractFile(path, e.path, 'utf8') as string)
        }
        if (e.path.endsWith('STDERR.log') && !opt.skipErrors) {
            errors = extractFile(path, e.path, 'utf8') as string
        }
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

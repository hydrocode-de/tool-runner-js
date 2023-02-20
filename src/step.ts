import * as tar from 'tar';
import * as fs from 'fs';

export interface StepContentFile {
    name: string,
    type?: string,
    content: any
}

export interface StepContent {
    inputs: string[],
    outputs: string[],
    metadata: {[key: string]: any},
    log?: string,
    errors?: string,
    files?: {[fileName: string]: StepContentFile}
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
    let loadedFiles: {[fileName: string]: StepContentFile} = {};

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

        // check if any extra file was required
        if (opt.loadFiles && opt.loadFiles.some(f => e.path.endsWith(f))) {
            const fileName = e.path.split('/').pop() || e.path
            const type = fileName.split('.').slice(1).join('.')
            loadedFiles[fileName] = {
                name: fileName,
                type: fileName.split('.').slice(1).join('.'),
                content: extractFile(path, e.path, ['pdf', 'png', 'jpeg', 'tif'].includes(type) ? 'base64' : 'utf8')
            }
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
        ...(typeof errors !== 'undefined' && { errors }),
        ...(Object.keys(loadedFiles).length > 0 && { files: loadedFiles })
    }
}

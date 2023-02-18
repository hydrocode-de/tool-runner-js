import { Container, ContainerCreateOptions } from 'dockerode';
import { parse } from 'yaml';
import { WritableStream } from 'memory-streams';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import * as tar from 'tar';
import { performance } from 'perf_hooks';


import docker from './docker';
import { ToolConfig } from './models/ToolConfig';
import { buildParameterFile } from './parameter';


const getImageTags = async (prefix: string[] | string = 'tbr_'): Promise<string[]> => {
    // make prefix a list always
    const allowed_prefixes = Array.isArray(prefix) ? prefix : [prefix]

    // filter existing images
    return docker.listImages().then((images) => {
        return images
            // filter for prefix
            .filter(image => image.RepoTags && image.RepoTags.length > 0)
            .filter(image => image.RepoTags?.some(tag => allowed_prefixes.some(pre => tag.startsWith(pre))))
            .map(image => (image.RepoTags as string[])[0])

    })
}


const getToolsFromImage = async (imageTag: string): Promise<ToolConfig[]> => {
    const stdout = new WritableStream()

    const toolObjs: ToolConfig[] = [];
    await docker.run(imageTag, ['cat', '/src/tool.yml'], stdout).then(data => {
        //const output = data[0];
        const container: Container = data[1];
        
        // parse the yaml
        const obj = parse(stdout.toString())
        
        Object.entries(obj.tools).forEach(([toolName, toolConfig]) => {
            toolObjs.push({
                ...(toolConfig as Exclude<ToolConfig, 'name'>),
                name: toolName,
                image: imageTag
            })
        })

        return container;

    }).then(c => c.remove())

    return new Promise(resolve => resolve(toolObjs))
}

export const listTools = async (prefix: string | string[] = 'tbr_'): Promise<ToolConfig[]>  => {
    // get all images containing tools
    const tags = await getImageTags(prefix);
    
    // wait until all images return the tools
    return Promise.all(tags.map(tag => getToolsFromImage(tag))).then(value => value.flat())
}


export interface RunOptions {
    mountPath?: string,
    keepContainer?: boolean,
    resultPath?: string
}

export const runTool = async (tool: ToolConfig, options: RunOptions= {}, args: {}= {}): Promise<string> => {
    // handle the paths
    let basePath: string;
    if (options.mountPath) {
        basePath = options.mountPath;
    } else {
        basePath = fs.mkdtempSync(os.tmpdir())
    }

    // make in and out-dirs
    const inDir = `${basePath}/in`;
    const outDir = `${basePath}/out`;
    if (!fs.existsSync(inDir)) fs.mkdirSync(inDir)
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir)

    // build the parameterization
    const paramPath = buildParameterFile(args, inDir, tool)

    // capture the streams
    const stdout = new WritableStream()
    const stderr = new WritableStream()

    // build the options
    const opts: ContainerCreateOptions = {
        Env: ['PARAM_FILE=/in/parameters.json', `RUN_TOOL=${tool.name}`],
        Tty: false,
        HostConfig: {
            Binds: [
                `${path.resolve(inDir)}:/in`,
                `${path.resolve(outDir)}:/out`
            ]
        }
    }

    // run and get the container
    const t1 = performance.now()
    const container = await docker.run(tool.image, [], [stdout, stderr], opts, {}).then(data => {
        return data[1] as Container
    })
    const t2 = performance.now()

    // save stdout and stderr
    fs.writeFileSync(`${outDir}/STDOUT.log`, stdout.toBuffer())
    fs.writeFileSync(`${outDir}/STDERR.log`, stderr.toBuffer())
    
    // save metadata
    const metadata = {
        container_id: container.id,
        runtime: (t2 - t1) / 1000,
        name: tool.name,
        image: tool.image,
        tag: tool.image.split(':').pop(),
        repository: tool.image.split(':').slice(0, -1).join('')
    }
    fs.writeFileSync(`${basePath}/metadata.json`, JSON.stringify(metadata, null, 4))

    // remove the container again
    if (!options.keepContainer) {
        container.remove()
    }

    // check if a result path was given
    if (options.resultPath) {
        const tarpath = path.join(options.resultPath, `${Math.floor(Date.now() / 1000)}_${tool.name}.tar.gz`)
        await tar.c({
            gzip: true,
            portable: true,
            file: tarpath,
        }, [ `${basePath}` ])

        // return the tarpath
        return new Promise(resolve => resolve(tarpath))
    } else {
        return new Promise(resolve => resolve(stdout.toString()))
    }
}

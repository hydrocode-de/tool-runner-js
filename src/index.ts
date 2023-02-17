import { Container } from 'dockerode';
import { parse } from 'yaml';
import { WritableStream } from 'memory-streams';
import * as os from 'os';
import * as fs from 'fs';

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


export interface RunOptions {
    path?: string
}

const runTool = async (tool: ToolConfig, options: RunOptions= {}, args: {}= {}): Promise<void> => {
    // handle the paths
    let basePath: string;
    if (options.path) {
        basePath = options.path;
    } else {
        basePath = fs.mkdtempSync(os.tmpdir())
    }

    // make in and out-dirs
    const inDir = `${basePath}/in`;
    const outDir = `${basePath}/out`;
    if (!fs.existsSync(inDir)) fs.mkdirSync(inDir)
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir)

    const paramPath = buildParameterFile(args, inDir, tool)
    return Promise.resolve()
}

// getImageTags().then(tags => getToolsFromImage(tags[0])).then(l => console.log(l))


const TEST = {
    fooInt: 42,
    fooFloat: 13.12,
    fooStr: 'foobar'
}

const toolConfig: ToolConfig = {
    name: 'foobar',
    title: 'foobar',
    image: 'foobar',
    description: 'test-tool',
    parameters: {
        fooInt: {type: 'integer'},
        fooFloat: {type: 'float'},
        fooStr: {type: 'string'}
    }
}

runTool(toolConfig, {path: './test'}, TEST)
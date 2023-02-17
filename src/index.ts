import { Container } from 'dockerode';
import { parse } from 'yaml';
import { WritableStream } from 'memory-streams';
import * as os from 'os';
import * as fs from 'fs';

import docker from './docker';
import { ToolConfig } from './models/ToolConfig';
export { ToolConfig } from './models/ToolConfig';
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
    path?: string
}

export const runTool = async (tool: ToolConfig, options: RunOptions= {}, args: {}= {}): Promise<void> => {
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

    // build the parameterization
    const paramPath = buildParameterFile(args, inDir, tool)

    docker.run()



    return Promise.resolve()
}

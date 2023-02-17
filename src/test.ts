import { listTools, ToolConfig, runTool  } from './index'

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

//runTool(toolConfig, {path: './test'}, TEST)

listTools().then(tools => console.log(tools))
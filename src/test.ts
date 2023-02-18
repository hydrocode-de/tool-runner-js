import { listTools, runTool  } from './run'
import { ToolConfig } from './models/ToolConfig'

// getImageTags().then(tags => getToolsFromImage(tags[0])).then(l => console.log(l))


const TEST = {
    foo_int: 42,
    foo_float: 13.12,
    foo_string: 'foobar'
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

listTools().then(tools => {
    //console.log(tools)
    
    const tool = tools.find(t => t.name === 'profile')

    if (tool) {
        runTool(tool, {mountPath: './test', resultPath: './'}, {data: './test/dataframe.csv'})
        .then(path => console.log(path))
    }

})
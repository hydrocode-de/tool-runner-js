import * as fs from 'fs';
import { unparse } from 'papaparse';

import { ToolConfig } from "./models/ToolConfig"

export const buildParameterFile = (args: any, inDir: string, toolConfig: ToolConfig): string => {
    // build the params object
    const params: any = {}

    // iterate through all arguments
    Object.entries(args).forEach(([paramName, paramValue]) => {
        // get the paramName
        const paramConfig = toolConfig.parameters[paramName];

        if (paramConfig.type === 'file') {
            // matrix
            if (Array.isArray(paramValue) && paramValue.every(r => Array.isArray(r))) {
                // 2D matrix
                if (paramValue.every(row => row.every((cell: any) => typeof cell === 'number'))) {
                    // create a dat matrix
                    const matrix_rows = paramValue.map((row: number[]) => row.map(cell => cell.toPrecision()).join(' '))
                    const matrix = matrix_rows.join('\r\n')
                    
                    // write the file and save
                    fs.writeFileSync(`${inDir}/${paramName}.dat`, matrix)
                    params[paramName] = `/in/${paramName}.dat`
                }
                // CSV
                else if (Array.isArray(paramValue) && paramValue.every(r => typeof r === 'object')) {
                    const csv = unparse(paramValue)

                    // write
                    fs.writeFileSync(`${inDir}/${paramName}.csv`, csv)
                    params[paramName] = `/in/${paramName}.csv`
                }
            } else if (typeof paramValue === 'string') {
                // this is an existing file ==> copy
                if (fs.existsSync(paramValue)) {
                    // copy the file and save
                    fs.copyFileSync(paramValue, `${inDir}/${paramName}.${paramValue.split('.').pop()}`)
                    params[paramName] = `/in/${paramName}.${paramValue.split('.').pop()}`
                } 
                
                // this is base64 encoded payload
                else if (paramValue.includes(';base64,')) {
                    // split and get the payload
                    const [mime, payload] = paramValue.substring(5).split(';base64,')
                    const fname = `${paramName}.${mime.split('/').pop()}`    // here a lookup dict could be implemented

                    // write the file
                    fs.writeFileSync(`${inDir}/${fname}`, payload, {encoding: 'base64'})
                    params[paramName] = `/in/${fname}`
                } 
                
                // this is assumed to be a text file
                else {
                    // plain text file is assumed
                    fs.writeFileSync(`${inDir}/${paramName}.txt`, paramValue)
                    params[paramName] = `/in/${paramName}.txt`
                }

            } 
            else {
                // just serialize it
                fs.writeFileSync(`${inDir}/${paramName}.json`, JSON.stringify(paramValue))
                params[paramName] = `/in/${paramName}.json`
            }

        } else {
            params[paramName] = paramValue;
        }    
    })

    // write the file
    const parameters: any = {}
    parameters[toolConfig.name] = params
    fs.writeFileSync(`${inDir}/parameters.json`, JSON.stringify(parameters, null, 4))

    return `${inDir}/parameters.json`
}
import * as Docker from 'dockerode'


// not yet sure about this part
const docker = new Docker()


export interface DockerHealth {
    running: boolean
    version: string
}
export const healthz = async (): Promise<DockerHealth> => {
    const version =  await docker.info()
            .then(value => value.ServerVersion)
            .catch(() => null)

    return new Promise(resolve => {
        resolve({
            running: !!version,
            version: version ? version : ''
        })
    })
}

export default docker;
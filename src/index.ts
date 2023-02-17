import docker from './docker';
import { Container } from 'dockerode';


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

const getToolsFromImage = (imageTag: string): void => {
    docker.run(imageTag, ['cat', '/src/tool.yml'], process.stdout).then(data => {
        const output = data[0];
        const container: Container = data[1];
        
        console.log(output)
        return container;

    }).then(c => c.remove())

    
}


getImageTags().then(tags => getToolsFromImage(tags[0]))
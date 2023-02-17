export interface ParameterConfig {
    type: string;
    description?: string;
    values?: string[];
    min?: number;
    max?: number;
    optional?: boolean;
    default?: any;
    array?: boolean;
}

export interface ToolConfig {
    image: string;
    name: string;
    title: string;
    description: string;
    version?: string;
    cmd?: string;
    parameters: {[name: string]: ParameterConfig}
}

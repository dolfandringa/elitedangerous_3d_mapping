
interface funcArgs {
    [x: string]: any;
}

interface ILayer {
    name: string;
    pretty_name: string;
    default_on: boolean;
}

interface IJSONPCDLayer extends ILayer {
    fileURI: string
}

interface IEDSMLayer extends ILayer {
    endpoint: string;
    parameters: {
        [k: string]: any;
    }
}

export class Layer {
    public name: string;
    public pretty_name: string;
    public default_on: boolean;
    constructor({ name, pretty_name, default_on }: ILayer) {
        this.name = name;
        this.pretty_name = pretty_name;
        this.default_on = default_on;
    }
}

export class JSONPCDLayer extends Layer {
    public fileURI: string;
    constructor({ fileURI, ...rest }: IJSONPCDLayer) {
        super(rest);
        this.fileURI = fileURI;
    }
}
export class NebulaLayer extends JSONPCDLayer {
    // Technically the same as a JSONPCDLayer, but will be handleded differently in the app
    // so we want to be able to differentite them.
}

export class EDSMLayer extends Layer {
    public endpoint: string;
    public parameters: {
        [k: string]: any;
    }
    constructor({ endpoint, parameters, ...rest }: IEDSMLayer) {
        super(rest);
        this.endpoint = endpoint;
        this.parameters = parameters;
    }
}
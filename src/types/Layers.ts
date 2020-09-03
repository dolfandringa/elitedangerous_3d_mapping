
interface funcArgs {
    [x: string]: any;
}

interface ILayer {
    name: string;
    pretty_name: string;
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
    constructor({ name, pretty_name }: ILayer) {
        this.name = name;
        this.pretty_name = pretty_name;
    }
}

export class JSONPCDLayer extends Layer {
    public fileURI: string;
    constructor({ fileURI, ...rest }: IJSONPCDLayer) {
        super(rest);
        this.fileURI = fileURI;
    }
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
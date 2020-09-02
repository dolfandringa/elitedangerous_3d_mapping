export interface Layer {
    name: string;
}

export interface JSONLayer extends Layer{
    fileURI: string;
}

export interface EDSMLayer extends Layer{
    endpoint: string;
    parameters: {
        [k: string]: any;
    }
}
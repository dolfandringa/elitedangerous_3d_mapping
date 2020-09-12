import { ILayer, Layer } from './Layers';

export interface IJSONPCDLayer extends ILayer {
    fileURI: string
}

export class JSONPCDLayer extends Layer {
    public fileURI: string;

    constructor({ fileURI, ...rest }: IJSONPCDLayer) {
      super(rest);
      this.fileURI = fileURI;
    }
}

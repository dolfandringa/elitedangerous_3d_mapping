import { ILayer, Layer } from './Layers';

export interface IEDSMLayer extends ILayer {
    parameters: {
        [k: string]: any;
    }
}

export class EDSMLayer extends Layer {
    public parameters: {
        [k: string]: any;
    }

    constructor({ parameters, ...rest }: IEDSMLayer) {
      super(rest);
      this.parameters = parameters;
    }
}

import { Color } from './base';

export interface ILayer {
    name: string;
    prettyName: string;
    defaultOn: boolean;
    color: Color;
}

export class Layer {
    public name: string;

    public prettyName: string;
    public color: Color;

    public defaultOn: boolean;

    constructor({ name, prettyName, defaultOn, color }: ILayer) {
      this.name = name;
      this.color = color;
      this.prettyName = prettyName;
      this.defaultOn = defaultOn;
    }
}

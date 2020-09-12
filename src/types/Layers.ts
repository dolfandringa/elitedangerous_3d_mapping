export interface ILayer {
    name: string;
    prettyName: string;
    defaultOn: boolean;
}

export class Layer {
    public name: string;

    public prettyName: string;

    public defaultOn: boolean;

    constructor({ name, prettyName, defaultOn }: ILayer) {
      this.name = name;
      this.prettyName = prettyName;
      this.defaultOn = defaultOn;
    }
}

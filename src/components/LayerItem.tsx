import * as React from 'react';
import { Checkbox, Button } from 'semantic-ui-react';
import { Layer } from '../types/Layers';

interface LayerItemProps {
    layer: Layer;
    layerToggle: (layer: Layer, on: boolean) => void;
    layerZoom: (layer: Layer) => void;
}

export default class LayerItem extends React.Component<LayerItemProps> {
    constructor(props: LayerItemProps) {
        super(props);
    }

    layerToggle(event: React.FormEvent<HTMLInputElement>, { checked }) {
        this.props.layerToggle(this.props.layer, checked);
    }

    layerZoom(event: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
        this.props.layerZoom(this.props.layer);
    }

    render() {
        return (
            <div>
                <Checkbox style={{ minWidth: '100px' }} onChange={this.layerToggle.bind(this)} label={this.props.layer.pretty_name} name={this.props.layer.name} toggle />
                <Button onClick={this.layerZoom.bind(this)} data-tooltip="Zoom to layer" circular floated="right" icon='zoom' />
            </div>
        );
    }
}
import * as React from 'react';
import { Checkbox, Button } from 'semantic-ui-react';
import { Layer } from '../types';
import { MapContext } from '../context';

interface LayerItemProps {
    layer: Layer;
}

export default class LayerItem extends React.Component<LayerItemProps> {
    constructor(props: LayerItemProps) {
        super(props);
    }

    static contextType = MapContext;
    context: React.ContextType<typeof MapContext>;

    layerToggle(event: React.FormEvent<HTMLInputElement>, { checked }) {
        this.context.layerToggle(this.props.layer, checked);
    }

    layerZoom(event: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
        this.context.layerZoom(this.props.layer);
    }

    render() {
        let loaded = this.context.loadedLayers.includes(this.props.layer)
        let active = this.context.activeLayers.includes(this.props.layer)
        return (
            <div>
                <Checkbox checked={active} style={{ minWidth: '100px' }} onChange={this.layerToggle.bind(this)} label={this.props.layer.prettyName} name={this.props.layer.name} toggle />
                <Button onClick={this.layerZoom.bind(this)} data-tooltip="Zoom to layer" circular floated="right" icon='zoom' />
            </div>
        );
    }
}

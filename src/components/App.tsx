import * as React from 'react';
import MapCanvas from './MapCanvas';
import LayerList from './LayerList';
import SystemInfo from './SystemInfo';
import { Grid, Header } from 'semantic-ui-react';
import { Layer } from '../types';
import { cloneDeep } from 'lodash';

interface AppProps { }
interface AppState {
    activeLayers: Layer[];
}

export default class App extends React.Component<AppProps, AppState> {

    constructor(props: AppProps) {
        super(props);
        this.state = {
            activeLayers: []
        } as AppState;
    }

    layerToggle(layer: Layer, on: Boolean) {
        const oldLayers = cloneDeep(this.state.activeLayers);
        const oldLayerNames = oldLayers.map(lyr => lyr.name);
        let newLayers: Layer[];
        if (on && !oldLayerNames.includes(layer.name)) {
            newLayers = [...oldLayers, layer];
        } else if (on) {
            console.error('Layer is already on:', layer);
            return;
        } else if (oldLayerNames.includes(layer.name)) {
            newLayers = oldLayers.filter((l) => l.name != layer.name);
        }
        else {
            console.error('Layer is already off:', layer);
            return;
        }
        this.setState({ activeLayers: newLayers });
    }

    layerZoom(layer: Layer) {
        console.log("Zoom", event.target);
    }

    render() {
        return (
            <Grid columns={4}>
                <Grid.Row>
                    <Grid.Column width={16}>
                        <Header as="h1">Banana Nebula Notable Stellar Phenomena Map</Header>
                    </Grid.Column>
                </Grid.Row>
                <Grid.Row>
                    <Grid.Column width={12}>
                        <MapCanvas layers={this.state.activeLayers} />
                    </Grid.Column>
                    <Grid.Column>
                        <Grid columns={4}>
                            <Grid.Row>
                                <LayerList layerToggle={this.layerToggle.bind(this)} layerZoom={this.layerZoom.bind(this)} />
                            </Grid.Row>
                            <Grid.Row>
                                <SystemInfo />
                            </Grid.Row>
                        </Grid>
                    </Grid.Column>
                </Grid.Row>
            </Grid>
        );
    }
}
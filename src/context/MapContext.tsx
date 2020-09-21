import React, { Component } from 'react';
import { Layer, JSONPCDLayer, EDSMLayer } from '../types';
import { cloneDeep } from 'lodash';


type MapContextType = {
    activeLayers: Layer[];
    loadedLayers: Layer[];
    layers: Layer[];
    setLayers: (layers: Layer[]) => void;
    layerToggle: (layer: Layer, on: Boolean) => void;
    layerZoom: (layer: Layer) => void;
    setLayerLoaded: (layer: Layer) => void;
}

export const MapContext = React.createContext<MapContextType | undefined>(undefined);
//export default MapContext;

interface MapContextProviderState {
    activeLayers: Layer[];
    loadedLayers: Layer[];
    layers: Layer[];
}

interface MapContextProviderProps {

}

const layers: Layer[] = [
    new JSONPCDLayer({
        name: 'all_systems',
        prettyName: 'All systems',
        fileURI: 'all_systems.json',
        defaultOn: true,
        color: { r: 0.2, g: 0.4, b: 0.8},
    }),
    new EDSMLayer({
        name: 'edsm',
        defaultOn: false,
        prettyName: 'EDSM',
        parameters: { showCoordinates: 1, showPermit: 1, showId: 1, showPrimaryStar: 1, showInformation: 1 },
        color: { r: 0.8, g: 0.8, b: 0.8},
    }),
];

export class MapContextProvider extends Component<MapContextProviderProps, MapContextProviderState> {

    constructor(props: MapContextProviderProps) {
        super(props);
        this.state = {
            activeLayers: [],
            loadedLayers: [],
            layers,
        } as MapContextProviderState;
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

    setLayerLoaded(layer: Layer) {
        const oldLayers = cloneDeep(this.state.loadedLayers);
        const oldLayerNames = oldLayers.map(lyr => lyr.name);
        let newLayers: Layer[];
        if (!oldLayerNames.includes(layer.name)) {
            newLayers = [...oldLayers, layer];
        } else {
            console.error('Layer is already loaded', layer);
            return;
        }
        this.setState({ loadedLayers: newLayers });
    }

    layerZoom(layer: Layer) {
        console.log("Zoom", event.target);
    }

    setLayers(layers: Layer[]) {
        this.setState({ layers: layers });
    }

    render() {
        const { children } = this.props;
        return (
            <MapContext.Provider
                value={{
                    activeLayers: this.state.activeLayers,
                    loadedLayers: this.state.loadedLayers,
                    layers: this.state.layers,
                    layerToggle: this.layerToggle.bind(this),
                    layerZoom: this.layerZoom.bind(this),
                    setLayers: this.setLayers.bind(this),
                    setLayerLoaded: this.setLayerLoaded.bind(this),
                }}>
                {children}
            </MapContext.Provider>
        )
    }
}

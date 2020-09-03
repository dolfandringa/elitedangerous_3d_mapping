import * as React from 'react';
import { EDSMLayer, JSONPCDLayer, Layer } from '../types/Layers';
import LayerItem from './LayerItem';
import { Header, List } from 'semantic-ui-react';


interface LayerListProps {
  layerZoom(layer: Layer): void;
  layerToggle(layer: Layer, on: Boolean): void;
};
interface LayerListState {
  layers: Layer[];
};

export default class LayerList extends React.Component<LayerListProps, LayerListState> {
  static layers: Layer[] = [
    new JSONPCDLayer({
      name: 'all_systems',
      pretty_name: 'All systems',
      fileURI: 'all_systems.json'
    }),
    new EDSMLayer({
      name: 'edsm',
      pretty_name: 'EDSM',
      endpoint: 'https://www.edsm.net/api-v1/cube-systems',
      parameters: { x: 0, y: 0, z: 0, size: 500, showCoordinates: 1, showPermit: 1, showId: 1 }
    }),
  ];

  constructor(props: LayerListProps) {
    super(props);
    this.state = {
      layers: LayerList.layers,
    };
  }

  render() {
    return (
      <div style={{ minWidth: '80%' }}>
        <Header as="h2">Layers</Header>
        <List>
          {this.state.layers.map(
            (layer: Layer) => (<List.Item><LayerItem layerToggle={this.props.layerToggle} layerZoom={this.props.layerZoom} layer={layer} /></List.Item>)
          )}
        </List>
      </div>
    );
  }
}
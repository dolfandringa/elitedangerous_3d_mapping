import * as React from 'react';
import { EDSMLayer, JSONPCDLayer, Layer } from '../types/Layers';
import LayerItem from './LayerItem';
import { Header, List } from 'semantic-ui-react';
import { MapContext } from '../context';


interface LayerListProps {
};

export default class LayerList extends React.Component<LayerListProps> {

  static contextType = MapContext;
  context: React.ContextType<typeof MapContext>;

  constructor(props: LayerListProps) {
    super(props);
  }

  render() {
    return (
      <div style={{ minWidth: '80%' }}>
        <Header as="h2">Layers</Header>
        <List>
          {this.context.layers.map(
            (layer: Layer) => (<List.Item><LayerItem layer={layer} /></List.Item>)
          )}
        </List>
      </div>
    );
  }
}
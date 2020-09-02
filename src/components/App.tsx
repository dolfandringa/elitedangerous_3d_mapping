import * as React from 'react';
import MapCanvas from './MapCanvas';
import LayerList from './LayerList';
import SystemInfo from './SystemInfo';
import { Grid, Header } from 'semantic-ui-react';


export default class App extends React.Component {
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
                    <MapCanvas />
                </Grid.Column>
                <Grid.Column>
                    <Grid columns={4}>
                        <Grid.Row>
                            <LayerList />
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
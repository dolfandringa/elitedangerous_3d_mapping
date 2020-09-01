import * as React from 'react';
import { Grid, Header } from 'semantic-ui-react';


export default class App extends React.Component {
    render() {
      return (
        <Grid columns={4}>
            <Grid.Row>
                <Grid.Column width={4}>
                    <Header as="h1">Banana Nebula Notable Stellar Phenomena Map</Header>
                </Grid.Column>
            </Grid.Row>
            <Grid.Row>
                <Grid.Column width={3}>
                    <Map />
                </Grid.Column>
                <Grid.Column>
                    <Grid columns={1}>
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
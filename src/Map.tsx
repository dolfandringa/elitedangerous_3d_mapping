import React, { useRef, useLayoutEffect } from 'react';

export default class Map extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        return (
            <canvas></canvas>
        );
    }
}
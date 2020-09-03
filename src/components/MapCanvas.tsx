import React, { useRef, useLayoutEffect, createRef, useState } from 'react';
import { TableHeaderCellProps } from 'semantic-ui-react';
import { difference } from 'lodash';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Layer } from '../types';
import { LayerDataService } from '../services';

interface MapProps {
    layers: Layer[];
}

interface Dimensions {
    width: number;
    height: number;
}

interface MapState {
    dimensions: Dimensions;
}

export default class MapCanvas extends React.Component<MapProps, MapState> {
    private canvasStyle = { width: "100%", height: "90vh" };
    private canvasRef: React.RefObject<any>;

    private camera: THREE.Camera;
    private controls: OrbitControls;
    private scene: THREE.Scene;
    private gridHelper: THREE.GridHelper;
    private renderer: THREE.WebGLRenderer;
    private raycaster: THREE.Raycaster;
    private mouse: THREE.Vector2;
    private activeLayers: THREE.Group;
    private nebulae: THREE.Group;

    constructor(props: MapProps) {
        super(props);
        this.state = {
            dimensions: { width: 0, height: 0 }
        }
        this.canvasRef = createRef();
    }

    static defaultProps = {
        layers: []
    }

    public componentDidUpdate(prevProps: MapProps) {
        if (prevProps.layers !== this.props.layers) {
            this.updateLayers(prevProps.layers, this.props.layers);
        }
    }

    private updateLayers(oldLayers: Layer[], newLayers: Layer[]) {
        for (let layer of difference(oldLayers, newLayers)) {
            this.deactivateLayer(layer);
        }
        for (let layer of difference(newLayers, oldLayers)) {
            this.activateLayer(layer);
        }
    }

    private activateLayer(layer: Layer) {
        console.log("Turning on layer", layer);
        console.log("Layer type", LayerDataService.getLayer(layer));

    }

    private deactivateLayer(layer: Layer) {
        console.log("Turning off layer", layer);
    }

    private loadNebulae() {
        this.nebulae = new THREE.Group();
        this.nebulae.layers.set(2);
    }

    private updateGrid() {
        this.gridHelper.position.set(this.controls.target.x, this.controls.target.y, this.controls.target.z);
    }

    private onChangeCamera() {
        this.updateGrid();
    }

    private initMap(dimensions: Dimensions) {
        this.setState({ dimensions });
        this.scene = new THREE.Scene();
        this.gridHelper = new THREE.GridHelper(1, 20);
        this.scene.add(this.gridHelper);
        this.mouse = new THREE.Vector2();
        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvasRef.current, antialias: true });
        this.raycaster = new THREE.Raycaster();
        this.activeLayers = new THREE.Group();

        this.raycaster.layers.set(0);
        this.raycaster.params.Points = { threshold: 10 };
        this.gridHelper.layers.set(1);

        this.camera = new THREE.PerspectiveCamera(90, dimensions.width / dimensions.height, 1, 100000);
        this.camera.layers.enable(0); //active layer systems
        this.camera.layers.enable(1); //grid
        this.camera.layers.enable(2); //nebulae

        this.controls = new OrbitControls(this.camera, this.canvasRef.current);
        this.controls.autoRotate = false;
        this.controls.screenSpacePanning = true;
        this.controls.enableDamping = true;
        this.controls.addEventListener('change', this.onChangeCamera);
        this.renderer.setSize(dimensions.width, dimensions.height);
    }

    public animate() {
        requestAnimationFrame(this.animate);
        this.controls.update();
        this.renderCanvas();
    }

    private renderCanvas() {
        this.camera.updateMatrixWorld();
        this.raycaster.setFromCamera(this.mouse, this.camera);
        let nebula_name;
        this.renderer.render(this.scene, this.camera);
    }

    public componentDidMount() {
        const dimensions = {
            width: this.canvasRef.current.offsetWidth,
            height: this.canvasRef.current.offsetHeight,
        };
        this.initMap(dimensions);
    }

    public render() {
        return (
            <canvas style={this.canvasStyle} ref={this.canvasRef}></canvas>
        );
    }
}
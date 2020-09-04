import React, { useRef, useLayoutEffect, createRef, useState } from 'react';
import { TableHeaderCellProps } from 'semantic-ui-react';
import { difference, xor } from 'lodash';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Layer } from '../types';
import { LayerDataService } from '../services';
import { MapContext } from '../context';
import { PerspectiveCamera } from 'three';

interface MapProps {
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

    private camera: THREE.PerspectiveCamera;
    private controls: OrbitControls;
    private scene: THREE.Scene;
    private gridHelper: THREE.GridHelper;
    private renderer: THREE.WebGLRenderer;
    private raycaster: THREE.Raycaster;
    private mouse: THREE.Vector2;
    private activeLayersGroup: THREE.Group;
    private nebulae: THREE.Group;
    private firstLayer: boolean = true;
    private activeLayers: {
        [k: string]: {
            layer: Layer,
            geom: THREE.Object3D
        }
    } = {};
    private layers: Layer[] = [];

    constructor(props: MapProps) {
        super(props);
        this.state = {
            dimensions: { width: 0, height: 0 },
        }
        this.canvasRef = createRef();
    }

    static contextType = MapContext;
    context: React.ContextType<typeof MapContext>;

    public componentDidUpdate() {
        console.log("Component updated with context:", this.context);
        const activeLayerNames = this.context.activeLayers.map((l) => l.name);
        const oldActiveLayerNames = Object.keys(this.activeLayers);
        if (xor(oldActiveLayerNames, activeLayerNames).length) {
            this.updateActiveLayers();

        }
        const layerNames = this.context.layers.map((l) => l.name);
        const oldLayerNames = this.layers.map((l) => l.name);
        if (xor(oldLayerNames, layerNames).length) {
            this.updateLayers();
        }
    }

    private updateLayers() {
        console.log('this.layers', this.layers);
        console.log('this.context.layers', this.context.layers);
        const diff = difference(this.context.layers, this.layers);
        console.log('adding layers', diff)
        for (let layer of diff) {
            this.layers.push(layer);
            LayerDataService.syncLayer(layer).then(() => {
                this.context.setLayerLoaded(layer);
                if (layer.default_on) {
                    this.context.layerToggle(layer, true);
                }
            });
        }
    }

    private async updateActiveLayers() {
        const activeLayerNames = this.context.activeLayers.map((l) => l.name);
        const oldActiveLayerName = Object.keys(this.activeLayers);
        for (const layerName of difference(oldActiveLayerName, activeLayerNames)) {
            this.deactivateLayer(this.activeLayers[layerName].layer);
        }
        const newLayerNames = difference(activeLayerNames, oldActiveLayerName);
        const newLayers = this.context.activeLayers.filter((layer) => newLayerNames.includes(layer.name))
        for (const layer of newLayers) {
            this.activateLayer(layer);
        }
    }

    private updateCamera(bb: THREE.Box3) {

        // Set the camera half the y size of the bounding box above it, but with x and z in the middle of the bb.
        let camera_pos = new THREE.Vector3((bb.max.x - bb.min.x) / 2 + bb.min.x, (bb.max.y - bb.min.y) / 2 + bb.max.y, (bb.max.z - bb.min.z) / 2 + bb.min.z);

        //Set the lookAt parameter to the middle of the bounding box.
        let camera_lookat = new THREE.Vector3((bb.max.x - bb.min.x) / 2 + bb.min.x, (bb.max.y - bb.min.y) / 2 + bb.min.y, (bb.max.z - bb.min.z) / 2 + bb.min.z);
        let controls_target = camera_lookat;

        let gridSize = (bb.max.x - bb.min.x) > 100 ? Math.floor((bb.max.x - bb.min.x) / 10) * 10 : 1

        this.gridHelper.scale.set(gridSize, gridSize, gridSize);

        this.camera.position.set(camera_pos.x, camera_pos.y, camera_pos.z);
        this.camera.lookAt(camera_lookat.x, camera_lookat.y, camera_lookat.z);
        this.controls.target.set(controls_target.x, controls_target.y, controls_target.z);
        this.camera.updateMatrixWorld();

    }

    private async activateLayer(layer: Layer) {
        console.log("Turning on layer", layer);
        const distance = this.camera.position.distanceTo(this.controls.target);
        const geom = await LayerDataService.getLayer(layer, { center: this.controls.target, radius: distance });
        if (geom) {
            this.activeLayersGroup.add(geom);
            this.activeLayers[layer.name] = { layer, geom };
            const bb = geom.geometry.boundingBox;
            if (this.firstLayer) {
                this.updateCamera(bb);
                this.firstLayer = false;
            }
        }
    }

    private async deactivateLayer(layer: Layer) {
        console.log("Turning off layer", layer);
        this.activeLayersGroup.remove(this.activeLayers[layer.name].geom);
        delete this.activeLayers[layer.name];
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
        this.activeLayersGroup = new THREE.Group();

        this.raycaster.layers.set(0);
        this.raycaster.params.Points = { threshold: 10 };
        this.gridHelper.layers.set(1);
        this.activeLayersGroup.layers.set(0);
        this.scene.add(this.activeLayersGroup);

        this.camera = new THREE.PerspectiveCamera(90, dimensions.width / dimensions.height, 1, 100000);
        this.camera.layers.enable(0); //active layer systems
        this.camera.layers.enable(1); //grid
        this.camera.layers.enable(2); //nebulae

        this.controls = new OrbitControls(this.camera, this.canvasRef.current);
        this.controls.autoRotate = false;
        this.controls.screenSpacePanning = true;
        this.controls.enableDamping = true;
        this.controls.addEventListener('change', this.onChangeCamera.bind(this));
        this.renderer.setSize(dimensions.width, dimensions.height);
    }

    public animate() {
        requestAnimationFrame(this.animate.bind(this));
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
        this.animate();
    }

    public render() {
        return (
            <canvas style={this.canvasStyle} ref={this.canvasRef}></canvas>
        );
    }
}
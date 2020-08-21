import * as THREE from 'https://unpkg.com/three/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three/examples/jsm/controls/OrbitControls.js';
import { PLYLoader } from 'https://unpkg.com/three/examples/jsm/loaders/PLYLoader.js';
import { PCDLoader } from 'https://unpkg.com/three/examples/jsm/loaders/PCDLoader.js';

var camera, scene, renderer, controls, loader;
var geometry;
let width = 0.8 * window.innerWidth;
let height = 0.8 * window.innerHeight;

init();
//animate();

function clear_scene() {
  while(scene.children.length > 0){ 
    scene.remove(scene.children[0]); 
  }
}

function onLayerChange() {
  load_layer(this.value);
}

function load_layer(name) {
  console.log('Loading layer ', name);
  //clear_scene();
  loader.load(name+'.pcd', function(points) {
    console.log("Loaded pcd file");
    
    points.material.size *= 1000;
    points.material.needsUpdate = true;
    console.log("Points:", points);
    scene.add(points);
    
    points.geometry.computeBoundingBox();
    let bb = points.geometry.boundingBox
    console.log("Bounding Box", bb);
    let camera_pos = bb.min;
    console.log("Moving camera to", camera_pos);
    camera.position.set(camera_pos.x, camera_pos.y, camera_pos.z);
    camera.lookAt(bb.max);
    camera.updateMatrixWorld();
    
    console.log("Added points");
    render();
  });
  
}

function init() {

  camera = new THREE.PerspectiveCamera( 40, width / height, 1, 10000 );
  camera.up.set(0,-1,0);
  //camera.position.set(14531,500,3524);
  //camera.lookAt(new THREE.Vector3(14636,0,3459));

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);

  loader = new PCDLoader();

  load_layer('all_systems')
  
  renderer = new THREE.WebGLRenderer( { antialias: true } );
  renderer.setSize( width, height );
  
  controls = new OrbitControls(camera, renderer.domElement);
  controls.addEventListener( 'change', render );
  window.addEventListener( 'resize', resize, false );
  $('#map').append( renderer.domElement );
  $('input[name=layer]').change(onLayerChange);

}

function resize() {
	console.log("resizing");

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	renderer.setSize( window.innerWidth, window.innerHeight );
	render();
}


function animate() {

  requestAnimationFrame( animate );

  mesh.rotation.x += 0.01;
  mesh.rotation.y += 0.02;

  renderer.render( scene, camera );

}

function render() {
	console.log("Rendering");
  console.log("Position: ",camera.getWorldPosition());
  console.log("Camera", camera);
  renderer.render( scene, camera );
}

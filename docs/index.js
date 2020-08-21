import * as THREE from 'https://unpkg.com/three/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three/examples/jsm/controls/OrbitControls.js';
import { PLYLoader } from 'https://unpkg.com/three/examples/jsm/loaders/PLYLoader.js';
import { PCDLoader } from 'https://unpkg.com/three/examples/jsm/loaders/PCDLoader.js';

var camera, scene, renderer, controls, loader;
var geometry;
let width = 0.9 * window.innerWidth;
let height = 0.9 * window.innerHeight;

init();
//animate();

function clear_scene() {
  while(scene.children.length > 0){ 
    scene.remove(scene.children[0]); 
  }
}

function load_layer(name) {
  console.log('Loading layer ', name);
  clear_scene();
  loader.load(name+'.pcd', function(geometry) {
    console.log("Loaded pcd file");
    scene.add(geometry);
    console.log("Added geometry");
    render();
  });
  
}

function init() {

  camera = new THREE.PerspectiveCamera( 90, width / height, 1, 4000 );
  camera.up.set(0,-1,0);
  camera.position.set(645, -1500, -3600);
  camera.lookAt(645, 0, -3600);

  scene = new THREE.Scene();

  loader = new PCDLoader();

  load_layer('all_systems')
  
  renderer = new THREE.WebGLRenderer( { antialias: true } );
  renderer.setSize( width, height );
  
  controls = new OrbitControls(camera, renderer.domElement);
  controls.addEventListener( 'change', render );
  window.addEventListener( 'resize', resize, false );
  $('#map').append( renderer.domElement );

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
  console.log("LookAt:",camera.lookAt);
  renderer.render( scene, camera );

}

import * as THREE from 'https://unpkg.com/three/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three/examples/jsm/controls/OrbitControls.js';
import { PLYLoader } from 'https://unpkg.com/three/examples/jsm/loaders/PLYLoader.js';
import { PCDLoader } from 'https://unpkg.com/three/examples/jsm/loaders/PCDLoader.js';

var camera, scene, renderer, controls, loader;
var geometry;
let width = 0.6 * window.innerWidth;
let height = 0.6 * window.innerHeight;

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
    console.log(geometry);
    geometry.computeBoundingSphere();
    let sphere=geometry.boundingSphere;
    camera_pos = sphere.center.copy();
    camera_pos.add(THREE.Vector(sphere.radius*1.5, sphere.radius*1.5, sphere.radius*1.5));
    console.log("Moving camera to", camera_pos);
    camera.position.set(camera_pos);
    camera.lookAt(sphere.center);
    scene.add(geometry);
    console.log("Added geometry");
    render();
  });
  
}

function init() {

  camera = new THREE.PerspectiveCamera( 90, width / height, 1, 10000 );
  camera.up.set(0,-1,0);

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

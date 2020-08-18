import * as THREE from 'https://unpkg.com/three/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three/examples/jsm/controls/OrbitControls.js';
import { PLYLoader } from 'https://unpkg.com/three/examples/jsm/loaders/PLYLoader.js';
import { PCDLoader } from 'https://unpkg.com/three/examples/jsm/loaders/PCDLoader.js';

var camera, scene, renderer, controls;
var geometry;
let width = 0.9 * window.innerWidth;
let height = 0.9 * window.innerHeight;

init();
//animate();

function init() {

  camera = new THREE.PerspectiveCamera( 70, width / height, 1, 1000 );
  camera.position.set(0, 0, -1000);
  camera.lookAt(0, 0, -8000);

  scene = new THREE.Scene();

  let loader = new PCDLoader();

  /*geometry = new THREE.BoxGeometry( 0.2, 0.2, 0.2 );
  material = new THREE.MeshNormalMaterial();

  mesh = new THREE.Mesh( geometry, material );
  scene.add( mesh );*/
  console.log("Starting loading....");
  loader.load('barnards_clusters.pcd', function(geometry) {
    console.log("Loaded ply file");
    scene.add(geometry);
    console.log("Added geometry");
  });

  renderer = new THREE.WebGLRenderer( { antialias: true } );
  renderer.setSize( width, height );
  
  controls = new OrbitControls(camera, renderer.domElement);
  controls.addEventListener( 'change', render );
  window.addEventListener( 'resize', resize, false );
  document.body.appendChild( renderer.domElement );

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
  renderer.render( scene, camera );

}

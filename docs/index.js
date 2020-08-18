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

  camera = new THREE.PerspectiveCamera( 90, width / height, 1, 3000 );
  camera.up.set(0,-1,0);
  camera.position.set(645, -1500, -3600);
  camera.lookAt(645, 0, -3600);

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
    render();
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
  console.log("Position: ",camera.getWorldPosition());
  console.log("LookAt:",camera.lookAt);
  renderer.render( scene, camera );

}

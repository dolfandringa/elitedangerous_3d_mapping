import * as THREE from 'https://unpkg.com/three/build/three.module.js';
import { PLYLoader } from 'https://unpkg.com/three/examples/jsm/loaders/PLYLoader.js';

var camera, scene, renderer;
var geometry, material, mesh;

init();
//animate();

function init() {
  let width = 0.9 * window.innerWidth;
  let height = 0.9 * window.innerHeight;

  camera = new THREE.PerspectiveCamera( 70, width / height, 0.01, 10 );
  camera.position.z = 1;

  scene = new THREE.Scene();

  let loader = new PLYLoader();

  /*geometry = new THREE.BoxGeometry( 0.2, 0.2, 0.2 );
  material = new THREE.MeshNormalMaterial();

  mesh = new THREE.Mesh( geometry, material );
  scene.add( mesh );*/
  console.log("Starting loading....");
  loader.load('barnards_clusters.ply', function(geometry) {
    console.log("Loaded ply file");
    scene.add(new THREE.Mesh(geometry));
    console.log("Added mesh");
  });

  renderer = new THREE.WebGLRenderer( { antialias: true } );
  renderer.setSize( width, height );
  document.body.appendChild( renderer.domElement );

}

function animate() {

  requestAnimationFrame( animate );

  mesh.rotation.x += 0.01;
  mesh.rotation.y += 0.02;

  renderer.render( scene, camera );

}

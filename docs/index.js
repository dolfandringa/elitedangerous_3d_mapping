import * as THREE from 'https://unpkg.com/three/build/three.module.js';
import { OrbitControls, MapControls } from 'https://unpkg.com/three/examples/jsm/controls/OrbitControls.js';
import { TrackballControls  } from 'https://unpkg.com/three/examples/jsm/controls/TrackballControls.js';
import { PLYLoader } from 'https://unpkg.com/three/examples/jsm/loaders/PLYLoader.js';
import { PCDLoader } from 'https://unpkg.com/three/examples/jsm/loaders/PCDLoader.js';

var camera, scene, renderer, controls, loader, geometry, mouse, raycaster;

var black = new THREE.Color(0x000000);
var white = new THREE.Color(0xffffff);
var width, height;
//width = 0.8*window.innerWidth;
//height = 0.8*window.innerHeight;

$( document ).ready(function() {
  init();
  animate();
});


function clear_scene() {
  while(scene.children.length > 0){ 
    scene.remove(scene.children[0]); 
  }
}

function onLayerChange() {
  load_layer(this.value);
}

function onMouseMove( event ) {

	// calculate mouse position in normalized device coordinates
	// (-1 to +1) for both components
  console.log("Moving mouse", event);

	mouse.x = ( event.clientX / width ) * 2 - 1;
	mouse.y = - ( event.clientY / height ) * 2 + 1;

}

function load_layer(name, update_camera=false) {
  console.log('Loading layer ', name);
  clear_scene();
  loader.load(name+'.pcd', function(points) {
    console.log("Loaded pcd file");
    var sprite = new THREE.TextureLoader().load( 'images/circle.png' );
    
    console.log("Material:", points.material);
    
   
    points.material.vertexColors = false;
    points.material.size = 20;
    points.material.map = sprite;
    points.material.transparent = true;
    points.material.alphaTest = 0.8;
    points.material.sizeAttenuation = false;
    points.material.needsUpdate = true;
    console.log("Points:", points);
    scene.add(points);
    
    points.geometry.computeBoundingBox();
    if(update_camera){
      let bb = points.geometry.boundingBox
      console.log("Bounding Box", bb);
      
      //let camera_pos = new THREE.Vector3((bb.max.x - bb.min.x)/2, (bb.max.y - bb.min.y)/2, bb.min.z);
      let camera_pos = new THREE.Vector3(bb.max.x, bb.max.y, bb.max.z);
      console.log("Moving camera to", camera_pos);
      let camera_lookat = new THREE.Vector3(bb.min.x, bb.min.y, bb.min.z);
      console.log("Looking at", camera_lookat);
      camera.position.set(camera_pos.x, camera_pos.y, camera_pos.z);
      camera.lookAt(camera_lookat.x, camera_lookat.y, camera_lookat.z);
      camera.updateMatrixWorld();
    }
    
    console.log("Added points");
    //controls.update();
    //render();
  });
  
}

function init() {
  width = $("#map").width();
  height = $("#map").height();
  console.log('size:', width, height);
  
  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();
  
  renderer = new THREE.WebGLRenderer( { antialias: true } );
  renderer.setSize( width, height );
  $('#map').append( renderer.domElement );
  
  scene = new THREE.Scene();
  //scene.background = new THREE.Color(0xffffff);

  camera = new THREE.PerspectiveCamera( 90, width / height, 1, 100000 );
  //camera.up.set(0,-1,0);
  
  controls = new TrackballControls(camera, renderer.domElement);
  controls.rotateSpeed = 0.1;
  controls.zoomSpeed = 0.02;
  controls.panSpeed = 0.1;
  controls.keys = [ 65, 83, 68 ];
  
  controls.addEventListener( 'change', onChangeCamera );
  window.addEventListener( 'mousemove', onMouseMove, false );
  window.addEventListener( 'resize', resize, false );
  render();
  
  $('input[name=layer]').change(onLayerChange);
  loader = new PCDLoader();

  load_layer('all_systems', true)

}

function onChangeCamera() {
  //console.log("Camera position:",camera.position);
  //render();

}

function resize() {
	console.log("resizing");
  width = $("#map").width();
  height = $("#map").height();

	camera.aspect = width / width;
	camera.updateProjectionMatrix();

	renderer.setSize( width, height );
	render();
}


function animate() {
  requestAnimationFrame( animate );
  controls.update();
  render();
}

function render() {
  raycaster.setFromCamera( mouse, camera );
  //console.log("children: ", scene.children);
  let intersects = raycaster.intersectObjects( scene.children );
  if(intersects.length > 0){
    console.log("Intersects: ", intersects);
  }
  
  for ( var i = 0; i < intersects.length; i++ ) {
    console.log("Intersecting point", intersects[i]);
		intersects[ i ].object.material.color.set( 0xff0000 );
    intersects[ i ].object.material.colorNeedsUpdate = true;
	}
  
  renderer.render( scene, camera );
}

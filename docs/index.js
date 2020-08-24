import * as THREE from 'https://unpkg.com/three/build/three.module.js';
import { OrbitControls, MapControls } from 'https://unpkg.com/three/examples/jsm/controls/OrbitControls.js';
import { TrackballControls  } from 'https://unpkg.com/three/examples/jsm/controls/TrackballControls.js';
import { PLYLoader } from 'https://unpkg.com/three/examples/jsm/loaders/PLYLoader.js';
import { PCDLoader } from 'https://unpkg.com/three/examples/jsm/loaders/PCDLoader.js';

var camera, scene, renderer, controls, loader, geometry, mouse, raycaster, geom_group, gridHelper;

var black = new THREE.Color(0x000000);
var white = new THREE.Color(0xffffff);
var gridHelper;
var iRay = 0;
var width, height;
//width = 0.8*window.innerWidth;
//height = 0.8*window.innerHeight;

$( document ).ready(function() {
  init();
  animate();
});


function clear_scene() {
  scene.remove(geom_group);
}

function onLayerChange() {
  load_layer(this.value);
}

function onMouseMove( event ) {

	// calculate mouse position in normalized device coordinates
	// (-1 to +1) for both components
  //console.log("Moving mouse", event);

	/*
  mouse.x = ( event.clientX / width ) * 2 - 1;
	mouse.y = - ( event.clientY / height ) * 2 + 1;
  */
  //mouse.x = ( event.clientX / width ) * 2 - 1;
	//mouse.y = - ( event.clientY / height ) * 2 + 1;
  let canvasBounds = renderer.getContext().canvas.getBoundingClientRect();
  mouse = new THREE.Vector2();
  mouse.x = ( ( event.clientX - canvasBounds.left ) / ( canvasBounds.right - canvasBounds.left ) ) * 2 - 1;
  mouse.y = - ( ( event.clientY - canvasBounds.top ) / ( canvasBounds.bottom - canvasBounds.top) ) * 2 + 1;
  //let vec = new THREE.Vector3(mouse.x, mouse.y, 0.5);
  //console.log(vec.unproject(camera));
  //console.log(vec.sub( camera.position ).normalize());

}

function load_layer(name, update_camera=false) {
  console.log('Loading layer ', name);
  clear_scene();
  geom_group = new THREE.Group();
  loader.load(name+'.pcd', function(points) {
    points.layers.enable(0);
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
    geom_group.add(points);
    scene.add(geom_group);
    
    points.geometry.computeBoundingBox();
    if(update_camera){
      let bb = points.geometry.boundingBox
      console.log("Bounding Box", bb);
      
      // Set the camera half the y size of the bounding box above it, but with x and z in the middle of the bb.
      let camera_pos = new THREE.Vector3((bb.max.x - bb.min.x)/2+bb.min.x, (bb.max.y - bb.min.y)/2+bb.max.y, (bb.max.z - bb.min.z)/2+bb.min.z);
      console.log("Moving camera to", camera_pos);
      
      //Set the lookAt parameter to the middle of the bounding box.
      let camera_lookat = new THREE.Vector3((bb.max.x - bb.min.x)/2+bb.min.x,(bb.max.y - bb.min.y)/2+bb.min.y, (bb.max.z - bb.min.z)/2+bb.min.z);
      let controls_target = camera_lookat;
      
      let gridSize = (bb.max.x - bb.min.x) > 100? Math.floor((bb.max.x - bb.min.x)/10)*10 : 1
      console.log("gridHelper:", gridHelper);
      console.log("gridSize:", gridSize);
      gridHelper.scale.set(gridSize, gridSize, gridSize);
      
      console.log("Looking at", camera_lookat);
      camera.position.set(camera_pos.x, camera_pos.y, camera_pos.z);
      camera.lookAt(camera_lookat.x, camera_lookat.y, camera_lookat.z);
      controls.target.set(controls_target.x, controls_target.y, controls_target.z);
      camera.updateMatrixWorld();
      
      
      
      
      console.log("GridHelper:", gridHelper);
      
      /*
      //Add the camera_lookat and camera_pos as points in there for debugging.
      let ref_geom = new THREE.BufferGeometry();
      let ref_colors = [1.0, 0.0, 0.0, 0.0, 1.0, 0.0];
      let ref_points_array = [camera_pos.x, camera_pos.y, camera_pos.z, camera_lookat.x, camera_lookat.y, camera_lookat.z];
      ref_geom.setAttribute('position', new THREE.Float32BufferAttribute(ref_points_array, 3));
      ref_geom.setAttribute('color', new THREE.Float32BufferAttribute(ref_colors, 3));
      ref_geom.computeBoundingSphere();
      let points_material = new THREE.PointsMaterial({ size: 100, vertexColors: true});
      let ref_points = new THREE.Points(ref_geom, points_material);
      console.log("Reference points:", ref_points);
      scene.add(ref_points);
      */

    }
    
    console.log("Added points");
    //controls.update();
    //render();
  });
  
}

function updateGrid(){
  gridHelper.position.set(controls.target.x, controls.target.y, controls.target.z);
}

function init() {
  width = $("#map").width();
  height = $("#map").height();
  //width = window.innerWidth;
  //height = window.innerHeight;
  console.log('size:', width, height);
  
  raycaster = new THREE.Raycaster();
  raycaster.layers.set(0);
  mouse = new THREE.Vector2();
  
  renderer = new THREE.WebGLRenderer( { antialias: true } );
  renderer.setSize( width, height );
  $('#map').append( renderer.domElement );
  
  scene = new THREE.Scene();

  gridHelper = new THREE.GridHelper( 1, 20);
  gridHelper.layers.set(1);
  scene.add( gridHelper );
  //scene.background = new THREE.Color(0xffffff);

  camera = new THREE.PerspectiveCamera( 90, width / height, 1, 100000 );
  //camera.up.set(0,-1,0);
  camera.layers.enable(0);
  camera.layers.enable(1);
  
  controls = new OrbitControls(camera, renderer.domElement);
  controls.autoRotate = false;
  controls.screenSpacePanning = true;
  controls.enableDamping = true;
  
  controls.addEventListener('change', onChangeCamera );
  window.addEventListener( 'mousemove', onMouseMove, false );
  window.addEventListener( 'resize', resize, false );
  render();
  
  $('input[name=layer]').change(onLayerChange);
  loader = new PCDLoader();

  load_layer('all_systems', true)

}

function onChangeCamera() {
  updateGrid();
  //render();

}

function resize() {
	console.log("resizing");
  width = $("#map").width();
  height = $("#map").height();
  //width = window.innerWidth;
  //height = window.innerHeight;

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
  camera.updateMatrixWorld();
  raycaster.setFromCamera( mouse, camera );
  iRay++;
  if(iRay>100) {
    console.log("Ray:",raycaster.ray);
    console.log("Mouse:",mouse);
    iRay=0;
  }
  
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

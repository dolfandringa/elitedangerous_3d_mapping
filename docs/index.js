import * as THREE from 'https://unpkg.com/three/build/three.module.js';
import { OrbitControls, MapControls } from 'https://unpkg.com/three/examples/jsm/controls/OrbitControls.js';
import { TrackballControls  } from 'https://unpkg.com/three/examples/jsm/controls/TrackballControls.js';
import { PLYLoader } from 'https://unpkg.com/three/examples/jsm/loaders/PLYLoader.js';
import { PCDLoader } from 'https://unpkg.com/three/examples/jsm/loaders/PCDLoader.js';
import { openDB, deleteDB, wrap, unwrap } from 'https://unpkg.com/idb?module';

var camera, scene, renderer, controls, loader, geometry, mouse, raycaster, geom_group, nebulae_group, gridHelper, INTERSECTED, system_geom, current_layer_name;

var black = new THREE.Color(0x000000);
var white = new THREE.Color(0xffffff);
var mouse = new THREE.Vector2();
var gridHelper;
var iRay = 0;
var db_version = 3;
var width, height;
//width = 0.8*window.innerWidth;
//height = 0.8*window.innerHeight;

$( document ).ready(function() {
  init();
  animate();
});

const layers = ['all_systems', 'ice_crystal','lagrange_cloud','metallic_crystal','mollusc','silicate_crystal','solid_mineral'];

function clear_scene() {
  scene.remove(geom_group);
}

function onLayerChange() {
  load_layer(this.value);
}

function onMouseMove( event ) {

	// calculate mouse position in normalized device coordinates

  let canvasBounds = renderer.getContext().canvas.getBoundingClientRect();
  mouse.x = ( ( event.clientX - canvasBounds.left ) / ( canvasBounds.right - canvasBounds.left ) ) * 2 - 1;
  mouse.y = - ( ( event.clientY - canvasBounds.top ) / ( canvasBounds.bottom - canvasBounds.top) ) * 2 + 1;

}
export function roundCoord(n) {
  //round to 2 decimals, but also round to nearest EVEN if right in the middle. This is what python and other languages use too
  //so 14747.12500 rounds to 14747.12, 14747.12510 rounds to 14747.13 while 14747.13500 rounds to 14747.14
  let decimals = 2
  return (Math.round(n * Math.pow(10, decimals))) / Math.pow(10, decimals)
}

export async function getSystemByCoordinates(x, y, z) {
  let db = await openDB(`babana_nebula_${current_layer_name}`, db_version);
  return db.getFromIndex('systems', 'coords', [x, y, z]);
}

export function updateCamera(bb){
      
  // Set the camera half the y size of the bounding box above it, but with x and z in the middle of the bb.
  let camera_pos = new THREE.Vector3((bb.max.x - bb.min.x)/2+bb.min.x, (bb.max.y - bb.min.y)/2+bb.max.y, (bb.max.z - bb.min.z)/2+bb.min.z);
  
  //Set the lookAt parameter to the middle of the bounding box.
  let camera_lookat = new THREE.Vector3((bb.max.x - bb.min.x)/2+bb.min.x,(bb.max.y - bb.min.y)/2+bb.min.y, (bb.max.z - bb.min.z)/2+bb.min.z);
  let controls_target = camera_lookat;
  
  let gridSize = (bb.max.x - bb.min.x) > 100? Math.floor((bb.max.x - bb.min.x)/10)*10 : 1
  
  gridHelper.scale.set(gridSize, gridSize, gridSize);
  
  camera.position.set(camera_pos.x, camera_pos.y, camera_pos.z);
  camera.lookAt(camera_lookat.x, camera_lookat.y, camera_lookat.z);
  controls.target.set(controls_target.x, controls_target.y, controls_target.z);
  camera.updateMatrixWorld();
  
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

export async function loadNebulae(bb) {
  console.log("Loading nebulae for bb", bb);
  scene.remove(nebulae_group);
  let db = await openDB(`babana_nebula_nebulae`, db_version);
  let loader = new THREE.FontLoader();
  let nebulae = await db.getAll('systems');
  nebulae_group = new THREE.Group();
  nebulae_group.layers.set(2);
  let texture = new THREE.TextureLoader().load( "images/cloud.png" );
  let material = new THREE.MeshBasicMaterial( { map: texture, color: 0xffaa00, opacity: 1.0, transparent: true } );
  let textMaterials = [
					new THREE.MeshBasicMaterial( { color: 0x999999 } ), // front
					new THREE.MeshBasicMaterial( { color: 0x444444 } ) // side
				];
  for(let nebula of nebulae) {
    if((nebula.x+nebula.diameter<bb.min.x || nebula.x-nebula.diameter>bb.max.x) && (nebula.y+nebula.diameter<bb.min.y || nebula.y-nebula.diameter>bb.max.y) && (nebula.z+nebula.diameter<bb.min.z || nebula.z-nebula.diameter>bb.max.z)) {
      //Both x, y, and z are outside the bounding box.
      continue;
    }
    loader.load( 'fonts/helvetiker_regular.typeface.json', function ( font ) {
      console.log("Setting font for nebula", nebula);
      let fontGeometry = new THREE.TextGeometry(nebula.name, {
        font: font,
        size: nebula.diameter*0.1,
        height: 1,
      } );
      let textGeo = new THREE.BufferGeometry().fromGeometry( fontGeometry );
      textGeo.computeBoundingBox();
      textGeo.computeVertexNormals();
      let centerOffsetX = - 0.5 * ( textGeo.boundingBox.max.x - textGeo.boundingBox.min.x );
      let centerOffsetY = ( textGeo.boundingBox.max.y - textGeo.boundingBox.min.y );
      let textMesh = new THREE.Mesh( textGeo, textMaterials );
      textMesh.position.set(nebula.x + centerOffsetX, nebula.y+nebula.diameter/2+centerOffsetY, nebula.z);
      nebulae_group.add(textMesh);

    });
    var geometry = new THREE.SphereBufferGeometry( nebula.diameter/2, 32, 32 );
    geometry.name=nebula.name;
    geometry.computeVertexNormals();
    
    let mesh = new THREE.Mesh( geometry, material );
    mesh.name = nebula.name;
    mesh.position.set(nebula.x, nebula.y, nebula.z);
    nebulae_group.add(mesh);
  }
  scene.add(nebulae_group);
}

export function load_layer(name, update_camera=false) {
  console.log('Loading layer ', name);
  current_layer_name = name;
  syncdb(name);
  clear_scene();
  clearInfo();
  geom_group = new THREE.Group();
  loader.load(name+'.pcd', function(points) {
    points.layers.set(0);
    console.log("Loaded pcd file");
    var sprite = new THREE.TextureLoader().load( 'images/circle.png' );
    
    let num_points = points.geometry.attributes.position.count;
    let colors = [];
    let sizes = []
    for(let i=0;i<num_points;i++){
      sizes.push(10);
      colors.push(0.8, 0.8, 0.8);
    }
    points.geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
    points.geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    points.material.vertexColors = true;
    points.material.size = 10;
    points.material.map = sprite;
    points.material.transparent = true;
    points.material.alphaTest = 0.8;
    points.material.sizeAttenuation = false;
    points.material.needsUpdate = true;
    system_geom = points;
    geom_group.add(points);
    scene.add(geom_group);
   
    points.geometry.computeBoundingBox();
    let bb = points.geometry.boundingBox;
    loadNebulae(bb)
    if(update_camera){
      updateCamera(bb)
    }
    
    console.log("Added points");
    //controls.update();
    //render();
  });
  
}

export async function syncdb(table) {
  let db = await openDB(`babana_nebula_${table}`, db_version, {
    upgrade(db) {
      console.log(`upgrading ${table}`);
      try {
        db.deleteObjectStore('systems', {keyPath: 'id'});
      } catch {};
      try {
        db.deleteObjectStore('config');
      }  catch {};
      const store = db.createObjectStore('systems');
      store.createIndex('coords', ['x','y','z'], {multiEntry: false}); 
      const config_store = db.createObjectStore('config');
    },
  });
  
  console.log('Checking json last modified date');
  const res = await fetch(table+".json", {cache: "no-cache", method: 'HEAD'});
  let last_modified = new Date(res.headers.get("Last-Modified"));
  
  const import_date = await db.get('config', 'importDate');
  console.log("Last modified:", last_modified, "import_date:", import_date);
  if(!import_date || new Date(import_date) < last_modified) {
    console.log('Fetching json data');
    const res = await fetch(table+".json", {cache: "no-cache", method: 'GET'});
    console.log('importing data');
    await db.clear('systems');
    let json = await res.json();
    const tx = db.transaction('systems', 'readwrite');
    for(let i=0;i<json.length;i++) {
      const system = json[i];
      tx.store.add(system, i);
    }
    await tx.done;
    console.log("Finished adding system data");
    await db.put('config',  new Date(), 'importDate');
  }
  
}

export function updateGrid(){
  gridHelper.position.set(controls.target.x, controls.target.y, controls.target.z);
}

export function init() {
  //syncdb('all_systems');
  width = $("#map").width()*0.99;
  height = $("#map").height()*0.99;
  syncdb('nebulae');
  
  raycaster = new THREE.Raycaster();
  raycaster.layers.set(0);
  raycaster.params.Points = {threshold: 10};
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
  camera.layers.enable(0); //active layer systems
  camera.layers.enable(1); //grid
  camera.layers.enable(2); //nebulae
  
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

export function onChangeCamera() {
  updateGrid();
  //render();

}

export function resize() {
	console.log("resizing");
  width = $("#map").width();
  height = $("#map").height();

	camera.aspect = width / width;
	camera.updateProjectionMatrix();

	renderer.setSize( width, height );
	render();
}

export async function clearInfo() {
  $("#system_info").html("");
}

export async function setInfo(s, nebula_name) {
  s.x = roundCoord(s.x);
  s.y = roundCoord(s.y);
  s.z = roundCoord(s.z);
  const system = await getSystemByCoordinates(s.x, s.y, s.z);
  if(system === undefined) {
    console.error("Could not find a system for", s)
    clearInfo();
    return;
  }
  let template = '';
  
  template += `<h3 class="ui header">${system.system_name}</h3>`;
  if(nebula_name !== undefined) {
    //template += `<p><strong>Nebula: </strong>${nebula_name}</p>`
  }
  
  for(const k of Object.keys(system)){
    if(['system_name','x','y','z'].indexOf(k)>=0){
      continue
    }
    if(!system[k]) {
      continue;
    }
    template+=`<p>${k.replace("_"," ")}: ${system[k] || ''}</p>`;
  }
  template +=`<p>Coordinates: (${s.x}; ${s.y}; ${s.z})</p>`;
  
  $("#system_info").html(template);
}


export function animate() {
  requestAnimationFrame( animate );
  controls.update();
  render();
}

export function render() {
  camera.updateMatrixWorld();
  raycaster.setFromCamera( mouse, camera );
  let nebula_name;
  if(system_geom != null) {
    let intersects = raycaster.intersectObject( system_geom );
    if(nebulae_group) {
      let intersects_nebula = raycaster.intersectObject( nebulae_group, true );
      if(intersects_nebula.length>0) {
        nebula_name = intersects_nebula[0].object.name;
      }
    }
    if(intersects.length > 0){
      if(INTERSECTED != intersects[0].index) {
        let attributes = system_geom.geometry.attributes;
        attributes.size.array[ INTERSECTED ] = 10;
        attributes.color.array[INTERSECTED*3] = 0.8;
        attributes.color.array[INTERSECTED*3+1] = 0.8;
        attributes.color.array[INTERSECTED*3+2] = 0.8;
        INTERSECTED = intersects[0].index;
        attributes.size.array[INTERSECTED] = 20;
        attributes.color.array[INTERSECTED*3] = 1.0; 
        attributes.color.array[INTERSECTED*3+1] = 0.0;
        attributes.color.array[INTERSECTED*3+2] = 1.0;
        attributes.color.needsUpdate = true;
        attributes.size.needsUpdate = true;
        let x = attributes.position.array[INTERSECTED*3];
        let y = attributes.position.array[INTERSECTED*3+1];
        let z = attributes.position.array[INTERSECTED*3+2];
        setInfo({x,y,z}, nebula_name);
      }
    }
    

  }
  
  renderer.render( scene, camera );
}

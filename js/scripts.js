import * as THREE from '/node_modules/three/build/three.module.js';

import { GUI } from             '/node_modules/three/examples/jsm/libs/dat.gui.module.js';
import { OrbitControls } from   '/node_modules/three/examples/jsm/controls/OrbitControls.js';
import { Sky } from             '/node_modules/three/examples/jsm/objects/Sky.js';
// import { Stats } from           '/node_modules/three/examples/jsm/libs/stats.module.js';

import { WEBVR } from '/node_modules/three/examples/jsm/vr/WebVR.js';

var camera, controls, scene, renderer;
var controller1, controller2;

var sky, sunSphere;

var star_database = [];
var star_config = {
    count: 0,
    log: false
};
var gui
// var stats;

const DISTANCE = 100; // distance from camera

init();
render();

function initSky() {

    // Add Sky
    sky = new Sky();
    sky.scale.setScalar( 450000 );
    scene.add( sky );

    // Add Sun Helper
    sunSphere = new THREE.Mesh(
        new THREE.SphereBufferGeometry( 20000, 16, 8 ),
        new THREE.MeshBasicMaterial( { color: 0xffffff } )
    );
    sunSphere.position.y = - 700000;
    sunSphere.visible = false;
    scene.add( sunSphere );

    // Add Equatorial Grid Helper
    let eq_sphere = createSphere(
        DISTANCE, 
        new THREE.MeshBasicMaterial({color: 0x0000ff, wireframe: true})
    );
    scene.add( eq_sphere );

    /// GUI

    var effectController = {
        turbidity: 10,
        rayleigh: 2,
        mieCoefficient: 0.005,
        mieDirectionalG: 0.8,
        luminance: 1,
        inclination: 0.49, // elevation / inclination
        azimuth: 0.5, // Facing front,
        sun: ! true
    };

    let distance = 400000;

    function guiChanged() {

        var uniforms = sky.material.uniforms;
        uniforms[ "turbidity" ].value = effectController.turbidity;
        uniforms[ "rayleigh" ].value = effectController.rayleigh;
        uniforms[ "luminance" ].value = effectController.luminance;
        uniforms[ "mieCoefficient" ].value = effectController.mieCoefficient;
        uniforms[ "mieDirectionalG" ].value = effectController.mieDirectionalG;

        var theta = Math.PI * ( effectController.inclination - 0.5 );
        var phi = 2 * Math.PI * ( effectController.azimuth - 0.5 );

        sunSphere.position.x = distance * Math.cos( phi );
        sunSphere.position.y = distance * Math.sin( phi ) * Math.sin( theta );
        sunSphere.position.z = distance * Math.sin( phi ) * Math.cos( theta );

        sunSphere.visible = effectController.sun;

        uniforms[ "sunPosition" ].value.copy( sunSphere.position );

        renderer.render( scene, camera );

    }

    gui = new GUI();

    gui.add( effectController, "turbidity", 1.0, 20.0, 0.1 ).onChange( guiChanged );
    gui.add( effectController, "rayleigh", 0.0, 4, 0.001 ).onChange( guiChanged );
    gui.add( effectController, "mieCoefficient", 0.0, 0.1, 0.001 ).onChange( guiChanged );
    gui.add( effectController, "mieDirectionalG", 0.0, 1, 0.001 ).onChange( guiChanged );
    gui.add( effectController, "luminance", 0.0, 2 ).onChange( guiChanged );
    gui.add( effectController, "inclination", 0, 1, 0.0001 ).onChange( guiChanged );
    gui.add( effectController, "azimuth", 0, 1, 0.0001 ).onChange( guiChanged );
    gui.add( effectController, "sun" ).onChange( guiChanged );

    guiChanged();

    // stats = new Stats();
    // stats.showPanel(0);
    // document.body.appendChild( stats.dom );
    
}

function init() {

    camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 1, 2000000 );
    camera.position.set( 0, 10, 20 );

    //camera.setLens(20);

    scene = new THREE.Scene();

    // var helper = new THREE.GridHelper( 10, 10, 0xffffff, 0xffffff );
    // scene.add( helper );

    renderer = new THREE.WebGLRenderer();
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.vr.enabled = true;
    document.body.appendChild( renderer.domElement );
    document.body.appendChild( WEBVR.createButton( renderer ) );

    // controllers
    function onSelectStart() {
        this.userData.isSelecting = true;
    }
    function onSelectEnd() {
        this.userData.isSelecting = false;
    }
    controller1 = renderer.vr.getController( 0 );
    controller1.addEventListener( 'selectstart', onSelectStart );
    controller1.addEventListener( 'selectend', onSelectEnd );
    scene.add( controller1 );
    controller2 = renderer.vr.getController( 1 );
    controller2.addEventListener( 'selectstart', onSelectStart );
    controller2.addEventListener( 'selectend', onSelectEnd );
    scene.add( controller2 );

    controls = new OrbitControls( camera, renderer.domElement );
    controls.addEventListener( 'change', render );
    //controls.maxPolarAngle = Math.PI / 2;
    controls.enableZoom = false;
    controls.enablePan = false;

    initSky();
    animate();

    window.addEventListener( 'resize', onWindowResize, false );

    // getJSON('bsc5-all.json').then((res) => {
    getJSON('hygdata_short.json').then((res) => {
        star_database = res;
        star_database.sort((a,b) => {
            return a.mag - b.mag
        })
        // range from -26.7 to 21
        star_config.count = 1000;
        gui.add( star_config, "count", 0, star_database.length, 1).onChange( loadStars );
        gui.add( star_config, "log").onChange( loadStars );
        loadStars();
    }).catch();

}

function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );

    render();

}

function animate() {
    renderer.setAnimationLoop( render );
    // stats.update();
}

function render() {

    renderer.render( scene, camera );

}

function getJSON(obj) {
    return new Promise((resolve, reject) => {
        let xhr = new XMLHttpRequest();
        xhr.open("GET", obj);
        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                resolve(JSON.parse(xhr.response));
            } else {
                reject(xhr.statusText);
            }
        };
        xhr.onerror = () => reject(xhr.statusText);
        xhr.send(obj.body);
    });
};

function loadStars() {
    scene.traverse((child) => { // async bug since it doesn't search by uuid
        if (child.name == 'stars') {
            scene.remove(child);
        }
    });

    let stars = new THREE.Group()
    stars.name = 'stars';

    for (let i = 0; i < star_config.count; i++) {
        if (star_config.log) console.log(star_database[i]);

        // let ra_calc = ((parseInt(star_database[i].RAh) / 24) + (parseInt(star_database[i].RAm) / 1440) + (parseInt(star_database[i].RAs) / 86400)) * Math.PI;
        // let dec_calc = ((parseInt(star_database[i].DEd) * Math.PI / 180) + (parseInt(star_database[i].DEm) / 3600) + (parseInt(star_database[i].DEs) / 216000)) * Math.PI ;
        // if (star_database[i]['DE-'] == '-') {
        //     dec_calc = -1 * dec_calc;
        // }

        // console.log(ra_calc + ':' + dec_calc);
        let star = new THREE.Geometry();

        star.vertices.push(
            // new THREE.Vector3(
            //     DISTANCE * Math.cos(ra_calc) * Math.cos(dec_calc), 
            //     DISTANCE * Math.sin(ra_calc) * Math.cos(dec_calc), 
            //     DISTANCE * Math.sin(dec_calc)
            // )
            new THREE.Vector3(
                DISTANCE * Math.cos(star_database[i].rarad) * Math.cos(star_database[i].decrad), 
                DISTANCE * Math.sin(star_database[i].rarad) * Math.cos(star_database[i].decrad), 
                DISTANCE * Math.sin(star_database[i].decrad)
            )
            // new THREE.Vector3(
            //     star_database[i].x,
            //     star_database[i].y,
            //     star_database[i].z
            // )
        );

        let star_color = bv_to_rgb(star_database[i].ci)
        let stars_mat = new THREE.PointsMaterial({
            size: Math.pow(21 - parseFloat(star_database[i].mag), 2)/500,
            color: 'rgb(' + star_color[0] + ',' + star_color[1] + ',' + star_color[2] + ')',
            // depthTest: false
        });
    
        stars.add(new THREE.Points(star, stars_mat));

        // console.log(stars.vertices[stars.vertices.length - 1]);
    }
    scene.add(stars);
    // console.log(scene.children);

}

// https://github.com/Stellarium/stellarium-web-engine/blob/master/src/algos/bv_to_rgb.c
function bv_to_rgb(bv)
{
    // Precomputed color table.
    // Taken from Stellarium.
    const COLORS = [
        [0.602745,0.713725,1.000000],
        [0.604902,0.715294,1.000000],
        [0.607059,0.716863,1.000000],
        [0.609215,0.718431,1.000000],
        [0.611372,0.720000,1.000000],
        [0.613529,0.721569,1.000000],
        [0.635490,0.737255,1.000000],
        [0.651059,0.749673,1.000000],
        [0.666627,0.762092,1.000000],
        [0.682196,0.774510,1.000000],
        [0.697764,0.786929,1.000000],
        [0.713333,0.799347,1.000000],
        [0.730306,0.811242,1.000000],
        [0.747278,0.823138,1.000000],
        [0.764251,0.835033,1.000000],
        [0.781223,0.846929,1.000000],
        [0.798196,0.858824,1.000000],
        [0.812282,0.868236,1.000000],
        [0.826368,0.877647,1.000000],
        [0.840455,0.887059,1.000000],
        [0.854541,0.896470,1.000000],
        [0.868627,0.905882,1.000000],
        [0.884627,0.916862,1.000000],
        [0.900627,0.927843,1.000000],
        [0.916627,0.938823,1.000000],
        [0.932627,0.949804,1.000000],
        [0.948627,0.960784,1.000000],
        [0.964444,0.972549,1.000000],
        [0.980261,0.984313,1.000000],
        [0.996078,0.996078,1.000000],
        [1.000000,1.000000,1.000000],
        [1.000000,0.999643,0.999287],
        [1.000000,0.999287,0.998574],
        [1.000000,0.998930,0.997861],
        [1.000000,0.998574,0.997148],
        [1.000000,0.998217,0.996435],
        [1.000000,0.997861,0.995722],
        [1.000000,0.997504,0.995009],
        [1.000000,0.997148,0.994296],
        [1.000000,0.996791,0.993583],
        [1.000000,0.996435,0.992870],
        [1.000000,0.996078,0.992157],
        [1.000000,0.991140,0.981554],
        [1.000000,0.986201,0.970951],
        [1.000000,0.981263,0.960349],
        [1.000000,0.976325,0.949746],
        [1.000000,0.971387,0.939143],
        [1.000000,0.966448,0.928540],
        [1.000000,0.961510,0.917938],
        [1.000000,0.956572,0.907335],
        [1.000000,0.951634,0.896732],
        [1.000000,0.946695,0.886129],
        [1.000000,0.941757,0.875526],
        [1.000000,0.936819,0.864924],
        [1.000000,0.931881,0.854321],
        [1.000000,0.926942,0.843718],
        [1.000000,0.922004,0.833115],
        [1.000000,0.917066,0.822513],
        [1.000000,0.912128,0.811910],
        [1.000000,0.907189,0.801307],
        [1.000000,0.902251,0.790704],
        [1.000000,0.897313,0.780101],
        [1.000000,0.892375,0.769499],
        [1.000000,0.887436,0.758896],
        [1.000000,0.882498,0.748293],
        [1.000000,0.877560,0.737690],
        [1.000000,0.872622,0.727088],
        [1.000000,0.867683,0.716485],
        [1.000000,0.862745,0.705882],
        [1.000000,0.858617,0.695975],
        [1.000000,0.854490,0.686068],
        [1.000000,0.850362,0.676161],
        [1.000000,0.846234,0.666254],
        [1.000000,0.842107,0.656346],
        [1.000000,0.837979,0.646439],
        [1.000000,0.833851,0.636532],
        [1.000000,0.829724,0.626625],
        [1.000000,0.825596,0.616718],
        [1.000000,0.821468,0.606811],
        [1.000000,0.817340,0.596904],
        [1.000000,0.813213,0.586997],
        [1.000000,0.809085,0.577090],
        [1.000000,0.804957,0.567183],
        [1.000000,0.800830,0.557275],
        [1.000000,0.796702,0.547368],
        [1.000000,0.792574,0.537461],
        [1.000000,0.788447,0.527554],
        [1.000000,0.784319,0.517647],
        [1.000000,0.784025,0.520882],
        [1.000000,0.783731,0.524118],
        [1.000000,0.783436,0.527353],
        [1.000000,0.783142,0.530588],
        [1.000000,0.782848,0.533824],
        [1.000000,0.782554,0.537059],
        [1.000000,0.782259,0.540294],
        [1.000000,0.781965,0.543529],
        [1.000000,0.781671,0.546765],
        [1.000000,0.781377,0.550000],
        [1.000000,0.781082,0.553235],
        [1.000000,0.780788,0.556471],
        [1.000000,0.780494,0.559706],
        [1.000000,0.780200,0.562941],
        [1.000000,0.779905,0.566177],
        [1.000000,0.779611,0.569412],
        [1.000000,0.779317,0.572647],
        [1.000000,0.779023,0.575882],
        [1.000000,0.778728,0.579118],
        [1.000000,0.778434,0.582353],
        [1.000000,0.778140,0.585588],
        [1.000000,0.777846,0.588824],
        [1.000000,0.777551,0.592059],
        [1.000000,0.777257,0.595294],
        [1.000000,0.776963,0.598530],
        [1.000000,0.776669,0.601765],
        [1.000000,0.776374,0.605000],
        [1.000000,0.776080,0.608235],
        [1.000000,0.775786,0.611471],
        [1.000000,0.775492,0.614706],
        [1.000000,0.775197,0.617941],
        [1.000000,0.774903,0.621177],
        [1.000000,0.774609,0.624412],
        [1.000000,0.774315,0.627647],
        [1.000000,0.774020,0.630883],
        [1.000000,0.773726,0.634118],
        [1.000000,0.773432,0.637353],
        [1.000000,0.773138,0.640588],
        [1.000000,0.772843,0.643824],
        [1.000000,0.772549,0.647059],
    ];

    // Make bv in 0 - 127 range.
    bv *= 1000.0;
    if (bv < -500) {
        bv = -500;
    } else if (bv > 3499) {
        bv = 3499;
    }
    let _i = Math.floor(0.5 + 127.0 * ((500.0 + bv) / 4000.0));

    return [Math.floor(COLORS[_i][0] * 255), Math.floor(COLORS[_i][1] * 255), Math.floor(COLORS[_i][2] * 255)];
}

function createSphere(radius_in, material) {
    let segmentCount = 24;
    let geometry = new THREE.SphereGeometry(radius_in, 36, 24);
    material = material ? material : new THREE.LineBasicMaterial({ color: 0xFFFFFF });

    // for (var i = 0; i <= segmentCount; i++) {
    //     var theta = (i / segmentCount) * Math.PI * 2;
    //     geometry.vertices.push(
    //         new THREE.Vector3(
    //             Math.cos(theta) * radius_in,
    //             Math.sin(theta) * radius_in,
    //             0));            
    // }

    return new THREE.Mesh(geometry, material);
}
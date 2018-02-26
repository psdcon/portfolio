/// Consts
var DEGREESPERFRAME = 1;
var SPEED = THREE.Math.degToRad(DEGREESPERFRAME);

/// Variables
var renderer, camera, controls, scene, stats;
var meshHuman, skeleton, mixer;

var actions;
var currentActionIndex = 0;
var settings;

var poseIndexByName, loopPoseOrder;
var currentAllPosesIndex = 0;

var clock = new THREE.Clock();

// Lights
var lightAmb;
var lightSpot;
var lightHelperSpot;

var poseNameEl;

// var threejsContainerEl = document.getElementsByClassName('threejs-trampoline-poses-pose-figure')[0];
// var width = threejsContainerEl.offsetWidth


function init() {
    poseNameEl = document.getElementsByClassName('pose-name')[0];

    // Renderer
    renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.setClearColor(0xDDDDDD);
    renderer.setSize(window.innerWidth, window.innerHeight);
    // renderer.setSize(threejsContainerEl.offsetWidth, threejsContainerEl.offsetWidth*0.5625);
    // threejsContainerEl.appendChild(renderer.domElement);
    document.body.appendChild(renderer.domElement);


    // Camera
    camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(2.554964108027963, 1.4859133142971015, 2.382040338272563);

    // Add controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);

    // Stats
    // stats = new Stats();
    // stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
    // document.body.appendChild(stats.dom);

    // Resize listener
    window.addEventListener('resize', onWindowResize, false);

    // Scene
    scene = new THREE.Scene();

    // Lights
    lightAmb = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(lightAmb);

    lightSpot = new THREE.SpotLight(0xffffff, 0.7);
    lightSpot.position.set(-1.5, 1.7, 1.9, 2);
    lightSpot.rotation.set(THREE.Math.degToRad(-45), 0, 0);

    // lightHelperSpot = new THREE.SpotLightHelper(lightSpot);
    // scene.add(lightHelperSpot);

    // Ground Plane
    // var materialFloor = new THREE.MeshBasicMaterial({color: 0xaaaaaa, wireframe: false});
    // var geometryFloor = new THREE.PlaneGeometry(10000, 10000, 100, 100);
    // var meshFloor = new THREE.Mesh(geometryFloor, materialFloor);
    // meshFloor.rotation.x = -90 * Math.PI / 180;
    // meshFloor.position.y = -100;
    // scene.add(meshFloor);
    // var grid = new THREE.GridHelper(1, 0.1);
    // scene.add(grid);

    // Load human model
    var url = './models/human.json';
    var loader = new THREE.ObjectLoader();
    loader.load(url, addMesh);
}


function addMesh(loadedObject) {
    loadedObject.traverse(function (child) {
        if (child instanceof THREE.SkinnedMesh) {
            meshHuman = child;
        }
    });
    meshHuman.position.set(0, -1, 0);
    scene.add(meshHuman);

    skeleton = new THREE.SkeletonHelper(meshHuman);
    skeleton.visible = false;
    scene.add(skeleton);

    // Point spotlight at mesh
    lightSpot.target = meshHuman;
    scene.add(lightSpot);

    // Animations stuff
    mixer = new THREE.AnimationMixer(meshHuman);
    setupAnimations();

    // Build the GUI now that we have all the actions.
    buildGui();

    // Active the actions now that the weights have been set.
    activateAllActions();

    // First call to render the scene
    animate();

    // Start looping poses
    loopAllPoses = true;
    animateNextPose()
}

function setupAnimations() {
    actions = [];
    poseIndexByName = {};
    meshHuman.geometry.animations.slice(0, -1).forEach(function (action, i) {
        var name = action.name;
        poseIndexByName[name] = i; // save action index by name
        actions.push(mixer.clipAction(name));
    });
    // Start actions from Reset pose, which is last in the array
    currentActionIndex = actions.length - 1;

    // Create array of index to set the order of the looped poses.
    // These names were set in blender and copied from the source.
    loopPoseOrder = [
        poseIndexByName['Shape: Pike'],
        poseIndexByName['Position: Feet'],
        poseIndexByName['Shape: Tuck'],
        poseIndexByName['Shape: Straight'],
        poseIndexByName['Shape: Straddle'],
        poseIndexByName['Position: Feet'],
        poseIndexByName['Position: Seat'],
        poseIndexByName['Position: Back'],
        poseIndexByName['Position: Feet'],
        poseIndexByName['Position: Front']
    ];
}

//
// GUI Stuff
function buildGui() {
    var panel = new dat.GUI({width:120});
    // var panel = new dat.GUI({autoPlace: false});
    // threejsContainerEl.appendChild(panel.domElement);

    // var folder1 = panel.addFolder('Visibility');
    // var folder4 = panel.addFolder('Poses');

    settings = {
        // 'Show figure': true,
        // 'Show skeleton': false,
        'Duration': 1.0,
        'Rotate': true,
        'Loop Poses': true,
        'Reset Camera': function () {
            controls.reset()
            // meshHuman.position.set(0, -1, 0);
            // camera.position.set(2.554964108027963, 1.4859133142971015, 2.382040338272563);
        }
    };
    //
    // folder1.add(settings, 'Show figure').onChange(showModel);
    // folder1.add(settings, 'Show skeleton').onChange(showSkeleton);
    // panel.add(settings, 'Duration', 0, 2, 0.01);
    panel.add(settings, 'Rotate');

    var loopPosesCkBx = panel.add(settings, 'Loop Poses').onChange(function () {
        if (settings['Loop Poses']) {
            // currentAllPosesIndex = 0;
            animateNextPose();
        }
    });

    actions.forEach(function (action, i) {
        // Buttons for changing animations
        settings[action._clip.name] = function () {
            // Update GUI to reflect that Loop Poses is turned off
            settings['Loop Poses'] = false;
            loopPosesCkBx.updateDisplay();
            loopPosesCkBx.__prev = loopPosesCkBx.__checkbox.checked; // Prevent having to click checkbox twice.

            // Trigger animation
            prepareCrossFade(action);
            // Update which animation was played last
            currentActionIndex = i;
        };
        panel.add(settings, action._clip.name);
    });

    panel.add(settings, 'Reset Camera');


    // folder1.open();
    // panel.open();
}

var animateNextPoseIsQueued = false;

function animateNextPose() {
    if (settings['Loop Poses']) {
        var actionIndex = loopPoseOrder[currentAllPosesIndex];
        var action = actions[actionIndex];
        prepareCrossFade(action);

        currentActionIndex = actionIndex;
        currentAllPosesIndex += 1;
        currentAllPosesIndex %= loopPoseOrder.length;

        // Make sure only 1 loop is started at a time
        if (!animateNextPoseIsQueued) {
            animateNextPoseIsQueued = true;
            setTimeout(function () {
                animateNextPoseIsQueued = false;
                animateNextPose()
            }, (settings['Duration'] * 1000) + 400);
        }
    }
}

function showModel(visibility) {
    meshHuman.visible = visibility;
}

function showSkeleton(visibility) {
    skeleton.visible = visibility;
}

function deactivateAllActions() {
    actions.forEach(function (action) {
        action.stop();
    });
}

function activateAllActions() {
    actions.forEach(function (action) {
        var name = action._clip.name;
        setWeight(action, settings[name]);
        action.play();
    });
}

function prepareCrossFade(endAction) {
    // Switch default / custom crossfade duration (according to the user's choice)
    var duration = settings['Duration'];

    setPoseName(endAction._clip.name);

    // Make sure that we don't go on in singleStepMode, and that all actions are unpaused
    // singleStepMode = false;
    // unPauseAllActions();

    // If the current action is 'idle' (duration 4 sec), execute the crossfade immediately;
    // else wait until the current action has finished its current loop
    // if (startAction === idleAction) {
    executeCrossFade(endAction, duration);
    // } else {
    //     synchronizeCrossFade(actions[currentActionIndex], endAction, duration);
    // }
}

function synchronizeCrossFade(startAction, endAction, duration) {
    mixer.addEventListener('loop', onLoopFinished);

    function onLoopFinished(event) {
        if (event.action === startAction) {
            mixer.removeEventListener('loop', onLoopFinished);
            executeCrossFade(startAction, endAction, duration);
        }
    }
}

function executeCrossFade(endAction, duration) {
    // Not only the start action, but also the end action must get a weight of 1 before fading
    // (concerning the start action this is already guaranteed in this place)
    setWeight(actions[currentActionIndex], 1);
    setWeight(endAction, 1);
    endAction.time = 0;

    // Crossfade with warping - you can also try without warping by setting the third parameter to false
    actions[currentActionIndex].crossFadeTo(endAction, duration, true);
}

// This function is needed, since animationAction.crossFadeTo() disables its start action and sets
// the start action's timeScale to ((start animation's duration) / (end animation's duration))
function setWeight(action, weight) {
    action.enabled = true;
    action.setEffectiveTimeScale(1);
    action.setEffectiveWeight(weight);
}


function setPoseName(poseName) {
    // Change the text in the top left corner to the name of the current skill
    var parts = poseName.split(':'); // Remove the 'Straight/Shape' prefix. Special case is 'Straight Jump'
    poseNameEl.innerHTML = parts[parts.length - 1].trim();
    // Add a class to animate the name change
    poseNameEl.classList.add('fadeUp');
    // Remove this class after the animation has stopped so that it can be run again the next time
    setTimeout(function () {
        poseNameEl.classList.remove('fadeUp');
    }, 300); // This number has to >= to the css animation-duration
}

function rotateMesh() {
    // Rotate mesh if the setting is enabled
    if (settings['Rotate']) {
        meshHuman.rotation.y -= SPEED;
    } else {
        // If setting is disabled but the mesh is facing away from the camera
        //  i.e. the rotation is not a multiple of 2pi
        // Then 'about face' quickly.
        if (meshHuman.rotation.y % 6.28319 < -SPEED * 5) {
            meshHuman.rotation.y -= SPEED * 5;
        }
    }
}


// Render the scene
function animate() {
    requestAnimationFrame(animate);

    rotateMesh();

    var delta = clock.getDelta();
    mixer.update(delta);
    skeleton.update();

    // stats.update();

    renderer.render(scene, camera);
}


function onWindowResize() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
}


// On your marks! Get..on with it!
init();

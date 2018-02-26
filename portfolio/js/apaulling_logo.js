/*
This script causes the eyes of the A to follow the mouse if its < 400 px away
It causes the eyebrows of the A to move back in fear if the mouse gets too close
It causes the eyebrows of the P to rotate down in relief as the mose gets closer to the A.

It uses 2 classes to do this.
    - Eyefollow moves the pupils inside the eye sockets in the direction of the mouse
    - BrowRotate rotates the 4 eyebrows around their center in response to the mouse's distance
        from the point between the As eyes
*/

function init() {
    // Keep reference to both eyes of the A monster
    const AEyeSVGRight = document.getElementById('R_Eye-2');
    const AEyeSVGLeft = document.getElementById('L_Eye-2');

    // Create a follower for both A eyes
    const AEyeRight = new EyeFollow(AEyeSVGRight, document.getElementById('R_Pupil-2'));
    const AEyeLeft = new EyeFollow(AEyeSVGLeft, document.getElementById('L_Pupil-2'));

    // Move the brows of A monster
    // Get the center point between the two eyes as the max brow point.
    const AEyesCenter_x = (AEyeSVGRight.cx.animVal.value + AEyeSVGLeft.cx.animVal.value) / 2;
    const AEyesCenter_y = AEyeSVGRight.cy.animVal.value; // Just picking 1 of the brows for the y.

    const ABrows = new BrowRotate(
        document.getElementById('R_Brow-2'),
        document.getElementById('L_Brow-2'),
        AEyesCenter_x,
        AEyesCenter_y,
        90, // range of angle
        1 // direction
    );
    const PBrows = new BrowRotate(
        document.getElementById('R_Brow'),
        document.getElementById('L_Brow'),
        AEyesCenter_x,
        AEyesCenter_y,
        35, // range of angle
        -1  // direction
    );


    // Make stuff happen when the mouse moves
    document.addEventListener('mousemove', (ev) => {
        let mousePt = DOM2SVGPoint(ev.pageX, ev.pageY);

        AEyeRight.calculatePupilPos(mousePt);
        AEyeLeft.calculatePupilPos(mousePt);
        ABrows.calculateBrowRotation(mousePt);
        PBrows.calculateBrowRotation(mousePt);
    })
}

//////////////////////////
// Classes to help control the eyes and brows.

class BrowRotate {
    constructor(browSVGRight, browLeftSVG, AEyesCenter_x, AEyesCenter_y, angleRange, rotationDirection) {
        this.browSVGRight = browSVGRight;
        this.browSVGLeft = browLeftSVG;
        this.AEyesCenter_x = AEyesCenter_x;
        this.AEyesCenter_y = AEyesCenter_y;
        this.angleRange = angleRange;
        this.rotationDirection = rotationDirection;
    }

    calculateBrowRotation(mousePt) {
        // Find brow distance
        const dx = mousePt.x - this.AEyesCenter_x;
        const dy = mousePt.y - this.AEyesCenter_y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const rotationScalar = Math.min(0.8, distance / (svg.viewBox.baseVal.width));
        this.updateBrowRotation(rotationScalar);
    }

    updateBrowRotation(rotationScalar) {
        // Rotate through 90 degrees
        // Offset so that rotation moves through an interesting range of angles
        let rotationValRight = (this.angleRange * (rotationScalar - 0.6)) * this.rotationDirection;
        let rotationValLeft = rotationValRight * -1;
        this.browSVGRight.style.transform = `rotateZ(${rotationValRight}deg)`;
        this.browSVGLeft.style.transform = `rotateZ(${rotationValLeft}deg)`;
    }
}

class EyeFollow {
    constructor(eyeSVG, pupilSVG) {
        const eyeRadius = eyeSVG.r.animVal.value;
        this.eye_x = eyeSVG.cx.animVal.value;
        this.eye_y = eyeSVG.cy.animVal.value;

        this.pupilSVG = pupilSVG; // save so cx, cy can be updated
        const pupilRadius = pupilSVG.r.animVal.value;

        // Need to keep pupil inside the eye
        // * 1 means the pupil ovelaps the eye stoke and looks like it's popping out
        // * 1.7 keeps pupil nicely, naturally inside.
        this.allowedDistance = eyeRadius - (pupilRadius * 1.7);
    }

    calculatePupilPos(mousePt) {
        // Distance components from mouse to eye center
        let dx = mousePt.x - this.eye_x;
        let dy = mousePt.y - this.eye_y;
        // Absolute distance, direction independent
        let distance = Math.sqrt(dx * dx + dy * dy);
        // If mouse inside the eyeball
        if (distance < this.allowedDistance) {
            this.updatePupilPos(this.eye_x + dx, this.eye_y + dy);
        }
        else if (distance > 400) {
            this.updatePupilPos(this.eye_x, this.eye_y);
        }
        else {
            // Normalise delta in each component so it's 0-1
            // Lock it to the allowed distance away from the eye center.
            this.offsetx = (dx / distance) * this.allowedDistance;
            this.offsety = (dy / distance) * this.allowedDistance;
            this.updatePupilPos(this.eye_x + this.offsetx, this.eye_y + this.offsety);
        }
    }

    updatePupilPos(x, y) {
        this.pupilSVG.setAttribute('cx', x);
        this.pupilSVG.setAttribute('cy', y);
    }
}

/////////////////////////////
//Helper function
// translate page to SVG co-ordinate
// https://www.sitepoint.com/how-to-translate-from-dom-to-svg-coordinates-and-back-again/
const svg = document.getElementById("logo");

function DOM2SVGPoint(x, y) {
    let pt = svg.createSVGPoint();
    pt.x = x;
    pt.y = y;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
}

// Enf helper functions
//////////////////////////////

// GO go go GO!
init();
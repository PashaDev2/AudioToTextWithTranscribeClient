/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-ignore
import { SimplexNoise } from "three/examples/jsm/math/SimplexNoise.js";
// import { VertexNormalsHelper } from "three/examples/jsm/helpers/VertexNormalsHelper.js";
import * as THREE from "three";

const noise = new SimplexNoise();

let context: AudioContext;

const vizInit = function () {
    try {
        const file = document.getElementById("thefile") as HTMLInputElement;
        const audio = document.getElementById("audio") as HTMLAudioElement;
        const fileLabel = document.querySelector("label.file") as HTMLLabelElement;

        document.onload = function (e) {
            console.log(e);
            audio?.play();
            play(audio);
        };

        file.onchange = function () {
            fileLabel.classList.add("normal");
            audio.classList.add("active");
            const files = (this as unknown as { files: File[] }).files;

            audio.src = URL.createObjectURL(files[0]);
            audio.load();
            audio.play();
            play(audio);
        };
    } catch (e) {
        console.log(e);
        setTimeout(() => {
            vizInit();
        }, 1000);
    }
};

function play(audio: HTMLAudioElement) {
    context = new AudioContext();
    const src = context.createMediaElementSource(audio);
    const analyser = context.createAnalyser();
    src.connect(analyser);
    analyser.connect(context.destination);
    analyser.fftSize = 512;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const scene = new THREE.Scene();
    const group = new THREE.Group();
    const camera = new THREE.PerspectiveCamera(
        45,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    camera.position.set(0, 0, 100);
    camera.lookAt(scene.position);
    scene.add(camera);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);

    const planeGeometry = new THREE.PlaneGeometry(800, 800, 20, 20);
    const planeMaterial = new THREE.MeshLambertMaterial({
        color: 0x6904ce,
        side: THREE.DoubleSide,
        wireframe: true,
    });

    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotation.x = -0.5 * Math.PI;
    plane.position.set(0, 30, 0);
    group.add(plane);

    const plane2 = new THREE.Mesh(planeGeometry, planeMaterial);
    plane2.rotation.x = -0.5 * Math.PI;
    plane2.position.set(0, -30, 0);
    group.add(plane2);

    const icosahedronGeometry = new THREE.IcosahedronGeometry(10, 4);
    const lambertMaterial = new THREE.MeshLambertMaterial({
        color: 0xff00ee,
        wireframe: true,
    });

    const ball = new THREE.Mesh(icosahedronGeometry, lambertMaterial);
    ball.position.set(0, 0, 0);
    group.add(ball);

    const ambientLight = new THREE.AmbientLight(0xaaaaaa);
    scene.add(ambientLight);

    const spotLight = new THREE.SpotLight(0xffffff);
    spotLight.intensity = 0.9;
    spotLight.position.set(-10, 40, 20);
    spotLight.lookAt(ball.position);
    spotLight.castShadow = true;
    scene.add(spotLight);

    scene.add(group);

    document.getElementById("out")?.appendChild(renderer.domElement);

    window.addEventListener("resize", onWindowResize, false);

    render();

    function render() {
        analyser.getByteFrequencyData(dataArray);

        const lowerHalfArray = dataArray.slice(0, dataArray.length / 2 - 1);
        const upperHalfArray = dataArray.slice(dataArray.length / 2 - 1, dataArray.length - 1);

        // const overallAvg = avg(dataArray as unknown as number[]);
        const lowerMax = max(lowerHalfArray as unknown as number[]);
        // const lowerAvg = avg(lowerHalfArray as unknown as number[]);
        // const upperMax = max(upperHalfArray as unknown as number[]);
        const upperAvg = avg(upperHalfArray as unknown as number[]);

        const lowerMaxFr = lowerMax / lowerHalfArray.length;
        // const lowerAvgFr = lowerAvg / lowerHalfArray.length;
        // const upperMaxFr = upperMax / upperHalfArray.length;
        const upperAvgFr = upperAvg / upperHalfArray.length;

        makeRoughGround(plane, modulate(upperAvgFr, 0, 1, 0.5, 4));
        makeRoughGround(plane2, modulate(lowerMaxFr, 0, 1, 0.5, 4));

        makeRoughBall(
            ball,
            modulate(Math.pow(lowerMaxFr, 0.8), 0, 1, 0, 8),
            modulate(upperAvgFr, 0, 1, 0, 4)
        );

        group.rotation.y += 0.005;
        renderer.render(scene, camera);
        requestAnimationFrame(render);
    }

    function onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }

    function makeRoughBall(mesh: THREE.Mesh, bassFr: number, treFr: number) {
        const positionAttribute = mesh.geometry.getAttribute("position");

        const _mesh = new THREE.Mesh(mesh.geometry, mesh.material);
        const geometry = _mesh.geometry as THREE.SphereGeometry;
        geometry.computeVertexNormals();

        const position = mesh.geometry.attributes.position;
        const index = mesh.geometry.index;
        const normal = mesh.geometry.attributes.normal;
        const offset = geometry.parameters.radius;

        // Calculate face normals
        for (let i = 0; i < (index?.count ?? 0); i += 3) {
            if (!index) continue;
            const vA = index.getX(i + 0);
            const vB = index.getX(i + 1);
            const vC = index.getX(i + 2);

            const pA = new THREE.Vector3().fromBufferAttribute(position, vA);
            const pB = new THREE.Vector3().fromBufferAttribute(position, vB);
            const pC = new THREE.Vector3().fromBufferAttribute(position, vC);

            const cb = new THREE.Vector3().subVectors(pC, pB);
            const ab = new THREE.Vector3().subVectors(pA, pB);
            cb.cross(ab).normalize();

            normal.setXYZ(vA, cb.x, cb.y, cb.z);
            normal.setXYZ(vB, cb.x, cb.y, cb.z);
            normal.setXYZ(vC, cb.x, cb.y, cb.z);
        }

        // debugger;

        const vertex = new THREE.Vector3();

        for (let vertexIndex = 0; vertexIndex < positionAttribute.count; vertexIndex++) {
            vertex.fromBufferAttribute(positionAttribute, vertexIndex);

            const amp = 7;
            const time = window.performance.now();
            vertex.normalize();
            const rf = 0.00001;
            const distance =
                offset +
                bassFr +
                noise.noise3d(
                    vertex.x + time * rf * 7,
                    vertex.y + time * rf * 8,
                    vertex.z + time * rf * 9
                ) *
                    amp *
                    treFr;
            vertex.multiplyScalar(distance);
        }
        // mesh.geometry?.vertices.forEach(function (vertex, i) {});
        // geometry.verticesNeedUpdate = true;
        // geometry.normalsNeedUpdate = true;
        geometry.computeVertexNormals();
        // geometry.computeFaceNormals();
    }

    function makeRoughGround(mesh: THREE.Mesh, distortionFr: number) {
        const positionAttribute = mesh.geometry.getAttribute("position");

        const vertex = new THREE.Vector3();

        for (let vertexIndex = 0; vertexIndex < positionAttribute.count; vertexIndex++) {
            vertex.fromBufferAttribute(positionAttribute, vertexIndex);
            const amp = 2;
            const time = Date.now();
            const distance =
                (noise.noise(vertex.x + time * 0.0003, vertex.y + time * 0.0001) + 0) *
                distortionFr *
                amp;
            vertex.z = distance;
        }

        // mesh.geometry.attributes.vertices.forEach(function (vertex, i) {});
        // mesh.geometry.verticesNeedUpdate = true;
        // mesh.geometry.normalsNeedUpdate = true;
        mesh.geometry.computeVertexNormals();
        // mesh.geometry.computeFaceNormals();
    }

    audio.play();
}

window.onload = vizInit;

document.body.addEventListener("touchend", function () {
    context?.resume();
});

function fractionate(val: number, minVal: number, maxVal: number): number {
    return (val - minVal) / (maxVal - minVal);
}

function modulate(
    val: number,
    minVal: number,
    maxVal: number,
    outMin: number,
    outMax: number
): number {
    const fr = fractionate(val, minVal, maxVal);
    const delta = outMax - outMin;
    return outMin + fr * delta;
}

function avg(arr: number[]) {
    const total = arr.reduce(function (sum, b) {
        return sum + b;
    });
    return total / arr.length;
}

function max(arr: number[]) {
    return arr.reduce(function (a, b) {
        return Math.max(a, b);
    });
}

import style from "./app.module.scss";
import { useState, useCallback, useRef, useEffect } from "react";
import { Accept, useDropzone } from "react-dropzone"; // for file upload
import axios from "axios"; // to make network request
import { toast, ToastContainer } from "react-toastify"; // for toast notification
import { gsap } from "gsap";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

// Helper function for conversion from time to seconds
const timeToSeconds = (time: string) => {
    const [hours, minutes, seconds] = time.split(":").map(v => parseInt(v, 10));
    return hours * 3600 + minutes * 60 + seconds;
};

// Helper function for conversion from time to minutes and seconds
const timeToMinutesAndSeconds = (time: string) => {
    const totalSeconds = timeToSeconds(time);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

const acceptedFileTypes: Accept = { accept: ["audio/*"] };

const App = () => {
    const audioRef = useRef<HTMLMediaElement>(null);
    const [uploading, setUploading] = useState(false);
    const [transcription, setTranscription] = useState("");
    const [audioFile, setAudioFile] = useState<File | null>(null);
    const [startTime] = useState("00:00:00");
    const [endTime] = useState("00:10:00"); // 10 minutes default endtime
    // const [audioDuration, setAudioDuration] = useState<number | null>(null);

    const getAudioDuration = (file: File) => {
        const audio = new Audio(URL.createObjectURL(file));
        if (audio.duration) {
            audio.addEventListener("loadedmetadata", () => {
                // setAudioDuration(audio.duration);
            });
        }
    };

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length === 0) {
            return;
        }

        const file = acceptedFiles[0];
        if (!file.type.startsWith("audio/") || file.size > 400 * 1024 * 1024) {
            return;
        }

        if (audioRef.current) {
            audioRef.current.src = URL.createObjectURL(file);
            audioRef.current?.load;
            audioRef.current?.play();
        }

        setAudioFile(file);
        getAudioDuration(file);
    }, []);

    const transcribeAudio = async () => {
        setUploading(true);

        try {
            const formData = new FormData();
            audioFile && formData.append("file", audioFile);
            formData.append("startTime", timeToMinutesAndSeconds(startTime));
            formData.append("endTime", timeToMinutesAndSeconds(endTime));

            const response = await axios.post(
                `https://1444-94-179-177-176.ngrok-free.app/api/v1/transcribe`,
                formData,
                {
                    headers: { "Content-Type": "multipart/form-data" },
                }
            );

            setTranscription(response.data.transcription);

            toast.success("Transcription successful.");
        } catch (error) {
            toast.error("An error occurred during transcription.");
        } finally {
            setUploading(false);
        }
    };

    const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
        onDrop,
        accept: acceptedFileTypes,
    });

    return (
        <>
            <div className="container mx-auto py-12 px-6">
                <ToastContainer />

                <h1 className="text-4xl mb-6">Audio to text</h1>
                <div
                    {...getRootProps()}
                    className={`dropzone p-6 border-2 border-dashed rounded ${
                        isDragActive
                            ? "border-green-500"
                            : isDragReject
                            ? "border-red-500"
                            : "border-gray-300"
                    }`}>
                    <input {...getInputProps()} />
                    {isDragActive ? (
                        <p>Drop the audio file here...</p>
                    ) : audioFile ? (
                        <p>Selected file: {audioFile.name}</p>
                    ) : (
                        <p>Drag and drop an audio file here, or click to select a file</p>
                    )}
                </div>
                {/* <div className="flex flex-col md:flex-row justify-center space-y-4 md:space-y-0 md:space-x-8 mt-2">
                <TimePicker
                    id="start-time"
                    label="Start Time:"
                    value={startTime}
                    onChange={handleStartTimeChange}
                    maxDuration={audioDuration || Infinity}
                />
                <TimePicker
                    id="end-time"
                    label="End Time:"
                    value={endTime}
                    onChange={setEndTime}
                    maxDuration={audioDuration || Infinity}
                />
            </div> */}
                {uploading && <p className="mt-4">Uploading and transcribing...</p>}
                {transcription && (
                    <div className="mt-4">
                        <h2 className="text-2xl mb-2">Transcription:</h2>
                        <p>{transcription}</p>
                    </div>
                )}
                <button
                    className="mt-4 bg-blue-500 text-white font-bold py-2 px-4 rounded"
                    onClick={transcribeAudio}
                    disabled={uploading || !audioFile}>
                    Transcribe
                </button>

                <audio ref={audioRef} id="audio" controls></audio>
            </div>

            <div className={style.canvasContainer}>
                {audioFile && audioRef.current ? (
                    <Canvas>
                        <Scene audio={audioRef.current} />
                    </Canvas>
                ) : null}
            </div>
        </>
    );
};

export default App;

// const noise = new SimplexNoise();

const Scene = ({ audio }: { audio?: HTMLMediaElement }) => {
    const refBall = useRef<THREE.Mesh | null>(null);
    const refCamera = useRef<THREE.PerspectiveCamera | null>(null);
    const [context] = useState<AudioContext>(new AudioContext());
    const [analyzer, changeAnalyzer] = useState<AnalyserNode | null>(null);
    const planesRefs = useRef<
        THREE.Mesh<
            THREE.BufferGeometry<THREE.NormalBufferAttributes>,
            THREE.Material | THREE.Material[]
        >[]
    >([]);
    const mainGroupRef = useRef<THREE.Group | null>(null);

    useEffect(() => {
        if (context && audio) {
            const src = context.createMediaElementSource(audio);
            const analyser = context.createAnalyser();

            src.connect(analyser);
            analyser.connect(context.destination);
            analyser.fftSize = 512;

            changeAnalyzer(analyser);
        }
    }, [audio, context]);

    useFrame(() => {
        // const time = state.clock.getElapsedTime();
        if (analyzer) {
            const bufferLength = analyzer.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            analyzer.getByteFrequencyData(dataArray);

            // const average = dataArray.reduce((a, b) => a + b, 0) / bufferLength;

            // refBall.current.position.z = average / 10;

            const lowerHalfArray = dataArray.slice(0, dataArray.length / 2 - 1);

            const overallAvg = avg(dataArray as unknown as number[]);
            const lowerMax = max(lowerHalfArray as unknown as number[]);
            const lowerAvg = avg(lowerHalfArray as unknown as number[]);

            const lowerMaxFr = lowerMax / lowerHalfArray.length || 0;
            const lowerAvgFr = lowerAvg / lowerHalfArray.length || 0;

            console.group("Frequencies");
            console.log("lowerMaxFr", lowerMaxFr);
            console.log("lowerAvgFr", lowerAvgFr);
            console.log("overallAvg", overallAvg);
            console.groupEnd();

            const data = new Uint8Array(analyzer.frequencyBinCount);
            analyzer.getByteFrequencyData(data);

            // Modify the sphere's with gsap based on the audio data
            if (refBall.current)
                gsap.to(refBall.current.scale, {
                    duration: 0.5,
                    x: modulate(0.5, lowerAvgFr, lowerMaxFr, 1, 2),
                    y: modulate(0.5, lowerAvgFr, lowerMaxFr, 1, 2),
                    z: modulate(0.5, lowerAvgFr, lowerMaxFr, 1, 2),
                    ease: "ease-in-out",
                });

            if (refCamera.current)
                gsap.to(refCamera.current.position, {
                    duration: 0.1,
                    z: modulate(0, lowerAvgFr, lowerMaxFr, 1, 20),
                });

            if (mainGroupRef.current)
                gsap.to(mainGroupRef.current.rotation, {
                    duration: 0.1,
                    x: mainGroupRef.current.rotation.x + 0.005,
                    y: mainGroupRef.current.rotation.y + 0.005,
                    ease: "ease",
                });

            planesRefs.current[1].scale.y = data[0] / 100 + 1;
            planesRefs.current[0].scale.y = data[0] / 100 + 1;
        }
    });

    return (
        <>
            <group ref={mainGroupRef}>
                <perspectiveCamera
                    ref={refCamera}
                    far={1000}
                    near={1}
                    fov={75}
                    position={[0, 0, 100]}
                />

                <mesh
                    ref={node => {
                        if (node !== null) planesRefs.current[0] = node;
                    }}
                    rotation={new THREE.Euler(-0.5 * Math.PI, 0)}
                    position={[0, 30, 0]}>
                    <planeGeometry args={[800, 800, 20, 20]} />
                    <meshLambertMaterial color={0x6904ce} wireframe side={THREE.DoubleSide} />
                </mesh>

                <mesh ref={refBall} position={[0, 0, 0]}>
                    <icosahedronBufferGeometry args={[2, 32, 32]} />
                    <meshLambertMaterial color={0xffffff} wireframe />
                </mesh>

                <mesh
                    ref={node => {
                        if (node !== null) planesRefs.current[1] = node;
                    }}
                    rotation={new THREE.Euler(-0.5 * Math.PI, 0)}
                    position={[0, -30, 0]}>
                    <planeGeometry args={[800, 800, 20, 20]} />
                    <meshLambertMaterial color={0x6904ce} wireframe side={THREE.DoubleSide} />
                </mesh>
            </group>

            <ambientLight color={0xaaaaaa} />
            <spotLight
                ref={node => {
                    refBall.current && node?.lookAt(refBall.current?.position);
                }}
                color={0xffffff}
                intensity={0.9}
                position={[-10, 40, 20]}
                castShadow
            />
        </>
    );
};

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

    console.log("fr", fr);
    return outMin + (fr || 0) * delta;
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

// const handleStartTimeChange = (newStartTime: string) => {
//     const startTimeSeconds = timeToSeconds(newStartTime);
//     const endTimeSeconds = timeToSeconds(endTime);

//     if (startTimeSeconds >= endTimeSeconds) {
//         const newEndTimeSeconds = Math.min(startTimeSeconds + 600, audioDuration || 0);
//         const newEndTime = secondsToTime(newEndTimeSeconds);
//         setEndTime(newEndTime);
//     }

//     setStartTime(newStartTime);
// };

// const makeRoughBall = useCallback((mesh: THREE.Mesh, bassFr: number, treFr: number) => {
//     const positionAttribute = mesh.geometry.getAttribute("position");

//     // const _mesh = new THREE.Mesh(mesh.geometry, mesh.material);
//     const geometry = mesh.geometry as THREE.SphereGeometry;
//     geometry.computeVertexNormals();

//     // const position = mesh.geometry.attributes.position;
//     // const index = mesh.geometry.index;
//     // const normal = mesh.geometry.attributes.normal;
//     const offset = geometry.parameters.radius;

//     const vertex = new THREE.Vector3();

//     for (let vertexIndex = 0; vertexIndex < positionAttribute.count; vertexIndex++) {
//         vertex.fromBufferAttribute(positionAttribute, vertexIndex);

//         const amp = 2;
//         const time = Date.now();

//         // vertex.normalize();

//         const rf = 0.00001;
//         const distance =
//             offset +
//             bassFr +
//             noise.noise3d(
//                 vertex.x + time * rf * 7,
//                 vertex.y + time * rf * 8,
//                 vertex.z + time * rf * 9
//             ) *
//                 amp *
//                 treFr;

//         vertex.multiplyScalar(distance);
//     }
//     geometry.computeVertexNormals();
// }, []);

// const makeRoughGround = useCallback((mesh: THREE.Mesh, distortionFr: number) => {
//     const positionAttribute = mesh.geometry.getAttribute("position");

//     const vertex = new THREE.Vector3();

//     for (let vertexIndex = 0; vertexIndex < positionAttribute.count; vertexIndex++) {
//         vertex.fromBufferAttribute(positionAttribute, vertexIndex);

//         const amp = 2;
//         const distance =
//             noise.noise3d(vertex.x * 0.0003, vertex.y * 0.0001, vertex.z) * distortionFr * amp;
//         vertex.z = distance;

//         positionAttribute.setXYZ(vertexIndex, vertex.x, vertex.y, vertex.z);

//         positionAttribute.needsUpdate = true;

//         mesh.geometry.attributes.position.needsUpdate = true;
//     }

//     mesh.geometry.computeVertexNormals();
// }, []);

// Helper function for conversion from seconds to time
// const secondsToTime = (totalSeconds: number) => {
//     const hours = Math.floor(totalSeconds / 3600);
//     const minutes = Math.floor((totalSeconds % 3600) / 60);
//     const seconds = totalSeconds % 60;
//     return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(
//         seconds
//     ).padStart(2, "0")}`;
// };

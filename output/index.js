import { v as vec3Impl, m as mat4Impl, a as mat3Impl, b as vec4Impl } from './notMyStuff.js';

class Menu {
    menu;
    title = "Metroscorpio's 3D Dodge Game";
    titleDiv;
    instructions;
    pauseText;
    gameOverText;
    startButton;
    restartButton;
    resumeButton;
    mainMenuButton;
    newLine;
    state;
    scoreElem = document.createElement('div');
    constructor() {
        this.titleDiv = document.createElement('div');
        this.titleDiv.textContent = this.title;
        this.menu = document.querySelector('div.menu');
        this.menu.hidden = false;
        this.instructions = document.querySelector('#instructions');
        this.newLine = document.createElement(`br`);
        this.startButton = document.createElement(`div`);
        this.startButton.textContent = "Start!";
        this.startButton.style.width = `fit-content`;
        this.startButton.style.display = `inline-block`;
        this.startButton.addEventListener(`mousedown`, (e) => this.unPause(e));
        this.restartButton = document.createElement('div');
        this.restartButton.textContent = "Restart";
        this.restartButton.style.width = `fit-content`;
        this.restartButton.style.display = `inline-block`;
        this.restartButton.addEventListener('mousedown', (e) => this.restart(e));
        this.resumeButton = document.createElement('div');
        this.resumeButton.textContent = "Resume";
        this.resumeButton.style.width = `fit-content`;
        this.resumeButton.style.display = `inline-block`;
        this.resumeButton.addEventListener('mousedown', (e) => this.unPause(e));
        this.pauseText = document.createElement(`div`);
        this.pauseText.textContent = "--PAUSED--";
        this.pauseText.style.marginTop = "5%";
        this.mainMenuButton = document.createElement('div');
        this.mainMenuButton.textContent = "Main Menu";
        this.mainMenuButton.style.width = `fit-content`;
        this.mainMenuButton.style.display = `inline-block`;
        this.mainMenuButton.addEventListener('mousedown', (e) => this.returnToMain(e));
        this.gameOverText = document.createElement(`div`);
        this.gameOverText.textContent = "--GAME OVER--";
        this.gameOverText.style.marginTop = "5%";
        document.addEventListener('keydown', (e) => {
            if (e.key === "Escape") {
                if (this.isPaused()) {
                    this.unPause(e);
                }
                else {
                    this.showPauseMenu();
                }
            }
        });
        this.showMainMenu();
    }
    returnToMain(e) {
        let restart = new Event('startNewGame');
        document.dispatchEvent(restart);
        this.showMainMenu();
    }
    restart(e) {
        this.state = "inGame";
        this.menu.hidden = true;
        let restart = new Event('startNewGame');
        document.dispatchEvent(restart);
    }
    catchEvent(e) {
        e.preventDefault();
        e.stopPropagation();
        return;
    }
    unPause(e) {
        this.catchEvent(e);
        if (!this.menu.hidden) {
            this.menu.hidden = true;
            let unpause = new Event('unpause');
            document.dispatchEvent(unpause);
        }
        this.state = "inGame";
    }
    showMainMenu() {
        this.menu.hidden = false;
        this.state = 'main';
        this.menu.style.backgroundColor = 'rgba(0,0,0,0)';
        this.menu.replaceChildren(this.titleDiv, this.newLine, this.startButton, this.newLine, this.instructions);
    }
    showPauseMenu() {
        if (this.state = 'inGame') {
            this.state = `paused`;
            this.menu.replaceChildren(this.newLine, this.pauseText, this.newLine, this.resumeButton, this.newLine, this.mainMenuButton);
            this.menu.style.backgroundColor = 'rgba(0,0,0,0.33)';
            this.menu.hidden = false;
        }
    }
    checkFocus() {
        if (!document.hasFocus() && this.state == 'inGame') {
            this.showPauseMenu();
        }
    }
    isPaused() {
        return (this.state == "paused");
    }
    isInGame() {
        return (this.state == "inGame");
    }
    showGameOver(score) {
        this.state = "gameOver";
        this.menu.style.backgroundColor = 'rgba(0,0,0,0.33)';
        this.scoreElem.textContent = "Time Survived: "
            + score.getMinutes().toString()
            + ":"
            + score.getSeconds().toString().padStart(2, '0');
        this.menu.replaceChildren(this.gameOverText, this.newLine, this.scoreElem, this.newLine, this.mainMenuButton, this.newLine, this.restartButton);
        this.menu.hidden = false;
        return;
    }
}

class BindGroupLayouts {
    camera;
    transform;
    fireball;
    normalObjectInfo;
    light;
    constructor(device) {
        this.camera = device.createBindGroupLayout(cameraBindGroupLayoutDescriptor);
        this.transform = device.createBindGroupLayout(transformBindGroupLayoutDescriptor);
        this.fireball = device.createBindGroupLayout(fireBallBindGroupLayoutDescriptor);
        this.normalObjectInfo = device.createBindGroupLayout(normalObjectInfo);
        this.light = device.createBindGroupLayout(light);
    }
}
const light = {
    'label': 'Light BindGroupLayout',
    'entries': [{
            'binding': 0,
            'visibility': GPUShaderStage.FRAGMENT | GPUShaderStage.VERTEX,
            buffer: {
                'type': 'uniform',
            },
        }]
};
const cameraBindGroupLayoutDescriptor = {
    label: 'Camera bindgroup Layout',
    entries: [{
            binding: 0,
            visibility: GPUShaderStage.VERTEX,
            buffer: {},
        },],
};
const transformBindGroupLayoutDescriptor = {
    label: 'Bind Group Layout for a 4x4 transform matrix',
    entries: [{
            binding: 0,
            visibility: GPUShaderStage.VERTEX,
            buffer: {
                type: "uniform",
            },
        },],
};
const fireBallBindGroupLayoutDescriptor = {
    label: 'Bind Group Layout for Fireballs',
    entries: [{
            binding: 0,
            visibility: GPUShaderStage.VERTEX,
            buffer: {
                type: "uniform",
            },
        }, {
            binding: 1,
            visibility: GPUShaderStage.FRAGMENT,
            buffer: {
                type: "uniform",
            },
        }],
};
const normalObjectInfo = {
    label: 'bind group layout for model and normal matrix',
    entries: [
        {
            binding: 0,
            visibility: GPUShaderStage.VERTEX,
            buffer: {
                type: "uniform",
            },
        },
    ],
};

class SimpleMesh {
    static simpleVertexSize = 4 * 10; // Byte size of one cube vertex.
    static simplePositionOffset = 0;
    static simpleColorOffset = 4 * 4; // Byte offset of cube vertex color attribute.
    static simpleUVOffset = 4 * 8;
    vertexCount;
    vertexArray;
    vertexBuffer = undefined;
    constructor(vertexCount, vertexArray) {
        this.vertexCount = vertexCount;
        this.vertexArray = vertexArray;
    }
    getVertexBuffer(device) {
        if (this.vertexBuffer === null || this.vertexBuffer === undefined) {
            this.vertexBuffer = device.createBuffer({
                label: "Singleton Vertex Buffer for " + this.constructor.name,
                size: this.vertexArray.byteLength,
                usage: GPUBufferUsage.VERTEX,
                mappedAtCreation: true,
            });
            new Float32Array(this.vertexBuffer.getMappedRange()).set(this.vertexArray);
            this.vertexBuffer.unmap();
        }
        return this.vertexBuffer;
    }
}

var simpleVertWGSL = `@group(0) @binding(0) var<uniform> viewProjectionMatrix: mat4x4f;

@group(1) @binding(0) var<uniform> transformMatrix: mat4x4f;

struct VertexOutput {
    @builtin(position) Position: vec4f,
    @location(0) color: vec4f,
}

@vertex
fn main(@location(0) position: vec4f, @location(1) uv: vec2f)-> VertexOutput{
    var output: VertexOutput;
    output.Position = viewProjectionMatrix * transformMatrix * position;
    output.color = 0.5 * (position + vec4(1.0,1.0,1.0,1.0));
    return output;
}`;

var simpleFragWGSL = `@fragment
fn main(
  @location(0) color: vec4f
) -> @location(0) vec4f {
  return color;
}`;

const sizeOfFloat$2 = Float32Array.BYTES_PER_ELEMENT;
const positionCount$1 = 3;
const normalCount$1 = 3;
class GlassMesh {
    static positionOffset = sizeOfFloat$2 * 0;
    static normalOffset = this.positionOffset + (positionCount$1 * sizeOfFloat$2);
    static vertexSize = this.normalOffset + (normalCount$1 * sizeOfFloat$2);
    static floatCount = this.vertexSize / sizeOfFloat$2;
    static defaultVertexAttributes = [
        {
            shaderLocation: 0,
            offset: this.positionOffset,
            format: `float32x3`
        },
        {
            shaderLocation: 1,
            offset: this.normalOffset,
            format: `float32x3`,
        },
    ];
    static convertPLYtoArray(ply) {
        let body;
        let vertexCount;
        let vertices = [];
        let vertexArray;
        {
            let result = ply.split(/end_header/);
            if (result.length !== 2) {
                console.warn("convert to ply failed");
                return null;
            }
            result[0];
            body = result[1];
        }
        {
            let result = ply.match(/element\svertex\s\d+/g);
            if (result === null) {
                return null;
            }
            if (result.length <= 0 || result.length > 1) {
                console.warn("convert to ply failed");
                return null;
            }
            try {
                const vertexCountString = (result[0].match(/\d+/));
                if (vertexCountString === null || vertexCountString.length !== 1) {
                    return null;
                }
                vertexCount = parseInt(vertexCountString[0]);
            }
            catch {
                console.warn("convert to ply failed");
                return null;
            }
        }
        {
            //split by newline
            let result = body.split(/\r?\n/);
            //remove whitespaces
            result = result.filter((s) => (/\S/.test(s)));
            let vertexData = result.slice(0, vertexCount);
            let faceData = result.slice(vertexCount);
            for (const vertex of vertexData) {
                vertices.push(new VertexWithoutNormal$1(vertex));
            }
            vertexArray = new Float32Array(GlassMesh.floatCount * faceData.length * 3);
            let runningOffset = 0;
            for (const face of faceData) {
                const faceVertices = face.split(/\s/).map((faceVertex) => { return parseInt(faceVertex); });
                //remove the first number
                if (faceVertices.shift() !== 3) {
                    console.warn("face has too many points");
                    return null;
                }
                if (faceVertices.length !== 3) {
                    console.warn("face has too many points");
                    return null;
                }
                for (let i = 0; i < faceVertices.length; i++) {
                    if (faceVertices[i] >= vertexData.length || faceVertices[i] < 0) {
                        console.warn("referenced vertex in face is out of bounds");
                        return null;
                    }
                }
                const normal = calculateNormal$1(faceVertices, vertices);
                for (let i = 0; i < faceVertices.length; i++) {
                    const vertex = vertices[faceVertices[i]];
                    vertexArray.set([
                        vertex.x,
                        vertex.y,
                        vertex.z,
                        normal[0],
                        normal[1],
                        normal[2],
                    ], runningOffset);
                    runningOffset += GlassMesh.floatCount;
                }
            }
        }
        return vertexArray;
    }
    static createVertexBuffer(device, ply, label) {
        const vertexArray = GlassMesh.convertPLYtoArray(ply);
        //TODO: replace this error by returning a default properly formatted mesh.
        if (vertexArray === null) {
            console.error("Improperly formatted ply file in arrowmesh");
            return null;
        }
        const vertexBuffer = device.createBuffer({
            label: label,
            size: vertexArray.byteLength,
            usage: GPUBufferUsage.VERTEX,
            mappedAtCreation: true,
        });
        new Float32Array(vertexBuffer.getMappedRange()).set(vertexArray);
        vertexBuffer.unmap();
        const vertexCount = vertexArray.length / GlassMesh.floatCount;
        return { vertexBuffer, vertexCount: vertexCount };
    }
}
let VertexWithoutNormal$1 = class VertexWithoutNormal {
    x;
    y;
    z;
    constructor(vertex) {
        const properties = vertex.split(/\s/);
        if (properties.length !== 3) {
            console.warn("vertex property count seems wrong!");
            return null;
        }
        this.x = parseFloat(properties[0]);
        this.y = parseFloat(properties[1]);
        this.z = parseFloat(properties[2]);
    }
    getPositionVector() {
        return vec3Impl.fromValues(this.x, this.y, this.z);
    }
};
function calculateNormal$1(face, vertices) {
    const point0 = vertices[face[0]].getPositionVector();
    const point1 = vertices[face[1]].getPositionVector();
    const point2 = vertices[face[2]].getPositionVector();
    const edge0 = vec3Impl.subtract(point1, point0);
    const edge1 = vec3Impl.subtract(point2, point0);
    const normal = vec3Impl.cross(edge0, edge1);
    return normal;
}

const preferredCanvasFormat$1 = navigator.gpu.getPreferredCanvasFormat();
const primitives = {
    topology: 'triangle-list',
    cullMode: 'back',
    frontFace: 'ccw',
};
const depthStencilFormat = {
    depthWriteEnabled: true,
    depthCompare: 'less',
    format: 'depth24plus',
};

const preferredCanvasFormat = navigator.gpu.getPreferredCanvasFormat();
function createFireballPipeline(device, bindGroupLayouts) {
    const shader = device.createShaderModule({ code: fireballCode });
    return device.createRenderPipeline({
        layout: device.createPipelineLayout({
            bindGroupLayouts: [
                bindGroupLayouts.camera,
                bindGroupLayouts.light,
                bindGroupLayouts.fireball,
            ],
        }),
        vertex: {
            module: shader,
            entryPoint: "fireballVert",
            buffers: [{
                    arrayStride: GlassMesh.vertexSize,
                    attributes: [{
                            shaderLocation: 0,
                            offset: GlassMesh.positionOffset,
                            format: 'float32x3',
                        }, {
                            shaderLocation: 1,
                            offset: GlassMesh.normalOffset,
                            format: `float32x3`,
                        }],
                }],
        },
        fragment: {
            module: shader,
            entryPoint: "fireballFrag",
            targets: [{
                    format: preferredCanvasFormat,
                    blend: {
                        color: {
                            srcFactor: "one",
                            dstFactor: "one-minus-src-alpha",
                        },
                        alpha: {
                            srcFactor: "one",
                            dstFactor: "one-minus-src-alpha",
                        },
                    }
                },],
        },
        primitive: {
            'cullMode': 'back',
        },
        depthStencil: depthStencilFormat,
    });
}
const fireballCode = /*wgsl*/ `
    struct PositionInfo{
        transform:mat4x4f,
        normal:mat3x3f,
    }

    struct VSOutput{
        @builtin(position) position:vec4f,
        @location(0) normal: vec3f,
        @location(1) surfaceToCamera:vec3f,
        @location(2) surfaceToLight:vec3f,
    }

    struct Camera{
        viewProjectionMatrix:mat4x4f,
        position:vec3f,
    }

    @group(0) @binding(0) var<uniform> camera:Camera;
    @group(1) @binding(0) var<uniform> lightPosition:vec3f;
    @group(2) @binding(0) var<uniform> positionUniform: PositionInfo;
    @group(2) @binding(1) var<uniform> color: vec4f;

    @vertex
    fn fireballVert(@location(0) position: vec4f, @location(1) normal:vec3f) -> VSOutput {
        var output:VSOutput;
        let worldPosition = positionUniform.transform * position;
        output.position = camera.viewProjectionMatrix * worldPosition;
        output.normal = positionUniform.normal * normal;
        output.surfaceToCamera = camera.position - worldPosition.xyz;
        output.surfaceToLight = lightPosition - worldPosition.xyz;
        return output; 
    }
    
    @fragment
    fn fireballFrag(fragIn:VSOutput) -> @location(0) vec4f {
        let normal:vec3f = normalize(fragIn.normal);
        let lightDirection:vec3f = normalize(fragIn.surfaceToLight);
        let cameraDirection:vec3f = normalize(fragIn.surfaceToCamera);
        let halfVector:vec3f = normalize(lightDirection + cameraDirection);
        //let specular:f32 = dot(halfVector,normal);
        let specular:f32 = clamp((dot(lightDirection,normal) - dot(cameraDirection,normal)),0,1);
        let edge:f32 = 1-pow(clamp(dot(cameraDirection,normal),0,1),1.0);
        return specular + color*edge;
    }
`;

const sizeOfFloat$1 = 4;
const positionCount = 4;
const normalCount = 3;
const colorCount = 4;
const texCoordCount = 2;
class NormalMesh {
    static positionOffset = sizeOfFloat$1 * 0;
    static normalOffset = this.positionOffset + (positionCount * sizeOfFloat$1);
    static colorOffset = this.normalOffset + (normalCount * sizeOfFloat$1);
    static uvOffset = this.colorOffset + (colorCount * sizeOfFloat$1);
    static vertexSize = this.uvOffset + (texCoordCount * sizeOfFloat$1);
    static floatCount = this.vertexSize / sizeOfFloat$1;
    static defaultVertexAttributes = [
        {
            shaderLocation: 0,
            offset: this.positionOffset,
            format: `float32x4`
        },
        {
            shaderLocation: 1,
            offset: this.normalOffset,
            format: `float32x3`,
        },
        {
            shaderLocation: 2,
            offset: this.colorOffset,
            format: `float32x4`,
        },
        {
            shaderLocation: 3,
            offset: this.uvOffset,
            format: `float32x2`,
        },
    ];
    static convertPLYtoArray(ply) {
        let body;
        let vertexCount;
        let vertices = [];
        let vertexArray;
        {
            let result = ply.split(/end_header/);
            if (result.length !== 2) {
                console.warn("convert to ply failed");
                return null;
            }
            result[0];
            body = result[1];
        }
        {
            let result = ply.match(/element\svertex\s\d+/g);
            if (result === null) {
                return null;
            }
            if (result.length <= 0 || result.length > 1) {
                console.warn("convert to ply failed");
                return null;
            }
            try {
                const vertexCountString = (result[0].match(/\d+/));
                if (vertexCountString === null || vertexCountString.length !== 1) {
                    return null;
                }
                vertexCount = parseInt(vertexCountString[0]);
            }
            catch {
                console.warn("convert to ply failed");
                return null;
            }
        }
        {
            //split by newline
            let result = body.split(/\r?\n/);
            //remove whitespaces
            result = result.filter((s) => (/\S/.test(s)));
            let vertexData = result.slice(0, vertexCount);
            let faceData = result.slice(vertexCount);
            for (const vertex of vertexData) {
                vertices.push(new VertexWithoutNormal(vertex));
            }
            vertexArray = new Float32Array(NormalMesh.floatCount * faceData.length * 3);
            let runningOffset = 0;
            for (const face of faceData) {
                const faceVertices = face.split(/\s/).map((faceVertex) => { return parseInt(faceVertex); });
                //remove the first number
                if (faceVertices.shift() !== 3) {
                    console.warn("face has too many points");
                    return null;
                }
                if (faceVertices.length !== 3) {
                    console.warn("face has too many points");
                    return null;
                }
                for (let i = 0; i < faceVertices.length; i++) {
                    if (faceVertices[i] >= vertexData.length || faceVertices[i] < 0) {
                        console.warn("referenced vertex in face is out of bounds");
                        return null;
                    }
                }
                const normal = calculateNormal(faceVertices, vertices);
                for (let i = 0; i < faceVertices.length; i++) {
                    const vertex = vertices[faceVertices[i]];
                    vertexArray.set([
                        vertex.x,
                        vertex.y,
                        vertex.z,
                        vertex.w,
                        normal[0],
                        normal[1],
                        normal[2],
                        vertex.r,
                        vertex.g,
                        vertex.b,
                        vertex.a,
                        vertex.u,
                        vertex.v,
                    ], runningOffset);
                    runningOffset += NormalMesh.floatCount;
                }
            }
        }
        return vertexArray;
    }
    static createVertexBuffer(device, ply, label) {
        const vertexArray = NormalMesh.convertPLYtoArray(ply);
        //TODO: replace this error by returning a default properly formatted mesh.
        if (vertexArray === null) {
            console.error("Improperly formatted ply file in arrowmesh");
            return null;
        }
        const vertexBuffer = device.createBuffer({
            label: label,
            size: vertexArray.byteLength,
            usage: GPUBufferUsage.VERTEX,
            mappedAtCreation: true,
        });
        new Float32Array(vertexBuffer.getMappedRange()).set(vertexArray);
        vertexBuffer.unmap();
        const vertexCount = vertexArray.length / NormalMesh.floatCount;
        return { vertexBuffer, vertexCount: vertexCount };
    }
}
class VertexWithoutNormal {
    x;
    y;
    z;
    w;
    r;
    g;
    b;
    a;
    u;
    v;
    constructor(vertex) {
        const properties = vertex.split(/\s/);
        if (properties.length !== 9) {
            console.warn("vertex property count seems wrong!");
            return null;
        }
        this.x = parseFloat(properties[0]);
        this.y = parseFloat(properties[1]);
        this.z = parseFloat(properties[2]);
        this.w = 1;
        this.r = parseInt(properties[3]) / 255;
        this.g = parseInt(properties[4]) / 255;
        this.b = parseInt(properties[5]) / 255;
        this.a = parseInt(properties[6]) / 255;
        this.u = parseFloat(properties[7]);
        this.v = parseFloat(properties[8]);
    }
    getPositionVector() {
        return vec3Impl.fromValues(this.x, this.y, this.z);
    }
}
function calculateNormal(face, vertices) {
    const point0 = vertices[face[0]].getPositionVector();
    const point1 = vertices[face[1]].getPositionVector();
    const point2 = vertices[face[2]].getPositionVector();
    const edge0 = vec3Impl.subtract(point1, point0);
    const edge1 = vec3Impl.subtract(point2, point0);
    const normal = vec3Impl.cross(edge0, edge1);
    return normal;
}

function createNormalPipeline(device, bindGroupLayouts) {
    const shader = device.createShaderModule({ code: normalCode });
    return device.createRenderPipeline({
        layout: device.createPipelineLayout({
            bindGroupLayouts: [
                bindGroupLayouts.camera,
                bindGroupLayouts.normalObjectInfo,
            ],
        }),
        vertex: {
            module: shader,
            entryPoint: "vertexShader",
            buffers: [{
                    arrayStride: NormalMesh.vertexSize,
                    attributes: NormalMesh.defaultVertexAttributes,
                }],
        },
        fragment: {
            module: shader,
            entryPoint: "frag",
            targets: [{
                    format: navigator.gpu.getPreferredCanvasFormat(),
                },],
        },
        primitive: primitives,
        depthStencil: depthStencilFormat,
    });
}
const normalCode = /*wgsl*/ `
    struct ObjectInfo{
        transformMatrix:mat4x4f,
        normalMatrix:mat3x3f,
    }
    struct Vertex{
        @location(0) position:vec4f,
        @location(1) normal: vec3f,
        @location(2) color: vec4f,
        @location(3) uv: vec2f,
    }
    struct VSOutput{
        @builtin(position) position:vec4f,
        @location(0) normal: vec3f,
        @location(1) color: vec4f,
    }
    @group(0) @binding(0) var<uniform> camera: mat4x4f;
    @group(1) @binding(0) var<uniform> objectInfo: ObjectInfo;

    @vertex fn vertexShader(vertex:Vertex)->VSOutput{
        var output:VSOutput;
        output.position = camera * objectInfo.transformMatrix * vertex.position;
        output.normal = objectInfo.normalMatrix * vertex.normal;
        output.color = vertex.color;
        return output;
    }

    const lightDirection = vec3f(-1.0,-1.0,-1.0);

    @fragment fn frag(fragIn: VSOutput)->@location(0)vec4f{
        let normal:vec3f = normalize(fragIn.normal);
        let light:f32 = dot(normal, -lightDirection);
        let color:vec3f = (fragIn.color.rgb*light);
        return vec4f(color,fragIn.color.a);
    }
`;

({
    "entries": [{
            binding: 0,
            visibility: GPUShaderStage.VERTEX,
            buffer: {
                "type": "uniform",
            },
        },],
});
const shaderCode = /*wgsl*/ `
    @group(0) @binding(0) var<uniform> camera:mat4x4f;
    @group(1) @binding(0) var<uniform> groundPosition:vec3f;
    @group(1) @binding(1) var<uniform> radius:f32;
    @group(1) @binding(2) var<uniform> color:vec3f;

    struct VSOut{
        @builtin(position)position:vec4f,
        @location(0)alpha:f32,
    }

    @vertex
    fn vertMain(@location(0) vertexPos:vec2f)->VSOut{
        var output:VSOut;
        let pos:vec2f = (vertexPos*radius) + groundPosition.xz;
        output.position = camera*vec4f(pos.x,0,pos.y,1.0);
        output.alpha = f32(!(vertexPos.x==0&&vertexPos.y==0));
        return output;
    }

    @fragment
    fn fragMain(fragIn:VSOut)-> @location(0) vec4f{
        let alpha:f32 = 1.0*pow(fragIn.alpha,10);
        return vec4f(color,alpha);
    }
`;
function createDecalPipeline(device, bindGroupLayouts) {
    const code = device.createShaderModule({
        code: shaderCode,
    });
    return device.createRenderPipeline({
        layout: device.createPipelineLayout({
            "bindGroupLayouts": [bindGroupLayouts.camera, DecalGraphics.getBindGroupLayout(device)],
        }),
        depthStencil: {
            format: "depth24plus",
            depthCompare: "always",
            depthWriteEnabled: true,
        },
        vertex: {
            module: code,
            entryPoint: "vertMain",
            "buffers": [{
                    arrayStride: Float32Array.BYTES_PER_ELEMENT * 2,
                    attributes: [{
                            shaderLocation: 0,
                            offset: 0,
                            format: "float32x2",
                        }],
                }],
        },
        fragment: {
            module: code,
            entryPoint: "fragMain",
            targets: [{
                    format: navigator.gpu.getPreferredCanvasFormat(),
                    blend: {
                        color: {
                            srcFactor: "one",
                            dstFactor: "one-minus-src-alpha",
                        },
                        alpha: {
                            srcFactor: "one",
                            dstFactor: "one-minus-src-alpha",
                        },
                    }
                },],
        },
        primitive: {
            cullMode: `back`,
            topology: `triangle-list`,
        },
    });
}
class DecalGraphics {
    radius;
    parentPos;
    color;
    static numTris = 24;
    static vertexCount = this.numTris * 3;
    static vertexBuffer = undefined;
    static initVertexBuffer(device) {
        this.vertexCount;
        this.vertexBuffer = device.createBuffer({
            label: "Hitbox Decal",
            size: Float32Array.BYTES_PER_ELEMENT * 2 * DecalGraphics.vertexCount,
            usage: GPUBufferUsage.VERTEX,
            mappedAtCreation: true,
        });
        const bufferView = new Float32Array(this.vertexBuffer.getMappedRange());
        const triangleStride = 3 * 2;
        const stepRadians = 2 * Math.PI / (this.numTris);
        for (let i = 0; i < this.numTris; i++) {
            const index = i * triangleStride;
            bufferView[index] = Math.cos(i * stepRadians);
            bufferView[index + 1] = Math.sin(i * stepRadians);
            bufferView[index + 2] = 0;
            bufferView[index + 3] = 0;
            bufferView[index + 4] = Math.cos((i + 1) * stepRadians);
            bufferView[index + 5] = Math.sin((i + 1) * stepRadians);
        }
        /*
        for(let i=0;i<this.vertexCount-1;i++){
            const indexOfx = (i)*2;
            const indexOfz = indexOfx+1;
            const currentRadians = i*stepRadians;
            bufferView[indexOfx]=Math.cos(currentRadians);
            bufferView[indexOfz]=Math.sin(currentRadians);
        }
        */
        this.vertexBuffer.unmap();
        return;
    }
    static getVertexBuffer(device) {
        if (this.vertexBuffer === undefined)
            this.initVertexBuffer(device);
        return this.vertexBuffer;
    }
    static _bindGroupLayout = undefined;
    static getBindGroupLayout(device) {
        if (this._bindGroupLayout === undefined) {
            this._bindGroupLayout = device.createBindGroupLayout({
                "entries": [{
                        "binding": 0,
                        "visibility": GPUShaderStage.VERTEX,
                        "buffer": {
                            "type": "uniform",
                        },
                    }, {
                        "binding": 1,
                        visibility: GPUShaderStage.VERTEX,
                        buffer: {
                            type: "uniform",
                        }
                    }, {
                        "binding": 2,
                        "visibility": GPUShaderStage.FRAGMENT,
                        "buffer": {
                            "type": "uniform",
                        }
                    }]
            });
        }
        return this._bindGroupLayout;
    }
    active = true;
    kind = "decal";
    positionBuffer = undefined;
    sizeBuffer = undefined;
    colorBuffer = undefined;
    bindGroup = undefined;
    constructor(radius, parentPos, color) {
        this.radius = radius;
        this.parentPos = parentPos;
        this.color = color;
    }
    initialize(device, bindGroupLayouts) {
        this.positionBuffer = device.createBuffer({
            label: "Ground Position for Hitbox Decal",
            size: Float32Array.BYTES_PER_ELEMENT * (4),
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            mappedAtCreation: false,
        });
        this.sizeBuffer = device.createBuffer({
            label: "Size for Hitbox Decal",
            size: Float32Array.BYTES_PER_ELEMENT * (2),
            usage: GPUBufferUsage.UNIFORM,
            mappedAtCreation: true,
        });
        new Float32Array(this.sizeBuffer.getMappedRange()).set([this.radius]);
        this.sizeBuffer.unmap();
        this.colorBuffer = device.createBuffer({
            label: "Color Buffer for Hitbox Decal",
            size: Float32Array.BYTES_PER_ELEMENT * (4),
            usage: GPUBufferUsage.UNIFORM,
            mappedAtCreation: true,
        });
        new Float32Array(this.colorBuffer.getMappedRange()).set(this.color);
        this.colorBuffer.unmap();
        this.bindGroup = device.createBindGroup({
            label: "Decal Bind Group",
            layout: DecalGraphics.getBindGroupLayout(device),
            entries: [{
                    binding: 0,
                    resource: { buffer: this.positionBuffer },
                }, {
                    binding: 1,
                    resource: { buffer: this.sizeBuffer },
                }, {
                    binding: 2,
                    resource: { buffer: this.colorBuffer, },
                },],
        });
    }
    writeToBuffers(device) {
        const pos = this.parentPos;
        device.queue.writeBuffer(this.positionBuffer, 0, pos.buffer, pos.byteOffset, pos.byteLength);
    }
    destroy() {
        this.positionBuffer.destroy();
        this.colorBuffer.destroy();
        this.sizeBuffer.destroy();
        return;
    }
}

class Pipelines {
    simple;
    fireball;
    normal;
    decal;
    constructor(device, bindGroupLayouts) {
        this.simple = device.createRenderPipeline({
            layout: device.createPipelineLayout({
                bindGroupLayouts: [
                    bindGroupLayouts.camera,
                    bindGroupLayouts.transform,
                ],
            }),
            vertex: {
                module: device.createShaderModule({
                    code: simpleVertWGSL,
                }),
                buffers: [{
                        arrayStride: SimpleMesh.simpleVertexSize,
                        attributes: [{
                                shaderLocation: 0,
                                offset: SimpleMesh.simplePositionOffset,
                                format: 'float32x4',
                            },
                            {
                                shaderLocation: 1,
                                offset: SimpleMesh.simpleUVOffset,
                                format: 'float32x2',
                            }],
                    }]
            },
            fragment: {
                module: device.createShaderModule({
                    code: simpleFragWGSL,
                }),
                targets: [{
                        format: preferredCanvasFormat$1,
                    },],
            },
            primitive: primitives,
            depthStencil: depthStencilFormat,
        });
        this.fireball = createFireballPipeline(device, bindGroupLayouts);
        this.normal = createNormalPipeline(device, bindGroupLayouts);
        this.decal = createDecalPipeline(device, bindGroupLayouts);
    }
}

class Renderer {
    adapter;
    device;
    initialized;
    canvas;
    context;
    presentationFormat;
    depthTexture;
    renderPassDescriptor;
    bindGroupLayouts;
    pipelines;
    async awaitAdapterDevice() {
        const adapter = await navigator.gpu.requestAdapter();
        const device = await adapter.requestDevice();
        return { adapter, device };
    }
    constructor(canvas) {
        this.canvas = canvas;
        this.context = canvas.getContext('webgpu');
        this.presentationFormat = navigator.gpu.getPreferredCanvasFormat();
        this.initialized = this.awaitAdapterDevice().then((result) => {
            this.adapter = result.adapter;
            this.device = result.device;
            this.bindGroupLayouts = new BindGroupLayouts(this.device);
            this.pipelines = new Pipelines(this.device, this.bindGroupLayouts);
            this.context.configure({
                device: this.device,
                format: this.presentationFormat,
                alphaMode: 'premultiplied'
            });
            this.depthTexture = this.device.createTexture({
                size: [canvas.width, canvas.height],
                format: 'depth24plus',
                usage: GPUTextureUsage.RENDER_ATTACHMENT,
            });
            this.renderPassDescriptor = {
                colorAttachments: [{
                        view: undefined,
                        clearValue: [0.5, 0.5, 0.5, 1.0],
                        loadOp: 'clear',
                        storeOp: 'store',
                    },],
                depthStencilAttachment: {
                    view: this.depthTexture.createView(),
                    depthClearValue: 1.0,
                    depthLoadOp: 'clear',
                    depthStoreOp: 'store',
                },
            };
            return true;
        });
    }
    onResize() {
        this.depthTexture.destroy();
        this.depthTexture = this.device.createTexture({
            size: [this.canvas.width, this.canvas.height],
            format: 'depth24plus',
            usage: GPUTextureUsage.RENDER_ATTACHMENT,
        });
        this.renderPassDescriptor.depthStencilAttachment.view = this.depthTexture.createView();
    }
    render(graphics) {
        while (graphics.initList.length > 0) {
            graphics.initList.pop().initialize(this.device, this.bindGroupLayouts);
        }
        graphics.writeEverything(this.device);
        if (graphics.cameras.length === 0) {
            console.warn("There is no camera in your scene");
            return;
        }
        let camera;
        for (camera of graphics.cameras) {
            if (camera.active)
                break;
        }
        if (this.canvas.width != this.depthTexture.width || this.canvas.height != this.depthTexture.height) {
            this.onResize();
        }
        this.renderPassDescriptor.colorAttachments[0].view = this.context.getCurrentTexture().createView();
        const commandEncoder = this.device.createCommandEncoder();
        {
            const passEncoder = commandEncoder.beginRenderPass(this.renderPassDescriptor);
            passEncoder.setPipeline(this.pipelines.simple);
            passEncoder.setBindGroup(0, camera.bindGroup);
            for (let simple of graphics.simples) {
                if (!simple.active)
                    continue;
                passEncoder.setVertexBuffer(0, simple.vertexBuffer);
                passEncoder.setBindGroup(1, simple.bindGroup);
                passEncoder.draw(simple.mesh.vertexCount);
            }
            passEncoder.setPipeline(this.pipelines.decal);
            passEncoder.setVertexBuffer(0, DecalGraphics.getVertexBuffer(this.device));
            for (const decal of graphics.decals) {
                if (!decal.active)
                    continue;
                if (decal.bindGroup === undefined)
                    decal.initialize(this.device, this.bindGroupLayouts);
                passEncoder.setBindGroup(1, decal.bindGroup);
                passEncoder.draw(DecalGraphics.vertexCount);
            }
            passEncoder.setPipeline(this.pipelines.normal);
            for (let normal of graphics.normals) {
                if (!normal.active)
                    continue;
                if (normal.vertexBuffer === null)
                    normal.initialize(this.device, this.bindGroupLayouts);
                passEncoder.setVertexBuffer(0, normal.vertexBuffer);
                passEncoder.setBindGroup(1, normal.bindGroup);
                passEncoder.draw(normal.vertexCount);
            }
            passEncoder.setPipeline(this.pipelines.fireball);
            for (let fireball of graphics.fireballs) {
                if (!fireball.active)
                    continue;
                if (fireball.vertexBuffer === null)
                    fireball.initialize(this.device, this.bindGroupLayouts);
                passEncoder.setVertexBuffer(0, fireball.vertexBuffer);
                passEncoder.setBindGroup(1, graphics.pointLights[0].bindGroup);
                passEncoder.setBindGroup(2, fireball.bindGroup);
                passEncoder.draw(fireball.mesh.vertexCount);
            }
            passEncoder.end();
        }
        this.device.queue.submit([commandEncoder.finish()]);
    }
}

const sizeOfFloat = 4;
class Entity {
    childStack = null;
    //TODO: turn graphics into an array of GraphicsTypes to support additional decals or vfx per entity.
    graphics = null;
    transformMatrix = new Float32Array([
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1,
    ]);
    right = new Float32Array(this.transformMatrix.buffer, 0 * 4 * sizeOfFloat, 3);
    up = new Float32Array(this.transformMatrix.buffer, 1 * 4 * sizeOfFloat, 3);
    back = new Float32Array(this.transformMatrix.buffer, 2 * 4 * sizeOfFloat, 3);
    position = new Float32Array(this.transformMatrix.buffer, 3 * 4 * sizeOfFloat, 3);
    deleteMe = false;
    constructor(position = vec3Impl.create(0, 0, 0)) {
        mat4Impl.translate(this.transformMatrix, position, this.transformMatrix);
    }
    destructor(controls, systems) {
        return;
    }
    update(deltaTime) {
        return;
    }
    attachControls(controls) {
        return;
    }
    registerSystems(systems) {
        return;
    }
}

class GraphicsOrganizer {
    //dynamics
    cameras = [];
    simples = [];
    fireballs = [];
    normals = [];
    decals = [];
    pointLights = [];
    initList = [];
    register(graphicsComponent) {
        if (graphicsComponent === null) {
            return;
        }
        if (Array.isArray(graphicsComponent)) {
            //this could be a recursive test, but it would repeat the null check and the isarray check.
            for (const gc of graphicsComponent) {
                this.register(gc);
            }
            return;
        }
        this.initList.push(graphicsComponent);
        switch (graphicsComponent.kind) {
            case "camera":
                this.cameras.push(graphicsComponent);
                break;
            case "simple":
                this.simples.push(graphicsComponent);
                break;
            case "fireball":
                this.fireballs.push(graphicsComponent);
                break;
            case "normal":
                this.normals.push(graphicsComponent);
                break;
            case "decal":
                this.decals.push(graphicsComponent);
                break;
            case "PointLight":
                this.pointLights.push(graphicsComponent);
                break;
        }
        return;
    }
    writeEverything(device) {
        for (let graphics of this.cameras) {
            if (!graphics.active)
                continue;
            graphics.writeToBuffers(device);
        }
        for (let graphics of this.simples) {
            if (!graphics.active)
                continue;
            graphics.writeToBuffers(device);
        }
        for (let graphics of this.fireballs) {
            if (!graphics.active)
                continue;
            graphics.writeToBuffers(device);
        }
        for (let graphics of this.normals) {
            if (!graphics.active)
                continue;
            graphics.writeToBuffers(device);
        }
        for (let graphics of this.decals) {
            if (!graphics.active)
                continue;
            graphics.writeToBuffers(device);
        }
        for (let graphics of this.pointLights) {
            if (!graphics.active)
                continue;
            graphics.writeToBuffers(device);
        }
    }
    /*
    This code assumes that each graphics component is only inserted once and deletes the first instance.
    Entities that decide to share a graphics component wouldn't function properly at time of writing.
    Lazy deletion is possible if splice() is too expensive. Null checks must be added in the renderer to support.
    */
    removeFrom(bucket, graphicsComponent) {
        if (bucket.length === 0) {
            console.warn("Tried to remove graphics element from empty bucket");
            return;
        }
        const index = bucket.indexOf(graphicsComponent);
        if (index === -1) {
            console.warn("Did not find graphics component to delete");
            return;
        }
        bucket[index].destroy();
        bucket.splice(index, 1);
        return;
    }
    remove(graphicsComponent) {
        if (graphicsComponent === null) {
            return;
        }
        if (Array.isArray(graphicsComponent)) {
            //this could be a recursive test, but it would repeat the null check and the isarray check.
            for (const gc of graphicsComponent) {
                this.remove(gc);
            }
            return;
        }
        switch (graphicsComponent.kind) {
            case "camera":
                this.removeFrom(this.cameras, graphicsComponent);
                break;
            case "simple":
                this.removeFrom(this.simples, graphicsComponent);
                break;
            case "fireball":
                this.removeFrom(this.fireballs, graphicsComponent);
                break;
            case "normal":
                this.removeFrom(this.normals, graphicsComponent);
                break;
            case "decal":
                this.removeFrom(this.decals, graphicsComponent);
                break;
            case "PointLight":
                this.removeFrom(this.pointLights, graphicsComponent);
                break;
        }
    }
}
/*
graphics are collections of buffers and their associated bind groups

data layout is specific to each bindgroup.

Some of their bind groups will fit into some of the pipelines.
The renderer controls which bind groups are relevant and when and how they are set.

TODO: Reduce number of writes to the buffers using a dirty flag or only call writetobuffers as needed
*/
class SimpleGraphics {
    active = true;
    kind = "simple";
    label;
    mesh;
    vertexBuffer = undefined;
    transformBuffer = undefined;
    bindGroup = undefined;
    parentData;
    constructor(mesh, transformData, label = "") {
        this.mesh = mesh;
        this.parentData = transformData;
        this.label = label;
    }
    initialize(device, bindGroupLayouts) {
        this.vertexBuffer = device.createBuffer({
            label: "Vertex Buffer for " + this.label,
            size: this.mesh.vertexArray.byteLength,
            usage: GPUBufferUsage.VERTEX,
            mappedAtCreation: true,
        });
        new Float32Array(this.vertexBuffer.getMappedRange()).set(this.mesh.vertexArray);
        this.vertexBuffer.unmap();
        this.transformBuffer = device.createBuffer({
            label: "Transform Buffer for " + this.label,
            size: 4 * 4 * Float32Array.BYTES_PER_ELEMENT,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            mappedAtCreation: false,
        });
        this.bindGroup = device.createBindGroup({
            label: "Bindgroup for " + this.label,
            layout: bindGroupLayouts.transform,
            entries: [{
                    binding: 0,
                    resource: {
                        buffer: this.transformBuffer,
                    },
                },],
        });
    }
    writeToBuffers(device) {
        if (this.transformBuffer === undefined)
            return;
        if (this.parentData === undefined)
            return;
        device.queue.writeBuffer(this.transformBuffer, 0, this.parentData.buffer, this.parentData.byteOffset, this.parentData.byteLength);
    }
    destroy() {
        if (this.vertexBuffer !== undefined) {
            this.vertexBuffer.destroy();
        }
        if (this.transformBuffer !== undefined) {
            this.transformBuffer.destroy();
        }
        this.vertexBuffer = undefined;
        this.transformBuffer = undefined;
        this.bindGroup = undefined;
        this.parentData = undefined;
    }
}
class CameraGraphics {
    parentPosition;
    active = true;
    kind = "camera";
    buffer;
    bindGroup;
    parentCameraMatrix;
    constructor(cameraMatrix, parentPosition) {
        this.parentPosition = parentPosition;
        this.parentCameraMatrix = cameraMatrix;
    }
    initialize(device, bindGroupLayouts) {
        this.buffer = device.createBuffer({
            size: 4 * 4 * Float32Array.BYTES_PER_ELEMENT + (Float32Array.BYTES_PER_ELEMENT * 4),
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            mappedAtCreation: false,
        });
        this.bindGroup = device.createBindGroup({
            label: "Camera Bind Group",
            layout: bindGroupLayouts.camera,
            entries: [{
                    binding: 0,
                    resource: {
                        buffer: this.buffer,
                    },
                }],
        });
    }
    writeToBuffers(device) {
        device.queue.writeBuffer(this.buffer, 0, this.parentCameraMatrix.buffer, this.parentCameraMatrix.byteOffset, this.parentCameraMatrix.byteLength);
        const position = this.parentPosition;
        device.queue.writeBuffer(this.buffer, this.parentCameraMatrix.byteLength, position.buffer, position.byteOffset, position.byteLength);
    }
    destroy() {
        this.buffer.destroy();
        this.buffer = undefined;
        this.bindGroup = undefined;
        this.parentCameraMatrix = undefined;
    }
}
class FireballGraphics {
    mesh;
    label;
    kind = "fireball";
    active = true;
    transformNormalBuffer;
    colorBuffer;
    bindGroup;
    vertexBuffer;
    transformData;
    colorData;
    normal;
    numFloats;
    stagingArray;
    constructor(mesh, transform, color, label = "") {
        this.mesh = mesh;
        this.label = label;
        this.transformData = transform;
        this.colorData = color;
        this.normal = mat3Impl.create();
        this.numFloats = transform.length + this.normal.length;
        this.stagingArray = new Float32Array(this.numFloats);
    }
    initialize(device, bindGroupLayouts) {
        //if you use the singleton buffer don't destroy it.
        this.vertexBuffer = this.mesh.getVertexBuffer(device);
        this.transformNormalBuffer = device.createBuffer({
            label: "Transform & Normal Buffer for " + this.label,
            size: this.numFloats * Float32Array.BYTES_PER_ELEMENT,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            mappedAtCreation: false,
        });
        this.colorBuffer = device.createBuffer({
            label: "Color Buffer for " + this.label,
            size: 4 * Float32Array.BYTES_PER_ELEMENT,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            mappedAtCreation: false,
        });
        this.bindGroup = device.createBindGroup({
            label: "Fireball Bindgroup for " + this.label,
            layout: bindGroupLayouts.fireball,
            entries: [{
                    binding: 0,
                    resource: {
                        buffer: this.transformNormalBuffer,
                    },
                },
                {
                    binding: 1,
                    resource: {
                        buffer: this.colorBuffer,
                    },
                },
            ],
        });
    }
    writeToBuffers(device) {
        device.queue.writeBuffer(this.transformNormalBuffer, 0, this.transformData.buffer, this.transformData.byteOffset, this.transformData.byteLength);
        mat3Impl.fromMat4(mat4Impl.transpose(mat4Impl.inverse(this.transformData)), this.normal);
        const normalArray = this.normal;
        device.queue.writeBuffer(this.transformNormalBuffer, this.transformData.byteLength, normalArray.buffer, normalArray.byteOffset, normalArray.byteLength);
        device.queue.writeBuffer(this.colorBuffer, 0, this.colorData.buffer, this.colorData.byteOffset, this.colorData.byteLength);
    }
    destroy() {
        this.transformNormalBuffer.destroy();
        this.colorBuffer.destroy();
        this.bindGroup = null;
        this.active = false;
    }
}
class NormalGraphics {
    mesh;
    label;
    kind = "normal";
    active = true;
    vertexBuffer = null;
    uniformBuffer;
    bindGroup;
    vertexCount = undefined;
    transformMatrix;
    normalMatrix;
    numFloats;
    stagingArray;
    constructor(mesh, transform, label = "Normal graphics") {
        this.mesh = mesh;
        this.label = label;
        this.transformMatrix = transform;
        this.normalMatrix = mat3Impl.create();
        this.numFloats = this.transformMatrix.length + this.normalMatrix.length;
        this.stagingArray = new Float32Array(this.numFloats);
    }
    initialize(device, bindGroupLayouts) {
        this.vertexBuffer = this.mesh.getVertexBuffer(device);
        this.vertexCount = this.mesh.vertexCount;
        this.uniformBuffer = device.createBuffer({
            label: "Transform and Normal Matrix Buffer for " + this.label,
            size: this.numFloats * Float32Array.BYTES_PER_ELEMENT,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            mappedAtCreation: false,
        });
        this.bindGroup = device.createBindGroup({
            label: "Normal bindgroup for " + this.label,
            layout: bindGroupLayouts.normalObjectInfo,
            entries: [{
                    binding: 0,
                    resource: {
                        buffer: this.uniformBuffer,
                    },
                },],
        });
    }
    destroy() {
        this.uniformBuffer.destroy();
        this.bindGroup = null;
        this.active = false;
    }
    writeToBuffers(device) {
        const transform = this.transformMatrix;
        mat3Impl.fromMat4(mat4Impl.transpose(mat4Impl.inverse(this.transformMatrix)), this.normalMatrix);
        const normal = this.normalMatrix;
        this.stagingArray.set(transform);
        this.stagingArray.set(normal, transform.length);
        device.queue.writeBuffer(this.uniformBuffer, 0, this.stagingArray.buffer, this.stagingArray.byteOffset, this.stagingArray.byteLength);
    }
}
class PointLightPosition {
    position;
    offset;
    kind = "PointLight";
    active = true;
    posBuffer;
    bindGroup;
    resultingPosition = vec3Impl.create();
    constructor(position, offset) {
        this.position = position;
        this.offset = offset;
    }
    initialize(device, bindGroupLayouts) {
        this.posBuffer = device.createBuffer({
            'size': this.position.byteLength,
            'usage': GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
        this.bindGroup = device.createBindGroup({
            'layout': bindGroupLayouts.light,
            entries: [{
                    'binding': 0,
                    'resource': {
                        'buffer': this.posBuffer,
                    },
                }]
        });
    }
    destroy() {
        this.posBuffer.destroy();
        return;
    }
    writeToBuffers(device) {
        vec3Impl.add(this.position, this.offset, this.resultingPosition);
        const pos = this.resultingPosition;
        device.queue.writeBuffer(this.posBuffer, 0, pos.buffer, pos.byteOffset, pos.byteLength);
        return;
    }
}

class Camera extends Entity {
    //renderer stuff
    buffer;
    bindGroup;
    //perspective information
    aspect;
    projection;
    fieldOfView = 1;
    view = mat4Impl.invert(this.transformMatrix);
    viewProjectionMatrix = mat4Impl.create();
    constructor(canvas) {
        super();
        this.aspect = canvas.width / canvas.height;
        this.projection = mat4Impl.perspective(this.fieldOfView, this.aspect, 1, 100);
        this.graphics = new CameraGraphics(this.viewProjectionMatrix, this.position);
    }
    setAspect(aspect) {
        this.aspect = aspect;
        this.projection = mat4Impl.perspective(this.fieldOfView, this.aspect, 1, 100);
        mat4Impl.invert(this.transformMatrix, this.view);
        mat4Impl.multiply(this.projection, this.view, this.viewProjectionMatrix);
    }
    destructor(controls, systems) {
    }
}
class TopCamera extends Camera {
    distance;
    //movement directions
    planeUp;
    planeRight;
    movementSpeed = 50;
    velocity = vec3Impl.fromValues(0, 0, 0);
    //Zoom limits
    maxFOV = this.fieldOfView;
    minFOV = this.maxFOV / 20;
    targetVelocity = vec3Impl.fromValues(0, 0, 0);
    worldPosition = vec3Impl.fromValues(0, 0, 0);
    constructor(canvas, distance = 50) {
        super(canvas);
        this.distance = distance;
        //mat4.cameraAim(vec3.fromValues(0,5,0),vec3.fromValues(0,0,0),vec3.fromValues(1,0,0),this.matrix);
        //mat4.cameraAim(vec3.fromValues(-2.5,5,-2.5),vec3.fromValues(0,0,0),vec3.fromValues(1,0,1),this.transformMatrix);
        mat4Impl.rotateX(mat4Impl.rotationY(Math.PI / 4), -1, this.transformMatrix);
        this.planeUp = vec3Impl.copy(this.up);
        this.planeUp[1] = 0;
        vec3Impl.normalize(this.planeUp, this.planeUp);
        this.planeRight = vec3Impl.copy(this.right);
        this.planeRight[1] = 0;
        vec3Impl.normalize(this.planeRight, this.planeRight);
        vec3Impl.addScaled(this.position, this.back, distance, this.position);
    }
    receiveInput(up, down, left, right) {
        const deltaRight = (+right) - (+left);
        const deltaUp = (+up) - (+down);
        vec3Impl.set(0, 0, 0, this.targetVelocity);
        vec3Impl.addScaled(this.targetVelocity, this.planeUp, deltaUp, this.targetVelocity);
        vec3Impl.addScaled(this.targetVelocity, this.planeRight, deltaRight, this.targetVelocity);
        vec3Impl.normalize(this.targetVelocity, this.targetVelocity);
        vec3Impl.mulScalar(this.targetVelocity, this.movementSpeed, this.targetVelocity);
    }
    //TODO: Make zooming smoother over time.
    zoom(amount) {
        this.fieldOfView *= 1 + (0.1 * amount);
        this.fieldOfView = Math.min(this.fieldOfView, this.maxFOV);
        this.fieldOfView = Math.max(this.fieldOfView, this.minFOV);
        mat4Impl.perspective(this.fieldOfView, this.aspect, 1, 100.0, this.projection);
    }
    returnToWorld(point) {
        vec3Impl.copy(point, this.worldPosition);
        vec3Impl.copy(point, this.position);
        vec3Impl.addScaled(this.position, this.back, this.distance, this.position);
        mat4Impl.invert(this.transformMatrix, this.view);
        mat4Impl.multiply(this.projection, this.view, this.viewProjectionMatrix);
    }
    update(deltaTime) {
        vec3Impl.copy(this.targetVelocity, this.velocity);
        vec3Impl.addScaled(this.position, this.velocity, deltaTime, this.position);
        vec3Impl.addScaled(this.worldPosition, this.velocity, deltaTime, this.worldPosition);
        mat4Impl.invert(this.transformMatrix, this.view);
        mat4Impl.multiply(this.projection, this.view, this.viewProjectionMatrix);
    }
    attachControls(controls) {
        controls.cameraControls.register(this);
    }
    registerSystems(systems) {
        systems.clampToWorld.register(this);
    }
    destructor(controls, systems) {
        controls.cameraControls.remove(this);
        systems.clampToWorld.remove(this);
    }
}

const floorVertexCount = 6;
// prettier-ignore
const floorVertexArray = new Float32Array([
    // float4 position, float4 color, float2 uv,
    1, 0, 1, 1, 0, 1, 0, 1, 1, 0,
    -1, 0, -1, 1, 0, 1, 0, 1, 0, 1,
    -1, 0, 1, 1, 0, 1, 0, 1, 0, 0,
    1, 0, 1, 1, 0, 1, 0, 1, 1, 0,
    1, 0, -1, 1, 0, 1, 0, 1, 1, 1,
    -1, 0, -1, 1, 0, 1, 0, 1, 0, 1,
]);
class FloorMesh extends SimpleMesh {
    constructor() {
        super(floorVertexCount, floorVertexArray);
    }
}

var Coords$1;
(function (Coords) {
    Coords[Coords["x"] = 0] = "x";
    Coords[Coords["y"] = 1] = "y";
    Coords[Coords["z"] = 2] = "z";
})(Coords$1 || (Coords$1 = {}));
class Floor extends Entity {
    _size;
    get size() {
        return this._size;
    }
    get length() {
        return this._size;
    }
    get width() {
        return this._size;
    }
    constructor(size) {
        super();
        this._size = size;
        this.graphics = new SimpleGraphics(new FloorMesh(), this.transformMatrix);
        mat4Impl.scale(this.transformMatrix, vec3Impl.fromValues(this._size / 2, 0, this._size / 2), this.transformMatrix);
    }
    get height() {
        return this.position[1];
    }
    contains(point) {
        const distX = Math.abs(this.position[0] - point[0]);
        const distZ = Math.abs(this.position[2] - point[2]);
        //this doesn't check the height. Make a different function if you need stricter checks.
        return (distX < this.length / 2 && distZ < this.width / 2);
    }
    getClosestValidPoint(point, dst) {
        const result = dst ?? vec3Impl.create();
        vec3Impl.copy(point, result);
        result[0] = this.clampToHalfSize(result[0]);
        result[2] = this.clampToHalfSize(result[2]);
        return result;
    }
    clampToHalfSize(x) {
        const max = this._size / 2;
        const min = -max;
        return Math.max(Math.min(x, max), min);
    }
}

const cubeVertexCount = 36;
// prettier-ignore
const cubeVertexArray = new Float32Array([
    // float4 position, float4 color, float2 uv,
    1, -1, 1, 1, 1, 0, 1, 1, 0, 1,
    -1, -1, 1, 1, 0, 0, 1, 1, 1, 1,
    -1, -1, -1, 1, 0, 0, 0, 1, 1, 0,
    1, -1, -1, 1, 1, 0, 0, 1, 0, 0,
    1, -1, 1, 1, 1, 0, 1, 1, 0, 1,
    -1, -1, -1, 1, 0, 0, 0, 1, 1, 0,
    1, 1, 1, 1, 1, 1, 1, 1, 0, 1,
    1, -1, 1, 1, 1, 0, 1, 1, 1, 1,
    1, -1, -1, 1, 1, 0, 0, 1, 1, 0,
    1, 1, -1, 1, 1, 1, 0, 1, 0, 0,
    1, 1, 1, 1, 1, 1, 1, 1, 0, 1,
    1, -1, -1, 1, 1, 0, 0, 1, 1, 0,
    -1, 1, 1, 1, 0, 1, 1, 1, 0, 1,
    1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
    1, 1, -1, 1, 1, 1, 0, 1, 1, 0,
    -1, 1, -1, 1, 0, 1, 0, 1, 0, 0,
    -1, 1, 1, 1, 0, 1, 1, 1, 0, 1,
    1, 1, -1, 1, 1, 1, 0, 1, 1, 0,
    -1, -1, 1, 1, 0, 0, 1, 1, 0, 1,
    -1, 1, 1, 1, 0, 1, 1, 1, 1, 1,
    -1, 1, -1, 1, 0, 1, 0, 1, 1, 0,
    -1, -1, -1, 1, 0, 0, 0, 1, 0, 0,
    -1, -1, 1, 1, 0, 0, 1, 1, 0, 1,
    -1, 1, -1, 1, 0, 1, 0, 1, 1, 0,
    1, 1, 1, 1, 1, 1, 1, 1, 0, 1,
    -1, 1, 1, 1, 0, 1, 1, 1, 1, 1,
    -1, -1, 1, 1, 0, 0, 1, 1, 1, 0,
    -1, -1, 1, 1, 0, 0, 1, 1, 1, 0,
    1, -1, 1, 1, 1, 0, 1, 1, 0, 0,
    1, 1, 1, 1, 1, 1, 1, 1, 0, 1,
    1, -1, -1, 1, 1, 0, 0, 1, 0, 1,
    -1, -1, -1, 1, 0, 0, 0, 1, 1, 1,
    -1, 1, -1, 1, 0, 1, 0, 1, 1, 0,
    1, 1, -1, 1, 1, 1, 0, 1, 0, 0,
    1, -1, -1, 1, 1, 0, 0, 1, 0, 1,
    -1, 1, -1, 1, 0, 1, 0, 1, 1, 0,
]);
class SimpleCube extends SimpleMesh {
    constructor() {
        super(cubeVertexCount, cubeVertexArray);
    }
}

const arrowPLY = `
ply
format ascii 1.0
comment Created in Blender version 4.1.1
element vertex 51
property float x
property float y
property float z
property uchar red
property uchar green
property uchar blue
property uchar alpha
property float s
property float t
element face 32
property list uchar uint vertex_indices
end_header
0.24253562 0.25000012 -0.6053221 0 147 199 255 1 0
0.55746436 5.9604645e-08 -0.68405426 0 147 199 255 0 1
0.24253565 5.9604645e-08 -0.6053221 0 147 199 255 0 0
-6.0109393e-09 0.5000001 0.58216614 0 147 199 255 0 0
6.284031e-10 0.5000001 -0.28699413 0 147 199 255 1 1
-0.3862934 0.5000001 -0.38356748 0 147 199 255 0 1
-0.24253565 0.25000012 -0.6053221 0 147 199 255 1 0
-0.55746436 5.9604645e-08 -0.68405426 0 147 199 255 0 1
-0.55746436 0.25000012 -0.68405426 0 147 199 255 0 0
-1.4038122e-08 0.25000012 1.2553118 0 147 199 255 1 0
-0.7071523 5.9604645e-08 -0.51256895 0 147 199 255 0 1
-1.4038122e-08 5.9604645e-08 1.2553118 0 147 199 255 0 0
0.70715237 5.9604645e-08 -0.51256895 0 147 199 255 0.89091575 0.81174487
-0.7071523 5.9604645e-08 -0.51256895 0 147 199 255 0.71694183 0.049515545
-0.24253562 5.9604645e-08 -0.6053221 0 147 199 255 0.012535989 0.38873973
0.55746436 0.25000012 -0.68405426 0 147 199 255 0 0
0.3862934 0.5000001 -0.38356748 0 147 199 255 1 0
0.7071523 0.25000012 -0.51256895 0 147 199 255 1 1
-0.3862934 0.5000001 -0.38356748 0 147 199 255 0 0
-0.55746436 0.25000012 -0.68405426 0 147 199 255 1 0
-0.70715237 0.25000012 -0.51256895 0 147 199 255 1 1
0.24253562 0.25000012 -0.6053221 0 147 199 255 0 0
0.24253562 0.25000012 -0.6053221 0 147 199 255 0 1
6.284031e-10 0.5000001 -0.28699413 0 147 199 255 0 0
-6.0109393e-09 0.5000001 0.58216614 0 147 199 255 1 0
0.7071523 0.25000012 -0.51256895 0 147 199 255 0 1
0.3862934 0.5000001 -0.38356748 0 147 199 255 0 0
-1.4038122e-08 0.25000012 1.2553118 0 147 199 255 0 1
-0.70715237 0.25000012 -0.51256895 0 147 199 255 1 0
-0.7071523 5.9604645e-08 -0.51256895 0 147 199 255 0 0
0.70715237 5.9604645e-08 -0.51256895 0 147 199 255 1 0
0.55746436 0.25000012 -0.68405426 0 147 199 255 0 1
0.7071523 0.25000012 -0.51256895 0 147 199 255 0 0
-0.24253565 0.25000012 -0.6053221 0 147 199 255 1 1
-0.55746436 0.25000012 -0.68405426 0 147 199 255 0 1
0.24253565 5.9604645e-08 -0.6053221 0 147 199 255 1 0
-0.24253565 0.25000012 -0.6053221 0 147 199 255 0 1
0.7071523 0.25000012 -0.51256895 0 147 199 255 1 0
-1.4038122e-08 5.9604645e-08 1.2553118 0 147 199 255 0 1
0.70715237 5.9604645e-08 -0.51256895 0 147 199 255 0 0
0.55746436 0.25000012 -0.68405426 0 147 199 255 1 1
-0.24253562 5.9604645e-08 -0.6053221 0 147 199 255 1 1
0.24253565 5.9604645e-08 -0.6053221 0 147 199 255 0.10908434 0.81174505
0.55746436 5.9604645e-08 -0.68405426 0 147 199 255 0.5 1
-1.4038122e-08 5.9604645e-08 1.2553118 0 147 199 255 0.98746395 0.38873947
-0.55746436 5.9604645e-08 -0.68405426 0 147 199 255 0.283058 0.049515635
-1.4038122e-08 0.25000012 1.2553118 0 147 199 255 1 1
-0.3862934 0.5000001 -0.38356748 0 147 199 255 1 0
-0.55746436 0.25000012 -0.68405426 0 147 199 255 1 1
0.55746436 5.9604645e-08 -0.68405426 0 147 199 255 1 1
6.284031e-10 0.5000001 -0.28699413 0 147 199 255 1 0
3 0 1 2
3 3 4 5
3 6 7 8
3 9 10 11
3 12 13 14
3 15 16 17
3 18 19 20
3 21 6 4
3 16 22 23
3 24 25 26
3 3 20 27
3 28 7 29
3 30 31 32
3 18 33 34
3 35 36 21
3 37 38 39
3 0 40 1
3 3 16 4
3 6 41 7
3 9 20 10
3 42 43 12
3 12 44 13
3 13 45 14
3 14 42 12
3 16 40 22
3 24 46 25
3 3 47 20
3 28 48 7
3 30 49 31
3 18 50 33
3 35 41 36
3 37 46 38
`;
class ArrowMesh extends NormalMesh {
    static vertexBuffer = undefined;
    static vertexCount = undefined;
    static initValues(device) {
        const meshData = NormalMesh.createVertexBuffer(device, arrowPLY, "Vertex buffer for arrow");
        this.vertexBuffer = meshData.vertexBuffer;
        this.vertexCount = meshData.vertexCount;
    }
    getVertexBuffer(device) {
        if (ArrowMesh.vertexBuffer === undefined) {
            ArrowMesh.initValues(device);
        }
        return ArrowMesh.vertexBuffer;
    }
    get vertexCount() {
        if (ArrowMesh.vertexBuffer === undefined) {
            console.error("Tried to get arrowmesh vertexcount before initialization");
            return 0;
        }
        return ArrowMesh.vertexCount;
    }
}

const glassCubePLY = `
ply
format ascii 1.0
comment Created in Blender version 4.2.1 LTS
element vertex 216
property float x
property float y
property float z
element face 428
property list uchar uint vertex_indices
end_header
-0.64644665 0.35806555 1
-0.35806555 0.64644665 1
-0.64644665 0.73756814 0.9622563
-0.73756814 0.64644665 0.9622563
-0.35806555 1 0.64644665
-0.64644665 1 0.35806555
-0.73756814 0.9622563 0.64644665
-0.64644665 0.9622563 0.73756814
-1 0.64644665 0.35806555
-1 0.35806555 0.64644665
-0.9622563 0.64644665 0.73756814
-0.9622563 0.73756814 0.64644665
5.9604645e-08 0.8964467 0.8964467
-0.6464467 0.9248757 0.82781297
-0.75025547 0.87311625 0.87311625
-0.6464467 0.82781297 0.9248757
-0.8706538 0.8706538 0.76121193
-0.8706538 0.76121193 0.8706538
-0.76121193 0.8706538 0.8706538
-0.8964467 0.8964467 -5.9604645e-08
-0.9248757 0.82781297 0.6464467
-0.87311625 0.87311625 0.75025547
-0.82781297 0.9248757 0.6464467
-0.82781297 0.6464467 0.9248757
-0.87311625 0.75025547 0.87311625
-0.9248757 0.6464467 0.82781297
-0.8964467 -5.9604645e-08 0.8964467
-0.64644665 -1 0.35806555
-0.35806555 -1 0.64644665
-0.64644665 -0.9622563 0.73756814
-0.73756814 -0.9622563 0.64644665
-0.35806555 -0.64644665 1
-0.64644665 -0.35806555 1
-0.73756814 -0.64644665 0.9622563
-0.64644665 -0.73756814 0.9622563
-1 -0.35806555 0.64644665
-1 -0.64644665 0.35806555
-0.9622563 -0.73756814 0.64644665
-0.9622563 -0.64644665 0.73756814
5.9604645e-08 -0.8964467 0.8964467
-0.6464467 -0.82781297 0.9248757
-0.75025547 -0.87311625 0.87311625
-0.6464467 -0.9248757 0.82781297
-0.8706538 -0.76121193 0.8706538
-0.8706538 -0.8706538 0.76121193
-0.76121193 -0.8706538 0.8706538
-0.8964467 5.9604645e-08 0.8964467
-0.9248757 -0.6464467 0.82781297
-0.87311625 -0.75025547 0.87311625
-0.82781297 -0.6464467 0.9248757
-0.82781297 -0.9248757 0.6464467
-0.87311625 -0.87311625 0.75025547
-0.9248757 -0.82781297 0.6464467
-0.8964467 -0.8964467 -5.9604645e-08
-1 0.35806555 -0.64644665
-1 0.64644665 -0.35806555
-0.9622563 0.73756814 -0.64644665
-0.9622563 0.64644665 -0.73756814
-0.64644665 1 -0.35806555
-0.35806555 1 -0.64644665
-0.64644665 0.9622563 -0.73756814
-0.73756814 0.9622563 -0.64644665
-0.35806555 0.64644665 -1
-0.64644665 0.35806555 -1
-0.73756814 0.64644665 -0.9622563
-0.64644665 0.73756814 -0.9622563
-0.8964467 0.8964467 5.9604645e-08
-0.82781297 0.9248757 -0.6464467
-0.87311625 0.87311625 -0.75025547
-0.9248757 0.82781297 -0.6464467
-0.76121193 0.8706538 -0.8706538
-0.8706538 0.76121193 -0.8706538
-0.8706538 0.8706538 -0.76121193
5.9604645e-08 0.8964467 -0.8964467
-0.6464467 0.82781297 -0.9248757
-0.75025547 0.87311625 -0.87311625
-0.6464467 0.9248757 -0.82781297
-0.9248757 0.6464467 -0.82781297
-0.87311625 0.75025547 -0.87311625
-0.82781297 0.6464467 -0.9248757
-0.8964467 -5.9604645e-08 -0.8964467
-1 -0.64644665 -0.35806555
-1 -0.35806555 -0.64644665
-0.9622563 -0.64644665 -0.73756814
-0.9622563 -0.73756814 -0.64644665
-0.64644665 -0.35806555 -1
-0.35806555 -0.64644665 -1
-0.64644665 -0.73756814 -0.9622563
-0.73756814 -0.64644665 -0.9622563
-0.35806555 -1 -0.64644665
-0.64644665 -1 -0.35806555
-0.73756814 -0.9622563 -0.64644665
-0.64644665 -0.9622563 -0.73756814
-0.8964467 5.9604645e-08 -0.8964467
-0.82781297 -0.6464467 -0.9248757
-0.87311625 -0.75025547 -0.87311625
-0.9248757 -0.6464467 -0.82781297
-0.76121193 -0.8706538 -0.8706538
-0.8706538 -0.8706538 -0.76121193
-0.8706538 -0.76121193 -0.8706538
5.9604645e-08 -0.8964467 -0.8964467
-0.6464467 -0.9248757 -0.82781297
-0.75025547 -0.87311625 -0.87311625
-0.6464467 -0.82781297 -0.9248757
-0.9248757 -0.82781297 -0.6464467
-0.87311625 -0.87311625 -0.75025547
-0.82781297 -0.9248757 -0.6464467
-0.8964467 -0.8964467 5.9604645e-08
0.35806555 0.64644665 1
0.64644665 0.35806555 1
0.73756814 0.64644665 0.9622563
0.64644665 0.73756814 0.9622563
1 0.35806555 0.64644665
1 0.64644665 0.35806555
0.9622563 0.73756814 0.64644665
0.9622563 0.64644665 0.73756814
0.64644665 1 0.35806555
0.35806555 1 0.64644665
0.64644665 0.9622563 0.73756814
0.73756814 0.9622563 0.64644665
0.8964467 -5.9604645e-08 0.8964467
0.9248757 0.6464467 0.82781297
0.87311625 0.75025547 0.87311625
0.82781297 0.6464467 0.9248757
0.8706538 0.8706538 0.76121193
0.76121193 0.8706538 0.8706538
0.8706538 0.76121193 0.8706538
0.8964467 0.8964467 -5.9604645e-08
0.82781297 0.9248757 0.6464467
0.87311625 0.87311625 0.75025547
0.9248757 0.82781297 0.6464467
0.6464467 0.82781297 0.9248757
0.75025547 0.87311625 0.87311625
0.6464467 0.9248757 0.82781297
-5.9604645e-08 0.8964467 0.8964467
1 -0.64644665 0.35806555
1 -0.35806555 0.64644665
0.9622563 -0.64644665 0.73756814
0.9622563 -0.73756814 0.64644665
0.64644665 -0.35806555 1
0.35806555 -0.64644665 1
0.64644665 -0.73756814 0.9622563
0.73756814 -0.64644665 0.9622563
0.35806555 -1 0.64644665
0.64644665 -1 0.35806555
0.73756814 -0.9622563 0.64644665
0.64644665 -0.9622563 0.73756814
0.8964467 5.9604645e-08 0.8964467
0.82781297 -0.6464467 0.9248757
0.87311625 -0.75025547 0.87311625
0.9248757 -0.6464467 0.82781297
0.76121193 -0.8706538 0.8706538
0.8706538 -0.8706538 0.76121193
0.8706538 -0.76121193 0.8706538
-5.9604645e-08 -0.8964467 0.8964467
0.6464467 -0.9248757 0.82781297
0.75025547 -0.87311625 0.87311625
0.6464467 -0.82781297 0.9248757
0.9248757 -0.82781297 0.6464467
0.87311625 -0.87311625 0.75025547
0.82781297 -0.9248757 0.6464467
0.8964467 -0.8964467 -5.9604645e-08
1 0.64644665 -0.35806555
1 0.35806555 -0.64644665
0.9622563 0.64644665 -0.73756814
0.9622563 0.73756814 -0.64644665
0.64644665 0.35806555 -1
0.35806555 0.64644665 -1
0.64644665 0.73756814 -0.9622563
0.73756814 0.64644665 -0.9622563
0.35806555 1 -0.64644665
0.64644665 1 -0.35806555
0.73756814 0.9622563 -0.64644665
0.64644665 0.9622563 -0.73756814
0.8964467 -5.9604645e-08 -0.8964467
0.82781297 0.6464467 -0.9248757
0.87311625 0.75025547 -0.87311625
0.9248757 0.6464467 -0.82781297
0.76121193 0.8706538 -0.8706538
0.8706538 0.8706538 -0.76121193
0.8706538 0.76121193 -0.8706538
-5.9604645e-08 0.8964467 -0.8964467
0.6464467 0.9248757 -0.82781297
0.75025547 0.87311625 -0.87311625
0.6464467 0.82781297 -0.9248757
0.9248757 0.82781297 -0.6464467
0.87311625 0.87311625 -0.75025547
0.82781297 0.9248757 -0.6464467
0.8964467 0.8964467 5.9604645e-08
0.64644665 -1 -0.35806555
0.35806555 -1 -0.64644665
0.64644665 -0.9622563 -0.73756814
0.73756814 -0.9622563 -0.64644665
0.35806555 -0.64644665 -1
0.64644665 -0.35806555 -1
0.73756814 -0.64644665 -0.9622563
0.64644665 -0.73756814 -0.9622563
1 -0.35806555 -0.64644665
1 -0.64644665 -0.35806555
0.9622563 -0.73756814 -0.64644665
0.9622563 -0.64644665 -0.73756814
-5.9604645e-08 -0.8964467 -0.8964467
0.6464467 -0.82781297 -0.9248757
0.75025547 -0.87311625 -0.87311625
0.6464467 -0.9248757 -0.82781297
0.8706538 -0.76121193 -0.8706538
0.8706538 -0.8706538 -0.76121193
0.76121193 -0.8706538 -0.8706538
0.8964467 5.9604645e-08 -0.8964467
0.9248757 -0.6464467 -0.82781297
0.87311625 -0.75025547 -0.87311625
0.82781297 -0.6464467 -0.9248757
0.82781297 -0.9248757 -0.6464467
0.87311625 -0.87311625 -0.75025547
0.9248757 -0.82781297 -0.6464467
0.8964467 -0.8964467 5.9604645e-08
3 39 154 140
3 188 127 113
3 95 98 104
3 19 66 55
3 90 53 107
3 108 0 31
3 5 66 19
3 9 46 26
3 28 154 39
3 51 43 47
3 107 53 36
3 75 72 67
3 59 181 73
3 63 93 80
3 102 99 94
3 201 100 86
3 122 125 131
3 109 147 120
3 162 112 135
3 161 215 198
3 156 153 148
3 159 151 155
3 144 215 161
3 208 174 163
3 186 178 182
3 203 206 212
3 210 207 202
3 213 205 209
3 176 179 185
3 149 152 158
3 27 89 189
3 48 45 40
3 8 54 81
3 14 17 23
3 183 180 175
3 194 174 208
3 62 166 193
3 68 71 77
3 120 147 136
3 129 126 121
3 73 181 167
3 78 70 74
3 116 170 58
3 24 16 20
3 105 97 101
3 190 100 201
3 132 124 128
3 171 127 188
3 21 18 13
3 117 12 134
3 41 44 50
3 80 93 82
3 134 12 1
3 1 3 0
3 5 7 4
3 9 11 8
3 13 15 12
3 16 17 18
3 20 22 19
3 23 25 26
3 28 30 27
3 32 34 31
3 36 38 35
3 40 42 39
3 43 44 45
3 47 49 46
3 50 52 53
3 55 57 54
3 59 61 58
3 63 65 62
3 67 69 66
3 70 71 72
3 74 76 73
3 77 79 80
3 82 84 81
3 86 88 85
3 90 92 89
3 94 96 93
3 97 98 99
3 101 103 100
3 104 106 107
3 109 111 108
3 113 115 112
3 117 119 116
3 121 123 120
3 124 125 126
3 128 130 127
3 131 133 134
3 136 138 135
3 140 142 139
3 144 146 143
3 148 150 147
3 151 152 153
3 155 157 154
3 158 160 161
3 163 165 162
3 167 169 166
3 171 173 170
3 175 177 174
3 178 179 180
3 182 184 181
3 185 187 188
3 190 192 189
3 194 196 193
3 198 200 197
3 202 204 201
3 205 206 207
3 209 211 208
3 212 214 215
3 26 46 32
3 34 40 39
3 154 157 141
3 31 34 39
3 154 141 140
3 140 31 39
3 165 185 188
3 127 130 114
3 162 165 188
3 127 114 113
3 113 162 188
3 104 84 83
3 83 96 95
3 95 99 98
3 98 105 104
3 104 83 95
3 11 20 19
3 66 69 56
3 8 11 19
3 66 56 55
3 55 8 19
3 106 91 90
3 90 27 30
3 30 50 53
3 107 106 90
3 90 30 53
3 31 140 139
3 139 109 108
3 108 1 0
3 0 32 31
3 31 139 108
3 22 6 5
3 5 58 61
3 61 67 66
3 19 22 5
3 5 61 66
3 25 10 9
3 9 35 38
3 38 47 46
3 26 25 9
3 9 38 46
3 42 29 28
3 28 143 146
3 146 155 154
3 39 42 28
3 28 146 154
3 47 38 37
3 37 52 51
3 51 44 43
3 43 48 47
3 47 37 51
3 84 104 107
3 53 52 37
3 81 84 107
3 53 37 36
3 36 81 107
3 67 61 60
3 60 76 75
3 75 70 72
3 72 68 67
3 67 60 75
3 76 60 59
3 59 170 173
3 173 182 181
3 73 76 59
3 59 173 181
3 79 64 63
3 63 85 88
3 88 94 93
3 80 79 63
3 63 88 93
3 94 88 87
3 87 103 102
3 102 97 99
3 99 95 94
3 94 87 102
3 196 202 201
3 100 103 87
3 193 196 201
3 100 87 86
3 86 193 201
3 131 111 110
3 110 123 122
3 122 126 125
3 125 132 131
3 131 110 122
3 123 110 109
3 109 139 142
3 142 148 147
3 120 123 109
3 109 142 147
3 135 198 197
3 197 163 162
3 162 113 112
3 112 136 135
3 135 197 162
3 138 158 161
3 215 214 199
3 135 138 161
3 215 199 198
3 198 135 161
3 148 142 141
3 141 157 156
3 156 151 153
3 153 149 148
3 148 141 156
3 155 146 145
3 145 160 159
3 159 152 151
3 151 156 155
3 155 145 159
3 160 145 144
3 144 189 192
3 192 212 215
3 161 160 144
3 144 192 215
3 200 209 208
3 174 177 164
3 197 200 208
3 174 164 163
3 163 197 208
3 182 173 172
3 172 187 186
3 186 179 178
3 178 183 182
3 182 172 186
3 212 192 191
3 191 204 203
3 203 207 206
3 206 213 212
3 212 191 203
3 202 196 195
3 195 211 210
3 210 205 207
3 207 203 202
3 202 195 210
3 209 200 199
3 199 214 213
3 213 206 205
3 205 210 209
3 209 199 213
3 185 165 164
3 164 177 176
3 176 180 179
3 179 186 185
3 185 164 176
3 158 138 137
3 137 150 149
3 149 153 152
3 152 159 158
3 158 137 149
3 189 144 143
3 143 28 27
3 27 90 89
3 89 190 189
3 189 143 27
3 40 34 33
3 33 49 48
3 48 43 45
3 45 41 40
3 40 33 48
3 81 36 35
3 35 9 8
3 8 55 54
3 54 82 81
3 81 35 8
3 23 3 2
3 2 15 14
3 14 18 17
3 17 24 23
3 23 2 14
3 175 169 168
3 168 184 183
3 183 178 180
3 180 176 175
3 175 168 183
3 211 195 194
3 194 166 169
3 169 175 174
3 208 211 194
3 194 169 174
3 193 86 85
3 85 63 62
3 62 167 166
3 166 194 193
3 193 85 62
3 77 57 56
3 56 69 68
3 68 72 71
3 71 78 77
3 77 56 68
3 115 121 120
3 147 150 137
3 112 115 120
3 147 137 136
3 136 112 120
3 121 115 114
3 114 130 129
3 129 124 126
3 126 122 121
3 121 114 129
3 65 74 73
3 181 184 168
3 62 65 73
3 181 168 167
3 167 62 73
3 74 65 64
3 64 79 78
3 78 71 70
3 70 75 74
3 74 64 78
3 58 5 4
3 4 117 116
3 116 171 170
3 170 59 58
3 58 4 116
3 20 11 10
3 10 25 24
3 24 17 16
3 16 21 20
3 20 10 24
3 101 92 91
3 91 106 105
3 105 98 97
3 97 102 101
3 101 91 105
3 204 191 190
3 190 89 92
3 92 101 100
3 201 204 190
3 190 92 100
3 128 119 118
3 118 133 132
3 132 125 124
3 124 129 128
3 128 118 132
3 187 172 171
3 171 116 119
3 119 128 127
3 188 187 171
3 171 119 127
3 13 7 6
3 6 22 21
3 21 16 18
3 18 14 13
3 13 6 21
3 133 118 117
3 117 4 7
3 7 13 12
3 134 133 117
3 117 7 12
3 50 30 29
3 29 42 41
3 41 45 44
3 44 51 50
3 50 29 41
3 57 77 80
3 93 96 83
3 54 57 80
3 93 83 82
3 82 54 80
3 111 131 134
3 12 15 2
3 108 111 134
3 12 2 1
3 1 108 134
3 1 2 3
3 5 6 7
3 9 10 11
3 13 14 15
3 20 21 22
3 23 24 25
3 28 29 30
3 32 33 34
3 36 37 38
3 40 41 42
3 47 48 49
3 50 51 52
3 55 56 57
3 59 60 61
3 63 64 65
3 67 68 69
3 74 75 76
3 77 78 79
3 82 83 84
3 86 87 88
3 90 91 92
3 94 95 96
3 101 102 103
3 104 105 106
3 109 110 111
3 113 114 115
3 117 118 119
3 121 122 123
3 128 129 130
3 131 132 133
3 136 137 138
3 140 141 142
3 144 145 146
3 148 149 150
3 155 156 157
3 158 159 160
3 163 164 165
3 167 168 169
3 171 172 173
3 175 176 177
3 182 183 184
3 185 186 187
3 190 191 192
3 194 195 196
3 198 199 200
3 202 203 204
3 209 210 211
3 212 213 214
3 3 23 26
3 46 49 33
3 0 3 26
3 46 33 32
3 32 0 26
`;
class CubeGlassMesh extends GlassMesh {
    static vertexBuffer = undefined;
    static vertexCount = undefined;
    static initValues(device) {
        const meshData = GlassMesh.createVertexBuffer(device, glassCubePLY, "Vertex buffer for arrow");
        this.vertexBuffer = meshData.vertexBuffer;
        this.vertexCount = meshData.vertexCount;
    }
    getVertexBuffer(device) {
        if (CubeGlassMesh.vertexBuffer === undefined) {
            CubeGlassMesh.initValues(device);
        }
        return CubeGlassMesh.vertexBuffer;
    }
    get vertexCount() {
        if (CubeGlassMesh.vertexBuffer === undefined) {
            console.error("Tried to get glass ball vertexcount before initialization");
            return 0;
        }
        return CubeGlassMesh.vertexCount;
    }
}

class Player extends Entity {
    animationBuffer = mat4Impl.copy(this.transformMatrix);
    graphics = [
        new NormalGraphics(new ArrowMesh(), this.animationBuffer, "Player")
    ];
    target;
    destination = vec3Impl.create();
    baseSpeed = 5.5;
    get speed() {
        if (this.speedupDuration > 0) {
            return this.baseSpeed * this.speedup;
        }
        return this.baseSpeed;
    }
    velocity;
    stopped = true;
    team = "player";
    collisionRadius = 1.0;
    activeCollider = true;
    damage = 0;
    healthBar;
    get health() {
        return this.healthBar.health;
    }
    speedup = 1.5;
    speedupDuration = 0;
    constructor(pos) {
        super(pos);
        vec3Impl.copy(pos, this.destination);
        this.velocity = vec3Impl.fromValues(0, 0, 0);
        this.stopped = true;
        this.target = new Target(this.destination);
        this.healthBar = new Healthbar(3, 3, this.position);
        this.childStack = [this.target, this.healthBar];
        this.graphics.push(new DecalGraphics(this.collisionRadius, this.position, vec3Impl.fromValues(0.0, 0.0, 1.0)));
        this.graphics.push(new PointLightPosition(this.position, vec3Impl.fromValues(0, 1, 0)));
    }
    acceptWorldCoordinates = this.setDestination;
    setDestination(destination) {
        //this.faceDestination();
        vec3Impl.copy(destination, this.destination);
        vec3Impl.subtract(this.destination, this.position, this.velocity);
        vec3Impl.normalize(this.velocity, this.velocity);
        if (vec3Impl.len(this.velocity) != 0) {
            this.stopped = false;
        }
        this.target.setLocation(destination);
    }
    resolveCollision(damage) {
        this.healthBar.takeDamage(damage);
        //any time you heal on collision, you go faster. please fix this.
        if (damage < 0) {
            this.speedupDuration = 5.0;
        }
    }
    update(deltaTime) {
        this.speedupDuration -= deltaTime;
        if (this.stopped) {
            return;
        }
        //this code assumes linear motion towards the destination
        vec3Impl.mulScalar(this.velocity, this.speed * deltaTime, this.velocity);
        //snap to destination if going to overshoot
        if (vec3Impl.len(this.velocity) > vec3Impl.dist(this.position, this.destination)) {
            mat4Impl.setTranslation(this.transformMatrix, this.destination, this.transformMatrix);
            this.stopped = true;
            vec3Impl.set(0, 0, 0, this.velocity);
            //TODO: This needs to update the animation buffer.
        }
        //movement
        else {
            mat4Impl.translate(this.transformMatrix, this.velocity, this.transformMatrix);
            vec3Impl.normalize(this.velocity, this.velocity);
            mat4Impl.aim(this.position, this.destination, this.up, this.animationBuffer);
        }
        this.healthBar.updatePosition();
    }
    attachControls(controls) {
        controls.worldCursorControls.register(this);
    }
    registerSystems(systems) {
        systems.playerCollisionSystem.register(this);
    }
    destructor(controls, systems) {
        controls.worldCursorControls.remove(this);
        systems.playerCollisionSystem.remove(this);
        this.healthBar.deleteMe = true;
    }
}
class Target extends Entity {
    graphics = new SimpleGraphics(new SimpleCube(), this.transformMatrix, "Target");
    constructor(location) {
        super(location);
        mat4Impl.scale(this.transformMatrix, vec3Impl.fromValues(0.1, 0.1, 0.1), this.transformMatrix);
        this.graphics.active = false;
    }
    setLocation(destination) {
        this.graphics.active = true;
        mat4Impl.setTranslation(this.transformMatrix, destination, this.transformMatrix);
    }
}
class HealthBrick extends Entity {
    color = new Float32Array([1.0, 0.2, 0.1, 1.0]);
    graphics = new FireballGraphics(new CubeGlassMesh(), this.transformMatrix, this.color, "Healthbar");
    constructor(pos) {
        super(pos);
        mat4Impl.uniformScale(this.transformMatrix, 0.5, this.transformMatrix);
    }
}
class Healthbar extends Entity {
    maxHealth;
    height;
    parentPos;
    healthBricks = [];
    _health;
    offset = 1;
    get health() {
        return this._health;
    }
    constructor(maxHealth, height, parentPos) {
        super();
        this.maxHealth = maxHealth;
        this.height = height;
        this.parentPos = parentPos;
        this._health = maxHealth;
        this.childStack = [];
        for (let i = 0; i < maxHealth; i++) {
            const brick = new HealthBrick(this.calculatePosition(i));
            this.healthBricks.push(brick);
            this.childStack.push(brick);
        }
    }
    takeDamage(damage) {
        if (damage === 0) {
            return;
        }
        const previousHealth = this._health;
        this._health = Math.max(0, Math.min(this.maxHealth, this._health - damage));
        //hurtin'
        if (Math.sign(damage) > 0) {
            for (let i = previousHealth - 1; i >= this._health; i--) {
                this.healthBricks[i].graphics.active = false;
            }
        }
        //healin'
        else if (Math.sign(damage) < 0) {
            for (let i = previousHealth; i < this._health; i++) {
                this.healthBricks[i].graphics.active = true;
            }
        }
    }
    updatePosition() {
        for (let i = 0; i < this._health; i++) {
            vec3Impl.copy(this.calculatePosition(i), this.healthBricks[i].position);
        }
    }
    calculatePosition(index) {
        const initialOffset = (this.offset * (this.maxHealth / 2)) / Math.SQRT2;
        return vec3Impl.add(this.parentPos, vec3Impl.fromValues(-initialOffset + this.offset * index, this.height, initialOffset - this.offset * index));
    }
    destructor(controls, systems) {
        for (const brick of this.healthBricks) {
            brick.deleteMe = true;
        }
    }
}

function removeFirstInstanceFrom(array, elem, warning) {
    if (array.length < 1) {
        console.warn("remove attempted on empty array");
    }
    const index = array.indexOf(elem);
    if (index === -1) {
        console.warn("element to remove not found: " + warning);
    }
    array.splice(index, 1);
}
function clampNormal(x) {
    return Math.min(1, Math.max(0, x));
}
function smoothStep(x) {
    return clampNormal(x * x * (3 - 2 * x));
}
function interpolate(start, end, ratio) {
    if (ratio <= 0)
        return start;
    else if (ratio >= 1)
        return end;
    return start + ((end - start) * ratio);
}
function cancelEvent(e) {
    e.preventDefault();
    e.stopImmediatePropagation();
}
function translateTouchStartToMouseEvent(e) {
    if (e.type !== 'touchstart') {
        return;
    }
    for (let touch of e.changedTouches) {
        let mouseEvent = new MouseEvent('mousedown', {
            button: 2,
            clientX: touch.clientX,
            clientY: touch.clientY,
        });
        if (e.target !== null) {
            e.target.dispatchEvent(mouseEvent);
        }
    }
}

class Control {
    listeners = [];
    constructor(context) {
    }
    register(listener) {
        this.listeners.push(listener);
    }
    remove(listener) {
        removeFirstInstanceFrom(this.listeners, listener, "listener not found in " + this.constructor.name);
    }
}

class CameraInputHandler extends Control {
    window;
    canvas;
    up = "ArrowUp";
    down = "ArrowDown";
    left = "ArrowLeft";
    right = "ArrowRight";
    inputMap = new Map([
        [this.up, false],
        [this.down, false],
        [this.left, false],
        [this.right, false],
    ]);
    cameraList = [];
    constructor(context, abortController) {
        super(context);
        this.window = window;
        this.canvas = context.canvas;
        this.window.addEventListener('keydown', (e) => this.sendInputs(e, true), { signal: abortController.signal });
        this.window.addEventListener('keyup', (e) => this.sendInputs(e, false), { signal: abortController.signal });
        this.canvas.addEventListener('wheel', (e) => this.sendZoom(e), { signal: abortController.signal });
    }
    register(camera) {
        this.cameraList.push(camera);
    }
    remove(camera) {
        removeFirstInstanceFrom(this.cameraList, camera, "camera not found in cameralist");
    }
    sendInputs(e, pressed) {
        if (this.inputMap.has(e.code)) {
            e.preventDefault();
            e.stopPropagation();
            this.inputMap.set(e.code, pressed);
            for (let camera of this.cameraList) {
                camera.receiveInput(this.inputMap.get(this.up), this.inputMap.get(this.down), this.inputMap.get(this.left), this.inputMap.get(this.right));
            }
        }
    }
    sendZoom(e) {
        e.preventDefault();
        e.stopPropagation();
        for (let camera of this.cameraList) {
            camera.zoom(Math.sign(e.deltaY));
        }
    }
}

class ScreenToWorldInterpreter extends Control {
    window;
    canvas;
    camera;
    floor;
    acceptorList = [];
    clickPosition = vec4Impl.create();
    worldRay = vec3Impl.create();
    floorNormal = vec3Impl.fromValues(0, 1, 0);
    worldRayFloorIntersectionPoint = vec3Impl.create();
    //update how the floor is handled if you are going to implement more complicated flooring.
    //currently floor is assumed to be a flat plane with up set as (x:0,y:1,z:0) at position(0,0,0);
    constructor(context, abortController) {
        super(context);
        this.window = window;
        this.canvas = context.canvas;
        this.floor = context.floor;
        this.camera = context.camera;
        this.addEventListeners(abortController);
    }
    register(acceptor) {
        this.acceptorList.push(acceptor);
    }
    remove(acceptor) {
        removeFirstInstanceFrom(this.acceptorList, acceptor, "Screen to world acceptor not found in acceptorlist");
    }
    notifyListeners() {
        for (let acceptor of this.acceptorList) {
            acceptor.acceptWorldCoordinates(this.worldRayFloorIntersectionPoint);
        }
    }
    translateClickToWorld(e) {
        if (e.button != 2) {
            return;
        }
        this.catchEvent(e);
        //all of these functions have horrible side effects
        //must be called in this order unless you want to rewrite these with parameters and make them public functions
        this.updateClickPosition(e);
        this.transformClickPositionIntoWorldRay();
        this.intersectRayWithFloor();
        this.floor.getClosestValidPoint(this.worldRayFloorIntersectionPoint, this.worldRayFloorIntersectionPoint);
        this.notifyListeners();
    }
    addEventListeners(abortController) {
        this.canvas.addEventListener('contextmenu', (e) => this.catchEvent(e), { signal: abortController.signal });
        this.canvas.addEventListener('mousedown', (e) => this.translateClickToWorld(e), { signal: abortController.signal });
    }
    updateClickPosition(e) {
        //device pixel ratio might be useful here if it becomes an issue
        vec4Impl.set(2 * ((e.offsetX / this.canvas.width) - 0.5), -2 * ((e.offsetY / this.canvas.height) - 0.5), -1.0, 1.0, this.clickPosition);
        return;
    }
    transformClickPositionIntoWorldRay() {
        vec4Impl.transformMat4(this.clickPosition, mat4Impl.inverse(this.camera.viewProjectionMatrix), this.clickPosition);
        vec4Impl.mulScalar(this.clickPosition, 1 / this.clickPosition[3], this.clickPosition);
        vec3Impl.set(this.clickPosition[0], this.clickPosition[1], this.clickPosition[2], this.worldRay);
        vec3Impl.sub(this.worldRay, this.camera.position, this.worldRay);
        vec3Impl.normalize(this.worldRay, this.worldRay);
        return;
    }
    //this function should be changed if the height or position of the floor is going to not be zero.
    intersectRayWithFloor() {
        const distance = -vec3Impl.dot(this.camera.position, this.floorNormal) / vec3Impl.dot(this.worldRay, this.floorNormal);
        vec3Impl.mulScalar(this.worldRay, distance, this.worldRay);
        vec3Impl.add(this.camera.position, this.worldRay, this.worldRayFloorIntersectionPoint);
    }
    catchEvent(e) {
        e.preventDefault();
        e.stopPropagation();
        return;
    }
}

class Controls {
    cameraControls;
    worldCursorControls;
    controls;
    abortController = new AbortController();
    constructor(context) {
        this.cameraControls = new CameraInputHandler(context, this.abortController);
        this.worldCursorControls = new ScreenToWorldInterpreter(context, this.abortController);
        this.controls = [this.cameraControls, this.worldCursorControls];
    }
    abortEventListeners() {
        this.abortController.abort("scene destoyed");
    }
}

class System {
    members = [];
    constructor(context) {
    }
    register(member) {
        this.members.push(member);
    }
    remove(member) {
        removeFirstInstanceFrom(this.members, member, "member not found in " + this.constructor.name);
    }
}

class PlayerCollisionSystem extends System {
    //private players:Collisions[]=[];
    //private enemies:Collisions[]=[];
    constructor(context) {
        super(context);
    }
    execute() {
        //TODO OPTIMIZATION: keep track of when new members are registered or destroyed to avoid generating these lists on every frame.
        for (const player of this.members.filter((member) => member.team === "player" && member.activeCollider)) {
            for (const enemy of this.members.filter((member) => member.team === "enemy" && member.activeCollider)) {
                let distance = vec3Impl.distance(player.position, enemy.position);
                if (distance < player.collisionRadius + enemy.collisionRadius) {
                    enemy.resolveCollision(player.damage);
                    player.resolveCollision(enemy.damage);
                }
            }
        }
    }
}

class BoundaryChecker extends System {
    floor;
    constructor(context) {
        super(context);
        this.floor = new Floor(context.size * 1.5);
    }
    execute() {
        for (const member of this.members) {
            if (!this.floor.contains(member.position)) {
                member.onLeave();
            }
        }
    }
}

class ClampToWorld extends System {
    floor;
    closestPoint;
    constructor(context) {
        super(context);
        this.floor = context.floor;
        this.closestPoint = vec3Impl.create();
    }
    execute() {
        for (const member of this.members) {
            this.floor.getClosestValidPoint(member.worldPosition, this.closestPoint);
            if (!vec3Impl.equals(member.worldPosition, this.closestPoint)) {
                member.returnToWorld(this.closestPoint);
            }
        }
    }
}

class Systems {
    playerCollisionSystem;
    boundaryCheck;
    clampToWorld;
    systems;
    constructor(context) {
        this.playerCollisionSystem = new PlayerCollisionSystem(context);
        this.boundaryCheck = new BoundaryChecker(context);
        this.clampToWorld = new ClampToWorld(context);
        this.systems = [this.playerCollisionSystem, this.boundaryCheck, this.clampToWorld];
    }
    execute() {
        for (const system of this.systems) {
            system.execute();
        }
    }
}

const ballPLY = `
ply
format ascii 1.0
comment Created in Blender version 4.2.1 LTS
element vertex 522
property float x
property float y
property float z
element face 1040
property list uchar uint vertex_indices
end_header
0.07431276 0.068315804 -0.22871505
0.24048464 0.0683164 0
0.07431276 0.068315804 0.22871505
-0.19455709 0.06831586 0.14135234
-0.19455709 0.06831586 -0.14135234
0.09220204 0.040018678 -0.066989094
-3.6657678e-07 0.03120029 7.4505807e-10
0.09220205 0.040018678 0.06698909
-0.03521873 0.04001856 0.10839026
-0.11396891 0.0400185 0
-0.035218745 0.04001856 -0.10839024
-0.58716327 0.36823773 -0.42659408
-0.78172004 0.5168644 -0.28524047
-0.8276489 0.75734985 -0.4265955
-0.6614794 0.7573487 -0.65530914
-0.5128514 0.5168639 -0.65530914
-0.70066464 0.4882096 -0.42625406
-0.70103025 0.56673396 -0.50932246
-0.77110124 0.6021779 -0.42625448
-0.7358836 0.6726141 -0.5346451
-0.6436815 0.6021774 -0.6016338
-0.6219148 0.48820937 -0.53464466
0.029715672 0.5168637 -0.83160293
0.14996083 0.7573503 -0.9189662
0.41882813 0.75734836 -0.8316056
0.46475664 0.5168647 -0.69025177
0.22427201 0.3682375 -0.69025
0.16710965 0.6021776 -0.8650803
0.26776478 0.5667338 -0.82410824
0.28107807 0.672614 -0.865081
0.3732796 0.6021774 -0.7980921
0.31629544 0.48820955 -0.75669
0.18887492 0.48820913 -0.79809093
0.80008715 0.5168667 -0.22871394
0.9203312 0.75735396 -0.14135145
0.9203312 0.75735396 0.14135145
0.80008715 0.5168667 0.22871394
0.72577363 0.3682409 0
0.8743823 0.6021814 -0.108389646
0.8665197 0.56673765 -8.911141e-10
0.909601 0.6726185 0
0.8743824 0.6021814 0.108389646
0.8173977 0.48821276 0.066988766
0.8173977 0.48821276 -0.066988766
0.46475664 0.5168647 0.69025177
0.41882813 0.75734836 0.8316056
0.14996083 0.7573503 0.9189662
0.029715672 0.5168637 0.83160293
0.22427201 0.3682375 0.69025
0.3732796 0.6021774 0.7980921
0.26776478 0.5667338 0.82410824
0.28107807 0.672614 0.865081
0.16710967 0.6021777 0.8650803
0.18887492 0.48820913 0.79809093
0.31629544 0.48820955 0.75669
-0.58716327 0.36823773 0.42659408
-0.5128514 0.5168639 0.65530914
-0.6614794 0.7573487 0.65530914
-0.8276489 0.75734985 0.4265955
-0.78172004 0.5168644 0.28524047
-0.6219148 0.48820937 0.53464466
-0.70103025 0.56673396 0.50932246
-0.6436815 0.6021774 0.6016338
-0.7358836 0.6726141 0.5346451
-0.77110124 0.6021779 0.42625448
-0.70066464 0.4882096 0.42625406
-0.41882813 1.2426516 -0.8316056
-0.46475664 1.4831352 -0.69025177
-0.22427201 1.6317625 -0.6902499
-0.029715672 1.4831363 -0.83160293
-0.14996083 1.2426497 -0.9189662
-0.3732796 1.3978226 -0.7980921
-0.26776478 1.4332662 -0.82410824
-0.31629544 1.5117905 -0.7566901
-0.18887492 1.5117909 -0.7980908
-0.16710965 1.3978224 -0.8650803
-0.28107807 1.327386 -0.865081
0.6614794 1.2426513 -0.65530914
0.5128514 1.4831362 -0.65530914
0.58716327 1.6317623 -0.42659408
0.78172004 1.4831356 -0.28524047
0.8276489 1.2426502 -0.4265955
0.6436815 1.3978226 -0.6016338
0.70103025 1.433266 -0.50932246
0.6219148 1.5117906 -0.53464466
0.70066464 1.5117904 -0.42625406
0.77110124 1.3978221 -0.42625448
0.7358836 1.3273859 -0.5346451
0.8276489 1.2426502 0.4265955
0.78172004 1.4831356 0.28524047
0.58716327 1.6317623 0.42659408
0.5128514 1.4831362 0.65530914
0.6614794 1.2426513 0.65530914
0.77110124 1.3978221 0.42625448
0.7010302 1.433266 0.50932246
0.70066464 1.5117904 0.42625406
0.6219148 1.5117906 0.53464466
0.6436815 1.3978226 0.6016338
0.7358836 1.3273859 0.5346451
-0.14996083 1.2426497 0.9189662
-0.029715672 1.4831363 0.83160293
-0.22427201 1.6317625 0.6902499
-0.46475664 1.4831352 0.69025177
-0.41882813 1.2426516 0.8316056
-0.16710967 1.3978224 0.8650803
-0.2677648 1.4332662 0.82410824
-0.18887492 1.5117909 0.7980908
-0.31629544 1.5117905 0.7566901
-0.3732796 1.3978226 0.7980921
-0.28107807 1.327386 0.865081
-0.9203312 1.2426461 0.14135145
-0.80008715 1.4831333 0.22871394
-0.72577363 1.6317592 0
-0.80008715 1.4831333 -0.22871394
-0.9203312 1.2426461 -0.14135145
-0.8743824 1.3978186 0.108389646
-0.8665196 1.4332623 -7.4136364e-10
-0.8173977 1.5117872 0.066988766
-0.8173977 1.5117872 -0.066988766
-0.8743823 1.3978186 -0.108389646
-0.909601 1.3273815 0
-0.074312754 1.9316843 0.22871502
0.19455709 1.9316841 0.14135234
0.19455709 1.9316841 -0.14135234
-0.074312754 1.9316843 -0.22871502
-0.24048464 1.9316835 0
0.035218753 1.9599814 0.10839021
3.6770044e-07 1.9687997 1.1906152e-09
0.11396891 1.9599814 0
0.03521877 1.9599814 -0.10839021
-0.09220204 1.9599813 -0.06698908
-0.092202045 1.9599813 0.06698907
-0.07530822 0.1493457 -0.42273986
-0.0095924735 0.2807777 -0.6249955
0.21457157 0.33388823 -0.66039455
0.37511885 0.28077745 -0.49999595
0.30940354 0.14934671 -0.29774225
0.0881428 0.08102977 -0.27128023
0.042424455 0.18784112 -0.5139795
0.15715456 0.1771031 -0.4836799
0.12732828 0.24189252 -0.58358693
0.24000765 0.24189246 -0.5469754
0.26778328 0.18784142 -0.44075692
0.18372995 0.12933666 -0.37376764
0.07105045 0.12933642 -0.4103786
-0.3596084 0.28077793 -0.5112667
-0.1875589 0.1493457 -0.3862668
-0.2307656 0.08102995 -0.16765906
-0.42532268 0.14934582 -0.0590114
-0.59737134 0.28077883 -0.1840129
-0.56176674 0.33388853 -0.40814263
-0.336436 0.1878413 -0.39087823
-0.4114442 0.17710328 -0.2989282
-0.29869884 0.12933654 -0.29023784
-0.36833823 0.12933654 -0.19438694
-0.47571456 0.18784165 -0.19917686
-0.51567817 0.24189305 -0.30143502
-0.44603896 0.2418927 -0.39728546
-0.09082079 0.34283018 -0.68401134
-0.32858312 0.34283018 -0.6067563
-0.4736247 0.5101789 -0.6794278
-0.39429957 0.6869263 -0.80901366
-0.15653762 0.68692476 -0.88626695
-0.016196474 0.5101788 -0.82805794
-0.2317244 0.39727116 -0.7131607
-0.25429094 0.49141765 -0.7826129
-0.34384507 0.44628644 -0.71181816
-0.36309296 0.54706997 -0.771058
-0.27022028 0.59883755 -0.8316397
-0.15947647 0.5470694 -0.8372178
-0.14022842 0.44628644 -0.77797836
-0.6785992 0.34283108 -0.124998495
-0.6785992 0.34283108 0.124998495
-0.7925351 0.5101802 0.24048482
-0.8912644 0.68692786 0.124997705
-0.8912644 0.68692786 -0.124997705
-0.7925351 0.5101802 -0.24048482
-0.7498641 0.3972724 0
-0.8228905 0.49141932 1.2141399e-09
-0.78323513 0.4462878 0.10704759
-0.84552336 0.54707146 0.10704735
-0.8744405 0.59883964 0
-0.84552336 0.54707146 -0.10704735
-0.78323513 0.4462878 -0.10704759
-0.59737134 0.28077883 0.1840129
-0.42532268 0.14934582 0.0590114
-0.2307656 0.08102995 0.16765906
-0.1875589 0.1493457 0.3862668
-0.3596084 0.28077793 0.5112667
-0.56176674 0.33388853 0.40814263
-0.47571456 0.18784165 0.19917686
-0.4114442 0.1771034 0.2989282
-0.36833823 0.12933654 0.19438694
-0.29869884 0.12933654 0.29023784
-0.336436 0.1878413 0.39087823
-0.44603896 0.2418927 0.39728546
-0.51567817 0.24189305 0.30143505
0.3787818 0.14934719 -0.202253
0.5914466 0.28078043 -0.2022546
0.69438237 0.3338918 0
0.5914466 0.28078043 0.2022546
0.3787818 0.14934719 0.202253
0.28524512 0.08103192 0
0.5019377 0.18784356 -0.11847752
0.5085745 0.17710567 1.2232395e-09
0.594375 0.24189538 -0.059239
0.594375 0.24189538 0.059238985
0.5019377 0.18784356 0.11847752
0.41225338 0.12933856 0.059238557
0.41225338 0.12933856 -0.059238523
0.6224726 0.34283167 -0.29774234
0.4755261 0.3428319 -0.49999624
0.49982077 0.5101792 -0.6603944
0.64757556 0.68692666 -0.62499696
0.7945209 0.6869265 -0.4227429
0.78252846 0.51018155 -0.27128297
0.6066537 0.3972727 -0.4407577
0.6657331 0.49141908 -0.48368132
0.57072985 0.44628763 -0.5469761
0.621122 0.5470707 -0.58358794
0.70743763 0.59883875 -0.51398146
0.7469645 0.54707134 -0.410381
0.69657266 0.44628823 -0.37376913
0.30940354 0.14934671 0.29774225
0.37511885 0.28077745 0.49999595
0.21457157 0.33388823 0.66039455
-0.0095924735 0.2807777 0.6249955
-0.07530822 0.1493457 0.42273986
0.0881428 0.08102977 0.27128023
0.26778328 0.18784142 0.44075692
0.15715456 0.17710316 0.4836799
0.24000765 0.24189246 0.5469754
0.12732829 0.24189252 0.58358693
0.042424455 0.18784112 0.5139795
0.07105045 0.12933642 0.4103786
0.18372993 0.12933666 0.37376764
0.4755261 0.3428319 0.49999624
0.6224726 0.34283167 0.29774234
0.78252846 0.51018155 0.27128297
0.7945209 0.6869265 0.4227429
0.64757556 0.68692666 0.62499696
0.49982077 0.5101792 0.6603944
0.6066537 0.3972727 0.4407577
0.6657331 0.49141908 0.48368138
0.69657266 0.44628823 0.37376913
0.74696445 0.54707134 0.410381
0.70743763 0.59883875 0.51398146
0.621122 0.54707074 0.58358794
0.57072985 0.44628763 0.5469761
-0.32858312 0.34283018 0.6067563
-0.09082079 0.34283018 0.68401134
-0.016196474 0.5101788 0.82805794
-0.15653762 0.68692476 0.88626695
-0.39429957 0.6869263 0.80901366
-0.4736247 0.5101789 0.6794278
-0.2317244 0.39727116 0.7131607
-0.25429097 0.49141765 0.7826128
-0.14022844 0.44628644 0.77797836
-0.15947647 0.5470694 0.8372178
-0.27022028 0.59883755 0.8316397
-0.36309296 0.54706997 0.771058
-0.34384507 0.44628644 0.71181816
-0.91044134 0.78733623 -0.18401492
-0.95105785 1 -0.05901262
-0.9251529 1.2045696 -0.16766118
-0.8447263 1.2126627 -0.38626665
-0.8041121 1 -0.51126724
-0.8470163 0.7954306 -0.40814242
-0.93916154 0.9377122 -0.19917834
-0.9200237 0.99999994 -0.29892927
-0.9434704 1.059917 -0.19438842
-0.9123267 1.1222045 -0.29023895
-0.8768746 1.0622874 -0.3908788
-0.8775453 0.940083 -0.39728603
-0.9086885 0.8777952 -0.30143613
-0.95105785 1 0.05901262
-0.91044134 0.78733623 0.18401492
-0.8470163 0.7954306 0.40814242
-0.8041121 1 0.51126724
-0.8447263 1.2126627 0.38626665
-0.9251529 1.2045696 0.16766118
-0.93916154 0.93771225 0.19917832
-0.9200238 0.99999994 0.2989293
-0.9086885 0.8777952 0.30143613
-0.8775453 0.940083 0.39728603
-0.8768746 1.0622874 0.3908788
-0.91232663 1.1222045 0.29023895
-0.9434704 1.0599171 0.19438843
-0.10633119 0.7873376 -0.92274463
-0.23776414 1 -0.92274565
-0.12642719 1.2045702 -0.931683
0.10633119 1.2126623 -0.92274463
0.23776414 1 -0.92274565
0.12642719 0.7954298 -0.931683
-0.100783184 0.9377126 -0.95474505
2.2458013e-09 1 -0.9673687
-0.10666916 1.0599172 -0.9573631
-0.005885981 1.1222045 -0.9573628
0.100783184 1.0622873 -0.95474505
0.10666916 0.9400828 -0.9573631
0.005885981 0.8777954 -0.9573628
-0.35002148 1 -0.886271
-0.45635486 0.78733605 -0.8090147
-0.6499135 0.7954318 -0.67943287
-0.73473144 1 -0.60676205
-0.62839943 1.2126629 -0.6840167
-0.44534546 1.2045683 -0.8280603
-0.4796509 0.9377122 -0.83164334
-0.5686055 0.99999994 -0.78261733
-0.5674873 0.8777955 -0.7710619
-0.6490219 0.9400834 -0.71182346
-0.64272046 1.0622876 -0.713166
-0.55796134 1.1222042 -0.77798283
-0.47642636 1.0599166 -0.83722174
0.8447263 0.7873373 -0.38626665
0.8041121 1 -0.51126724
0.8470163 1.2045693 -0.40814242
0.91044134 1.2126638 -0.18401492
0.95105785 1 -0.05901262
0.9251529 0.7954304 -0.16766118
0.8768746 0.93771255 -0.3908788
0.9200238 1.0000001 -0.29892927
0.8775453 1.059917 -0.39728603
0.9086885 1.1222048 -0.30143613
0.93916154 1.0622878 -0.19917834
0.9434704 0.94008297 -0.19438842
0.9123267 0.87779546 -0.29023895
0.73473144 1 -0.60676205
0.62839943 0.7873371 -0.6840167
0.44534546 0.7954318 -0.8280603
0.35002148 1 -0.886271
0.45635486 1.212664 -0.8090147
0.6499135 1.2045683 -0.67943287
0.64272046 0.9377125 -0.713166
0.5686055 1.0000001 -0.7826174
0.55796134 0.8777958 -0.77798283
0.47642636 0.9400834 -0.83722174
0.4796509 1.0622878 -0.83164334
0.5674873 1.1222045 -0.7710619
0.6490219 1.0599166 -0.71182346
0.62839943 0.7873371 0.6840167
0.73473144 1 0.60676205
0.6499135 1.2045683 0.67943287
0.45635486 1.212664 0.8090147
0.35002148 1 0.886271
0.44534546 0.7954318 0.8280603
0.64272046 0.9377125 0.713166
0.56860554 1.0000001 0.78261733
0.6490219 1.0599166 0.7118234
0.5674873 1.1222045 0.7710619
0.4796509 1.0622878 0.83164334
0.47642636 0.9400834 0.83722174
0.55796134 0.8777958 0.77798283
0.8041121 1 0.51126724
0.8447263 0.7873373 0.38626665
0.9251529 0.7954304 0.16766118
0.95105785 1 0.05901262
0.91044134 1.2126638 0.18401492
0.8470163 1.2045693 0.40814242
0.8768746 0.93771255 0.3908788
0.9200238 1.0000001 0.29892927
0.91232663 0.87779546 0.29023895
0.9434704 0.9400829 0.19438843
0.93916154 1.0622878 0.19917832
0.9086885 1.1222048 0.30143613
0.8775453 1.059917 0.39728603
-0.45635486 0.78733605 0.8090147
-0.35002148 1 0.886271
-0.44534546 1.2045683 0.8280603
-0.62839943 1.2126629 0.6840167
-0.73473144 1 0.60676205
-0.6499135 0.7954318 0.67943287
-0.4796509 0.93771213 0.83164334
-0.5686055 0.99999994 0.78261733
-0.47642636 1.0599166 0.83722174
-0.55796134 1.1222042 0.77798283
-0.64272046 1.0622876 0.713166
-0.6490219 0.9400834 0.7118234
-0.5674873 0.8777955 0.7710619
-0.23776414 1 0.92274565
-0.10633119 0.7873376 0.92274463
0.12642719 0.7954298 0.931683
0.23776414 1 0.92274565
0.10633119 1.2126623 0.92274463
-0.12642719 1.2045702 0.931683
-0.100783184 0.9377126 0.95474505
5.878147e-10 1 0.9673687
0.005885981 0.8777954 0.9573628
0.10666916 0.9400828 0.9573631
0.100783184 1.0622873 0.95474505
-0.005885981 1.1222045 0.9573628
-0.10666916 1.0599172 0.9573631
-0.64757556 1.3130734 -0.62499696
-0.7945209 1.3130735 -0.4227429
-0.78252846 1.4898185 -0.27128297
-0.6224726 1.6571684 -0.29774234
-0.4755261 1.657168 -0.49999624
-0.49982077 1.4898207 -0.6603944
-0.70743763 1.4011612 -0.51398146
-0.66573304 1.5085809 -0.48368144
-0.7469645 1.4529287 -0.410381
-0.69657266 1.5537118 -0.37376913
-0.6066537 1.6027272 -0.4407577
-0.57072985 1.5537124 -0.5469761
-0.621122 1.4529293 -0.58358794
0.39429957 1.3130736 -0.80901366
0.15653762 1.3130753 -0.88626695
0.016196474 1.4898212 -0.82805794
0.09082079 1.6571698 -0.68401134
0.32858312 1.6571698 -0.6067563
0.4736247 1.4898211 -0.6794278
0.27022028 1.4011624 -0.8316397
0.2542909 1.5085824 -0.7826128
0.15947647 1.4529307 -0.8372178
0.14022844 1.5537136 -0.77797836
0.23172438 1.6027288 -0.7131607
0.34384507 1.5537136 -0.71181816
0.36309296 1.45293 -0.771058
0.8912644 1.3130722 0.124997705
0.8912644 1.3130722 -0.124997705
0.7925351 1.4898198 -0.24048482
0.6785992 1.6571689 -0.124998495
0.6785992 1.6571689 0.124998495
0.7925351 1.4898198 0.24048482
0.8744405 1.4011604 0
0.8228905 1.5085807 -3.2498393e-10
0.84552336 1.4529285 -0.10704735
0.78323513 1.5537121 -0.10704759
0.7498641 1.6027277 0
0.78323513 1.5537121 0.10704759
0.84552336 1.4529285 0.10704735
0.15653762 1.3130753 0.88626695
0.39429957 1.3130736 0.80901366
0.4736247 1.4898211 0.6794278
0.32858312 1.6571698 0.6067563
0.09082079 1.6571698 0.68401134
0.016196474 1.4898212 0.82805794
0.27022028 1.4011624 0.8316397
0.2542909 1.5085824 0.7826129
0.36309296 1.45293 0.771058
0.34384507 1.5537136 0.71181816
0.2317244 1.6027288 0.7131607
0.14022844 1.5537136 0.77797836
0.15947647 1.4529307 0.8372178
-0.7945209 1.3130735 0.4227429
-0.64757556 1.3130734 0.62499696
-0.49982077 1.4898207 0.6603944
-0.4755261 1.657168 0.49999624
-0.6224726 1.6571684 0.29774234
-0.78252846 1.4898185 0.27128297
-0.70743763 1.4011612 0.51398146
-0.665733 1.5085809 0.48368135
-0.621122 1.4529293 0.58358794
-0.57072985 1.5537124 0.5469761
-0.6066537 1.6027272 0.4407577
-0.69657266 1.5537118 0.37376913
-0.74696445 1.4529287 0.410381
-0.37511885 1.7192225 -0.49999595
-0.30940354 1.8506533 -0.29774225
-0.088142805 1.9189701 -0.27128023
0.07530822 1.8506544 -0.42273986
0.0095924735 1.7192223 -0.6249955
-0.21457157 1.6661117 -0.66039455
-0.26778328 1.8121586 -0.44075692
-0.15715456 1.822897 -0.48367992
-0.18372993 1.8706634 -0.37376764
-0.07105046 1.8706636 -0.4103786
-0.042424455 1.8121588 -0.5139795
-0.12732828 1.7581075 -0.58358693
-0.24000765 1.7581075 -0.5469754
-0.3787818 1.8506527 -0.202253
-0.5914466 1.7192196 -0.2022546
-0.69438237 1.6661081 0
-0.5914466 1.7192196 0.2022546
-0.3787818 1.8506527 0.202253
-0.28524512 1.9189681 0
-0.5019377 1.8121564 -0.11847752
-0.5085745 1.8228946 1.2232395e-09
-0.594375 1.7581046 -0.059239
-0.594375 1.7581046 0.059238985
-0.5019377 1.8121564 0.11847752
-0.41225338 1.8706615 0.059238557
-0.41225338 1.8706615 -0.059238523
0.3596084 1.7192221 -0.5112667
0.1875589 1.8506542 -0.3862668
0.2307656 1.9189701 -0.16765906
0.42532268 1.8506541 -0.0590114
0.59737134 1.7192211 -0.1840129
0.56176674 1.6661115 -0.40814263
0.336436 1.8121586 -0.39087823
0.4114442 1.8228967 -0.2989282
0.29869884 1.8706634 -0.29023784
0.36833823 1.8706634 -0.19438694
0.47571456 1.8121583 -0.19917686
0.51567817 1.758107 -0.30143502
0.44603896 1.7581073 -0.39728546
0.59737134 1.7192211 0.1840129
0.42532268 1.8506541 0.0590114
0.2307656 1.9189701 0.16765906
0.1875589 1.8506542 0.3862668
0.3596084 1.7192221 0.5112667
0.56176674 1.6661115 0.40814263
0.47571456 1.8121583 0.19917686
0.4114442 1.8228966 0.2989282
0.36833823 1.8706634 0.19438694
0.29869884 1.8706634 0.29023784
0.336436 1.8121586 0.39087823
0.44603896 1.7581073 0.39728546
0.51567817 1.758107 0.30143505
0.0095924735 1.7192223 0.6249955
0.07530822 1.8506544 0.42273986
-0.088142805 1.9189701 0.27128023
-0.30940354 1.8506533 0.29774225
-0.37511885 1.7192225 0.49999595
-0.21457157 1.6661117 0.66039455
-0.042424455 1.8121588 0.5139795
-0.15715456 1.8228967 0.4836799
-0.07105045 1.8706636 0.4103786
-0.18372993 1.8706634 0.37376764
-0.26778328 1.8121586 0.44075692
-0.24000765 1.7581075 0.5469754
-0.12732829 1.7581075 0.58358693
3 154 3 192
3 18 175 274
3 7 201 235
3 8 227 193
3 10 146 144
3 19 266 310
3 29 292 336
3 40 318 362
3 51 344 388
3 63 370 284
3 140 163 32
3 205 215 43
3 231 241 54
3 179 189 65
3 296 306 76
3 414 68 468
3 427 79 494
3 440 90 507
3 453 101 520
3 465 475 130
3 203 135 216
3 270 280 120
3 481 511 131
3 480 447 519
3 374 384 109
3 517 498 126
3 515 434 506
3 348 358 98
3 504 485 128
3 502 421 493
3 322 332 87
3 491 459 129
3 489 408 467
3 286 449 115
3 117 448 479
3 337 291 411
3 390 436 104
3 106 435 521
3 463 395 476
3 364 423 93
3 95 422 508
3 389 343 437
3 338 410 82
3 84 409 495
3 363 317 424
3 312 397 71
3 73 396 469
3 285 369 450
3 401 112 478
3 375 102 452
3 311 265 398
3 49 240 352
3 349 91 439
3 372 252 385
3 38 214 326
3 323 80 426
3 346 239 359
3 27 162 300
3 297 69 413
3 268 174 281
3 16 149 183
3 271 113 400
3 194 226 255
3 195 254 60
3 62 253 378
3 229 200 242
3 258 46 387
3 232 47 257
3 320 213 333
3 245 35 361
3 206 36 244
3 138 145 164
3 219 24 335
3 180 58 283
3 294 161 307
3 157 15 166
3 141 25 218
3 177 148 190
3 167 14 309
3 5 10 0
3 7 5 1
3 8 7 2
3 9 8 3
3 10 9 4
3 16 21 11
3 18 16 12
3 19 18 13
3 20 19 14
3 21 20 15
3 27 32 22
3 29 27 23
3 30 29 24
3 31 30 25
3 32 31 26
3 38 43 33
3 40 38 34
3 41 40 35
3 42 41 36
3 43 42 37
3 49 54 44
3 51 49 45
3 52 51 46
3 53 52 47
3 54 53 48
3 60 65 55
3 62 60 56
3 63 62 57
3 64 63 58
3 65 64 59
3 71 76 66
3 73 71 67
3 74 73 68
3 75 74 69
3 76 75 70
3 82 87 77
3 84 82 78
3 85 84 79
3 86 85 80
3 87 86 81
3 93 98 88
3 95 93 89
3 96 95 90
3 97 96 91
3 98 97 92
3 104 109 99
3 106 104 100
3 107 106 101
3 108 107 102
3 109 108 103
3 115 120 110
3 117 115 111
3 118 117 112
3 119 118 113
3 120 119 114
3 126 131 121
3 128 126 122
3 129 128 123
3 130 129 124
3 131 130 125
3 138 144 132
3 140 138 133
3 141 140 134
3 142 141 135
3 143 142 136
3 144 143 137
3 151 157 145
3 153 151 146
3 154 153 147
3 155 154 148
3 156 155 149
3 157 156 150
3 164 170 158
3 166 164 159
3 167 166 160
3 168 167 161
3 169 168 162
3 170 169 163
3 177 183 171
3 179 177 172
3 180 179 173
3 181 180 174
3 182 181 175
3 183 182 176
3 190 196 184
3 192 190 185
3 193 192 186
3 194 193 187
3 195 194 188
3 196 195 189
3 203 209 197
3 205 203 198
3 206 205 199
3 207 206 200
3 208 207 201
3 209 208 202
3 216 222 210
3 218 216 211
3 219 218 212
3 220 219 213
3 221 220 214
3 222 221 215
3 229 235 223
3 231 229 224
3 232 231 225
3 233 232 226
3 234 233 227
3 235 234 228
3 242 248 236
3 244 242 237
3 245 244 238
3 246 245 239
3 247 246 240
3 248 247 241
3 255 261 249
3 257 255 250
3 258 257 251
3 259 258 252
3 260 259 253
3 261 260 254
3 268 274 262
3 270 268 263
3 271 270 264
3 272 271 265
3 273 272 266
3 274 273 267
3 281 287 275
3 283 281 276
3 284 283 277
3 285 284 278
3 286 285 279
3 287 286 280
3 294 300 288
3 296 294 289
3 297 296 290
3 298 297 291
3 299 298 292
3 300 299 293
3 307 313 301
3 309 307 302
3 310 309 303
3 311 310 304
3 312 311 305
3 313 312 306
3 320 326 314
3 322 320 315
3 323 322 316
3 324 323 317
3 325 324 318
3 326 325 319
3 333 339 327
3 335 333 328
3 336 335 329
3 337 336 330
3 338 337 331
3 339 338 332
3 346 352 340
3 348 346 341
3 349 348 342
3 350 349 343
3 351 350 344
3 352 351 345
3 359 365 353
3 361 359 354
3 362 361 355
3 363 362 356
3 364 363 357
3 365 364 358
3 372 378 366
3 374 372 367
3 375 374 368
3 376 375 369
3 377 376 370
3 378 377 371
3 385 391 379
3 387 385 380
3 388 387 381
3 389 388 382
3 390 389 383
3 391 390 384
3 398 404 392
3 400 398 393
3 401 400 394
3 402 401 395
3 403 402 396
3 404 403 397
3 411 417 405
3 413 411 406
3 414 413 407
3 415 414 408
3 416 415 409
3 417 416 410
3 424 430 418
3 426 424 419
3 427 426 420
3 428 427 421
3 429 428 422
3 430 429 423
3 437 443 431
3 439 437 432
3 440 439 433
3 441 440 434
3 442 441 435
3 443 442 436
3 450 456 444
3 452 450 445
3 453 452 446
3 454 453 447
3 455 454 448
3 456 455 449
3 463 469 457
3 465 463 458
3 466 465 459
3 467 466 460
3 468 467 461
3 469 468 462
3 476 482 470
3 478 476 471
3 479 478 472
3 480 479 473
3 481 480 474
3 482 481 475
3 489 495 483
3 491 489 484
3 492 491 485
3 493 492 486
3 494 493 487
3 495 494 488
3 502 508 496
3 504 502 497
3 505 504 498
3 506 505 499
3 507 506 500
3 508 507 501
3 515 521 509
3 517 515 510
3 518 517 511
3 519 518 512
3 520 519 513
3 521 520 514
3 5 136 209
3 185 148 154
3 154 147 4
3 4 9 3
3 3 186 192
3 192 185 154
3 154 4 3
3 267 13 18
3 18 12 176
3 176 182 175
3 175 262 274
3 274 267 18
3 18 176 175
3 228 2 7
3 7 1 202
3 202 208 201
3 201 223 235
3 235 228 7
3 7 202 201
3 186 3 8
3 8 2 228
3 228 234 227
3 227 187 193
3 193 186 8
3 8 228 227
3 137 0 10
3 10 4 147
3 147 153 146
3 146 132 144
3 144 137 10
3 10 147 146
3 303 14 19
3 19 13 267
3 267 273 266
3 266 304 310
3 310 303 19
3 19 267 266
3 329 24 29
3 29 23 293
3 293 299 292
3 292 330 336
3 336 329 29
3 29 293 292
3 355 35 40
3 40 34 319
3 319 325 318
3 318 356 362
3 362 355 40
3 40 319 318
3 381 46 51
3 51 45 345
3 345 351 344
3 344 382 388
3 388 381 51
3 51 345 344
3 277 58 63
3 63 57 371
3 371 377 370
3 370 278 284
3 284 277 63
3 63 371 370
3 26 134 140
3 140 133 158
3 158 170 163
3 163 22 32
3 32 26 140
3 140 158 163
3 37 199 205
3 205 198 210
3 210 222 215
3 215 33 43
3 43 37 205
3 205 210 215
3 48 225 231
3 231 224 236
3 236 248 241
3 241 44 54
3 54 48 231
3 231 236 241
3 59 173 179
3 179 172 184
3 184 196 189
3 189 55 65
3 65 59 179
3 179 184 189
3 70 290 296
3 296 289 301
3 301 313 306
3 306 66 76
3 76 70 296
3 296 301 306
3 461 408 414
3 414 407 69
3 69 74 68
3 68 462 468
3 468 461 414
3 414 69 68
3 487 421 427
3 427 420 80
3 80 85 79
3 79 488 494
3 494 487 427
3 427 80 79
3 500 434 440
3 440 433 91
3 91 96 90
3 90 501 507
3 507 500 440
3 440 91 90
3 513 447 453
3 453 446 102
3 102 107 101
3 101 514 520
3 520 513 453
3 453 102 101
3 124 459 465
3 465 458 470
3 470 482 475
3 475 125 130
3 130 124 465
3 465 470 475
3 210 198 203
3 203 197 136
3 136 142 135
3 135 211 216
3 216 210 203
3 203 136 135
3 114 264 270
3 270 263 275
3 275 287 280
3 280 110 120
3 120 114 270
3 270 275 280
3 125 475 481
3 481 474 512
3 512 518 511
3 511 121 131
3 131 125 481
3 481 512 511
3 512 474 480
3 480 473 448
3 448 454 447
3 447 513 519
3 519 512 480
3 480 448 447
3 103 368 374
3 374 367 379
3 379 391 384
3 384 99 109
3 109 103 374
3 374 379 384
3 121 511 517
3 517 510 499
3 499 505 498
3 498 122 126
3 126 121 517
3 517 499 498
3 499 510 515
3 515 509 435
3 435 441 434
3 434 500 506
3 506 499 515
3 515 435 434
3 92 342 348
3 348 341 353
3 353 365 358
3 358 88 98
3 98 92 348
3 348 353 358
3 122 498 504
3 504 497 486
3 486 492 485
3 485 123 128
3 128 122 504
3 504 486 485
3 486 497 502
3 502 496 422
3 422 428 421
3 421 487 493
3 493 486 502
3 502 422 421
3 81 316 322
3 322 315 327
3 327 339 332
3 332 77 87
3 87 81 322
3 322 327 332
3 123 485 491
3 491 484 460
3 460 466 459
3 459 124 129
3 129 123 491
3 491 460 459
3 460 484 489
3 489 483 409
3 409 415 408
3 408 461 467
3 467 460 489
3 489 409 408
3 110 280 286
3 286 279 444
3 444 456 449
3 449 111 115
3 115 110 286
3 286 444 449
3 472 112 117
3 117 111 449
3 449 455 448
3 448 473 479
3 479 472 117
3 117 449 448
3 405 331 337
3 337 330 292
3 292 298 291
3 291 406 411
3 411 405 337
3 337 292 291
3 99 384 390
3 390 383 431
3 431 443 436
3 436 100 104
3 104 99 390
3 390 431 436
3 514 101 106
3 106 100 436
3 436 442 435
3 435 509 521
3 521 514 106
3 106 436 435
3 470 458 463
3 463 457 396
3 396 402 395
3 395 471 476
3 476 470 463
3 463 396 395
3 88 358 364
3 364 357 418
3 418 430 423
3 423 89 93
3 93 88 364
3 364 418 423
3 501 90 95
3 95 89 423
3 423 429 422
3 422 496 508
3 508 501 95
3 95 423 422
3 431 383 389
3 389 382 344
3 344 350 343
3 343 432 437
3 437 431 389
3 389 344 343
3 77 332 338
3 338 331 405
3 405 417 410
3 410 78 82
3 82 77 338
3 338 405 410
3 488 79 84
3 84 78 410
3 410 416 409
3 409 483 495
3 495 488 84
3 84 410 409
3 418 357 363
3 363 356 318
3 318 324 317
3 317 419 424
3 424 418 363
3 363 318 317
3 66 306 312
3 312 305 392
3 392 404 397
3 397 67 71
3 71 66 312
3 312 392 397
3 462 68 73
3 73 67 397
3 397 403 396
3 396 457 469
3 469 462 73
3 73 397 396
3 444 279 285
3 285 278 370
3 370 376 369
3 369 445 450
3 450 444 285
3 285 370 369
3 471 395 401
3 401 394 113
3 113 118 112
3 112 472 478
3 478 471 401
3 401 113 112
3 445 369 375
3 375 368 103
3 103 108 102
3 102 446 452
3 452 445 375
3 375 103 102
3 392 305 311
3 311 304 266
3 266 272 265
3 265 393 398
3 398 392 311
3 311 266 265
3 345 45 49
3 49 44 241
3 241 247 240
3 240 340 352
3 352 345 49
3 49 241 240
3 432 343 349
3 349 342 92
3 92 97 91
3 91 433 439
3 439 432 349
3 349 92 91
3 379 367 372
3 372 366 253
3 253 259 252
3 252 380 385
3 385 379 372
3 372 253 252
3 319 34 38
3 38 33 215
3 215 221 214
3 214 314 326
3 326 319 38
3 38 215 214
3 419 317 323
3 323 316 81
3 81 86 80
3 80 420 426
3 426 419 323
3 323 81 80
3 353 341 346
3 346 340 240
3 240 246 239
3 239 354 359
3 359 353 346
3 346 240 239
3 293 23 27
3 27 22 163
3 163 169 162
3 162 288 300
3 300 293 27
3 27 163 162
3 406 291 297
3 297 290 70
3 70 75 69
3 69 407 413
3 413 406 297
3 297 70 69
3 275 263 268
3 268 262 175
3 175 181 174
3 174 276 281
3 281 275 268
3 268 175 174
3 176 12 16
3 16 11 150
3 150 156 149
3 149 171 183
3 183 176 16
3 16 150 149
3 393 265 271
3 271 264 114
3 114 119 113
3 113 394 400
3 400 393 271
3 271 114 113
3 249 188 194
3 194 187 227
3 227 233 226
3 226 250 255
3 255 249 194
3 194 227 226
3 55 189 195
3 195 188 249
3 249 261 254
3 254 56 60
3 60 55 195
3 195 249 254
3 371 57 62
3 62 56 254
3 254 260 253
3 253 366 378
3 378 371 62
3 62 254 253
3 236 224 229
3 229 223 201
3 201 207 200
3 200 237 242
3 242 236 229
3 229 201 200
3 380 252 258
3 258 251 47
3 47 52 46
3 46 381 387
3 387 380 258
3 258 47 46
3 250 226 232
3 232 225 48
3 48 53 47
3 47 251 257
3 257 250 232
3 232 48 47
3 327 315 320
3 320 314 214
3 214 220 213
3 213 328 333
3 333 327 320
3 320 214 213
3 354 239 245
3 245 238 36
3 36 41 35
3 35 355 361
3 361 354 245
3 245 36 35
3 237 200 206
3 206 199 37
3 37 42 36
3 36 238 244
3 244 237 206
3 206 37 36
3 158 133 138
3 138 132 146
3 146 151 145
3 145 159 164
3 164 158 138
3 138 146 145
3 328 213 219
3 219 212 25
3 25 30 24
3 24 329 335
3 335 328 219
3 219 25 24
3 276 174 180
3 180 173 59
3 59 64 58
3 58 277 283
3 283 276 180
3 180 59 58
3 301 289 294
3 294 288 162
3 162 168 161
3 161 302 307
3 307 301 294
3 294 162 161
3 159 145 157
3 157 150 11
3 11 21 15
3 15 160 166
3 166 159 157
3 157 11 15
3 211 135 141
3 141 134 26
3 26 31 25
3 25 212 218
3 218 211 141
3 141 26 25
3 184 172 177
3 177 171 149
3 149 155 148
3 148 185 190
3 190 184 177
3 177 149 148
3 302 161 167
3 167 160 15
3 15 20 14
3 14 303 309
3 309 302 167
3 167 15 14
3 5 6 10
3 7 6 5
3 8 6 7
3 9 6 8
3 10 6 9
3 16 17 21
3 18 17 16
3 19 17 18
3 20 17 19
3 21 17 20
3 27 28 32
3 29 28 27
3 30 28 29
3 31 28 30
3 32 28 31
3 38 39 43
3 40 39 38
3 41 39 40
3 42 39 41
3 43 39 42
3 49 50 54
3 51 50 49
3 52 50 51
3 53 50 52
3 54 50 53
3 60 61 65
3 62 61 60
3 63 61 62
3 64 61 63
3 65 61 64
3 71 72 76
3 73 72 71
3 74 72 73
3 75 72 74
3 76 72 75
3 82 83 87
3 84 83 82
3 85 83 84
3 86 83 85
3 87 83 86
3 93 94 98
3 95 94 93
3 96 94 95
3 97 94 96
3 98 94 97
3 104 105 109
3 106 105 104
3 107 105 106
3 108 105 107
3 109 105 108
3 115 116 120
3 117 116 115
3 118 116 117
3 119 116 118
3 120 116 119
3 126 127 131
3 128 127 126
3 129 127 128
3 130 127 129
3 131 127 130
3 138 139 144
3 140 139 138
3 141 139 140
3 142 139 141
3 143 139 142
3 144 139 143
3 151 152 157
3 153 152 151
3 154 152 153
3 155 152 154
3 156 152 155
3 157 152 156
3 164 165 170
3 166 165 164
3 167 165 166
3 168 165 167
3 169 165 168
3 170 165 169
3 177 178 183
3 179 178 177
3 180 178 179
3 181 178 180
3 182 178 181
3 183 178 182
3 190 191 196
3 192 191 190
3 193 191 192
3 194 191 193
3 195 191 194
3 196 191 195
3 203 204 209
3 205 204 203
3 206 204 205
3 207 204 206
3 208 204 207
3 209 204 208
3 216 217 222
3 218 217 216
3 219 217 218
3 220 217 219
3 221 217 220
3 222 217 221
3 229 230 235
3 231 230 229
3 232 230 231
3 233 230 232
3 234 230 233
3 235 230 234
3 242 243 248
3 244 243 242
3 245 243 244
3 246 243 245
3 247 243 246
3 248 243 247
3 255 256 261
3 257 256 255
3 258 256 257
3 259 256 258
3 260 256 259
3 261 256 260
3 268 269 274
3 270 269 268
3 271 269 270
3 272 269 271
3 273 269 272
3 274 269 273
3 281 282 287
3 283 282 281
3 284 282 283
3 285 282 284
3 286 282 285
3 287 282 286
3 294 295 300
3 296 295 294
3 297 295 296
3 298 295 297
3 299 295 298
3 300 295 299
3 307 308 313
3 309 308 307
3 310 308 309
3 311 308 310
3 312 308 311
3 313 308 312
3 320 321 326
3 322 321 320
3 323 321 322
3 324 321 323
3 325 321 324
3 326 321 325
3 333 334 339
3 335 334 333
3 336 334 335
3 337 334 336
3 338 334 337
3 339 334 338
3 346 347 352
3 348 347 346
3 349 347 348
3 350 347 349
3 351 347 350
3 352 347 351
3 359 360 365
3 361 360 359
3 362 360 361
3 363 360 362
3 364 360 363
3 365 360 364
3 372 373 378
3 374 373 372
3 375 373 374
3 376 373 375
3 377 373 376
3 378 373 377
3 385 386 391
3 387 386 385
3 388 386 387
3 389 386 388
3 390 386 389
3 391 386 390
3 398 399 404
3 400 399 398
3 401 399 400
3 402 399 401
3 403 399 402
3 404 399 403
3 411 412 417
3 413 412 411
3 414 412 413
3 415 412 414
3 416 412 415
3 417 412 416
3 424 425 430
3 426 425 424
3 427 425 426
3 428 425 427
3 429 425 428
3 430 425 429
3 437 438 443
3 439 438 437
3 440 438 439
3 441 438 440
3 442 438 441
3 443 438 442
3 450 451 456
3 452 451 450
3 453 451 452
3 454 451 453
3 455 451 454
3 456 451 455
3 463 464 469
3 465 464 463
3 466 464 465
3 467 464 466
3 468 464 467
3 469 464 468
3 476 477 482
3 478 477 476
3 479 477 478
3 480 477 479
3 481 477 480
3 482 477 481
3 489 490 495
3 491 490 489
3 492 490 491
3 493 490 492
3 494 490 493
3 495 490 494
3 502 503 508
3 504 503 502
3 505 503 504
3 506 503 505
3 507 503 506
3 508 503 507
3 515 516 521
3 517 516 515
3 518 516 517
3 519 516 518
3 520 516 519
3 521 516 520
3 202 1 5
3 5 0 137
3 137 143 136
3 136 197 209
3 209 202 5
3 5 137 136
`;
class BallGlassMesh extends GlassMesh {
    static vertexBuffer = undefined;
    static vertexCount = undefined;
    static initValues(device) {
        const meshData = GlassMesh.createVertexBuffer(device, ballPLY, "Vertex buffer for arrow");
        this.vertexBuffer = meshData.vertexBuffer;
        this.vertexCount = meshData.vertexCount;
    }
    getVertexBuffer(device) {
        if (BallGlassMesh.vertexBuffer === undefined) {
            BallGlassMesh.initValues(device);
        }
        return BallGlassMesh.vertexBuffer;
    }
    get vertexCount() {
        if (BallGlassMesh.vertexBuffer === undefined) {
            console.error("Tried to get glass ball vertexcount before initialization");
            return 0;
        }
        return BallGlassMesh.vertexCount;
    }
}

const COLOR_AMOUNT$1 = 0.75;
class Fireball extends Entity {
    initialSpawnTime;
    currentSize;
    animationBuffer = mat4Impl.identity();
    color = new Float32Array([0.1, 0.1, COLOR_AMOUNT$1, COLOR_AMOUNT$1]);
    graphics = [new FireballGraphics(new BallGlassMesh(), this.animationBuffer, this.color, "static fireball")];
    currentAngle = 0;
    speed = 18.5;
    direction;
    team = "enemy";
    get activeCollider() { return this.state === "active" && !this.deleteMe; }
    collisionRadius = 2.15;
    damage = 1;
    state;
    remainingSpawnTime;
    constructor(initLocation, direction, initialSpawnTime = 0.25) {
        super(initLocation);
        this.initialSpawnTime = initialSpawnTime;
        this.direction = vec3Impl.normalize(direction);
        this.currentSize = this.collisionRadius;
        this.state = "spawning";
        this.remainingSpawnTime = initialSpawnTime;
        this.graphics.push(new DecalGraphics(this.collisionRadius, this.position, vec3Impl.fromValues(1, 0, 0)));
    }
    update(deltaTime) {
        switch (this.state) {
            case "spawning":
                this.remainingSpawnTime -= deltaTime;
                if (this.remainingSpawnTime <= 0) {
                    this.state = "active";
                    this.color[2] = COLOR_AMOUNT$1;
                    this.currentSize = this.collisionRadius;
                    break;
                }
                const ratio = smoothStep(1 - (this.remainingSpawnTime / this.initialSpawnTime));
                this.currentSize = this.collisionRadius * ratio;
                this.color[2] = COLOR_AMOUNT$1 * ratio;
                mat4Impl.identity(this.animationBuffer);
                break;
            case "active":
                vec3Impl.mulScalar(this.direction, this.speed * deltaTime, this.direction);
                mat4Impl.translate(this.transformMatrix, this.direction, this.transformMatrix);
                vec3Impl.normalize(this.direction, this.direction);
                //rotate the ball along the direction of travel
                this.currentAngle = (this.currentAngle + (deltaTime * Math.PI)) % (2 * Math.PI);
                mat4Impl.axisRotation(this.direction, this.currentAngle, this.animationBuffer);
                mat4Impl.translate(this.animationBuffer, vec3Impl.fromValues(0, -this.currentSize, 0), this.animationBuffer);
                mat4Impl.multiply(mat4Impl.translation(vec3Impl.fromValues(0, this.currentSize, 0)), this.animationBuffer, this.animationBuffer);
                break;
        }
        //animations
        mat4Impl.multiply(this.transformMatrix, this.animationBuffer, this.animationBuffer);
        mat4Impl.uniformScale(this.animationBuffer, this.currentSize, this.animationBuffer);
    }
    resolveCollision() {
        this.deleteMe = true;
    }
    onLeave() {
        this.deleteMe = true;
    }
    registerSystems(systems) {
        systems.playerCollisionSystem.register(this);
        systems.boundaryCheck.register(this);
    }
    destructor(controls, systems) {
        systems.playerCollisionSystem.remove(this);
        systems.boundaryCheck.remove(this);
    }
}

class FireballSpawner extends Entity {
    target;
    minInterval = 0.250;
    maxInterval = 1 - this.minInterval;
    interval = 1;
    size;
    //TODO: Create a system that keeps track of the player's location
    constructor(origin, size, target) {
        super(origin);
        this.target = target;
        this.childStack = [];
        this.size = size;
    }
    update(deltaTime) {
        this.interval -= deltaTime;
        if (this.interval > 0) {
            return;
        }
        const angle = Math.random() * 2 * Math.PI;
        const fireballPos = vec3Impl.create(Math.cos(angle), this.position[1], Math.sin(angle));
        vec3Impl.mulScalar(fireballPos, this.size / 2, fireballPos);
        const direction = vec3Impl.subtract(this.target.position, fireballPos);
        const fireball = new Fireball(fireballPos, direction);
        this.childStack.push(fireball);
        this.interval = this.minInterval + (Math.random() * this.maxInterval);
    }
}

class SceneContext {
    canvas;
    _origin;
    floor;
    _camera;
    get origin() {
        return this._origin;
    }
    set origin(value) {
        this._origin = value;
    }
    get camera() {
        return this._camera;
    }
    set camera(activeCamera) {
        this._camera = activeCamera;
    }
    get size() {
        return this.floor.size;
    }
    constructor(canvas, _origin, floor, _camera) {
        this.canvas = canvas;
        this._origin = _origin;
        this.floor = floor;
        this._camera = _camera;
    }
}

class CollisionEntity extends Entity {
    initialSpawnTime;
    get activeCollider() { return !this.deleteMe; }
    ;
    constructor(initLocation, initialSpawnTime = 0) {
        super(initLocation);
        this.initialSpawnTime = initialSpawnTime;
    }
    resolveCollision() {
        this.deleteMe = true;
    }
    onLeave() {
        this.deleteMe = true;
    }
    registerSystems(systems) {
        systems.playerCollisionSystem.register(this);
        systems.boundaryCheck.register(this);
    }
    destructor(controls, systems) {
        systems.playerCollisionSystem.remove(this);
        systems.boundaryCheck.remove(this);
    }
}

class HealthPack extends CollisionEntity {
    healthPackGraphics = new HealthPackGraphics(this.transformMatrix);
    decalGraphics;
    graphics = [this.healthPackGraphics];
    state = "spawning";
    remainingSpawnTime;
    team = "enemy";
    get activeCollider() { return this.state !== "spawning" && super.activeCollider; }
    collisionRadius = 1;
    damage = -1;
    constructor(initLocation, initialSpawnTime = 0) {
        super(initLocation, initialSpawnTime);
        this.state = "spawning";
        this.remainingSpawnTime = this.initialSpawnTime;
        this.healthPackGraphics.playSpawningAnim(initialSpawnTime);
        this.decalGraphics = new DecalGraphics(this.collisionRadius, this.position, vec3Impl.fromValues(0, 1, 0));
        this.decalGraphics.active = false;
        this.graphics.push(this.decalGraphics);
    }
    update(deltaTime) {
        switch (this.state) {
            case "spawning":
                this.remainingSpawnTime -= deltaTime;
                if (this.remainingSpawnTime <= 0) {
                    this.state = "active";
                    this.decalGraphics.active = true;
                    break;
                }
                break;
        }
        this.healthPackGraphics.update(deltaTime);
    }
}
const COLOR_AMOUNT = 0.8;
const targetColor = vec4Impl.fromValues(0.2 * COLOR_AMOUNT, COLOR_AMOUNT, 0.2 * COLOR_AMOUNT, COLOR_AMOUNT);
const initialColor = vec4Impl.fromValues(0.3, 0.3, 0.3, COLOR_AMOUNT);
var Coords;
(function (Coords) {
    Coords[Coords["right"] = 0] = "right";
    Coords[Coords["up"] = 1] = "up";
    Coords[Coords["forward"] = 2] = "forward";
    Coords[Coords["w"] = 3] = "w";
})(Coords || (Coords = {}));
class HealthPackGraphics extends FireballGraphics {
    healthPackTransforms;
    currentAnim;
    startingHeight = -2;
    targetHeight = 1.5;
    initialSpawnTime;
    remainingSpawnTime;
    animTranslation = vec3Impl.create(0, 0, 0);
    rampUpTime = 1;
    remainingRampTime = this.rampUpTime;
    targetAngularVelocity = 2 * Math.PI / 2; //radians per second
    angularVelocity = 0;
    currentAngle = 0;
    constructor(healthPackTransforms) {
        super(new CubeGlassMesh(), mat4Impl.create(), vec4Impl.fromValues(0, 0, 0, 0), "static Healthpack");
        this.healthPackTransforms = healthPackTransforms;
        this.playIdleAnim();
    }
    playSpawningAnim(spawnTime) {
        this.currentAnim = "spawning";
        this.initialSpawnTime = spawnTime;
        this.remainingSpawnTime = spawnTime;
        vec4Impl.copy(initialColor, this.colorData);
        this.animTranslation[Coords.up] = this.startingHeight;
        mat4Impl.translate(this.healthPackTransforms, this.animTranslation, this.transformData);
    }
    playIdleAnim() {
        this.currentAnim = "idle";
        vec4Impl.copy(targetColor, this.colorData);
        this.currentAngle = 0;
        this.angularVelocity = 0;
        this.remainingRampTime = this.rampUpTime;
        this.animTranslation[Coords.up] = this.targetHeight;
        mat4Impl.translate(this.healthPackTransforms, this.animTranslation, this.transformData);
    }
    update(deltaTime) {
        switch (this.currentAnim) {
            case "spawning":
                this.remainingSpawnTime -= deltaTime;
                if (this.remainingSpawnTime <= 0) {
                    this.playIdleAnim();
                    break;
                }
                const ratio = smoothStep(clampNormal(1 - (this.remainingSpawnTime / this.initialSpawnTime)));
                vec4Impl.lerp(initialColor, targetColor, ratio, this.colorData);
                this.animTranslation[Coords.up] = interpolate(this.startingHeight, this.targetHeight, ratio);
                mat4Impl.translate(this.healthPackTransforms, this.animTranslation, this.transformData);
                break;
            case "idle":
                if (this.remainingRampTime > 0) {
                    this.remainingRampTime -= deltaTime;
                    if (this.remainingRampTime <= 0) {
                        this.angularVelocity = this.targetAngularVelocity;
                    }
                    else {
                        this.angularVelocity = this.targetAngularVelocity * (1 - (this.remainingRampTime / this.rampUpTime));
                    }
                }
                this.currentAngle += (this.angularVelocity * deltaTime) % (2 * Math.PI);
                mat4Impl.rotateY(this.healthPackTransforms, this.currentAngle, this.transformData);
                mat4Impl.translate(this.transformData, this.animTranslation, this.transformData);
                break;
            default:
                this.currentAnim;
                break;
        }
    }
}

class HealthPackSpawner extends Entity {
    healthPackSpawnTime = 5;
    minInterval = this.healthPackSpawnTime * 1.5;
    maxInterval = this.healthPackSpawnTime * 2.5;
    interval = this.healthPackSpawnTime;
    childStack = [];
    size;
    //TODO: Create a system that keeps track of the player's location
    constructor(origin, size) {
        super(origin);
        this.size = size;
        this.spawnInitialHealthpacks(origin);
    }
    update(deltaTime) {
        this.interval -= deltaTime;
        if (this.interval > 0) {
            return;
        }
        const x = ((Math.random() * this.size) - (this.size / 2));
        const z = ((Math.random() * this.size) - (this.size / 2));
        const position = vec3Impl.create(x, this.position[1], z);
        const healthPack = new HealthPack(position, this.healthPackSpawnTime);
        this.childStack.push(healthPack);
        this.interval = this.minInterval + (Math.random() * this.maxInterval);
    }
    spawnInitialHealthpacks(origin) {
        const distance = (this.size / 2) * 0.75;
        const first = vec3Impl.copy(origin);
        const second = vec3Impl.copy(origin);
        const third = vec3Impl.copy(origin);
        first[0] += distance;
        second[0] -= distance;
        second[2] -= distance;
        third[0] -= distance;
        third[2] += distance;
        this.childStack.push(new HealthPack(first, this.healthPackSpawnTime));
        this.childStack.push(new HealthPack(second, this.healthPackSpawnTime));
        this.childStack.push(new HealthPack(third, this.healthPackSpawnTime));
    }
}

class Score {
    time;
    fireballsDodged;
    healthCollected;
    constructor() {
        this.time = 0;
        this.fireballsDodged = 0;
        this.healthCollected = 0;
    }
    update(deltaTime) {
        this.time += deltaTime;
    }
    getMinutes() {
        return Math.floor(Math.floor(this.time) / 60);
    }
    getSeconds() {
        return Math.floor(this.time) % 60;
    }
}

const sceneSize = 100;
const origin = vec3Impl.fromValues(0, 0, 0);
class Scene {
    canvas;
    camera;
    player;
    context;
    terrain;
    spawner;
    healthSpawner;
    controls;
    systems;
    entities = [];
    graphicsOrganizer = new GraphicsOrganizer();
    score = new Score();
    constructor(canvas) {
        this.canvas = canvas;
        this.camera = new TopCamera(this.canvas);
        this.terrain = new Floor(sceneSize);
        this.player = new Player(origin);
        //ideally no entity takes another entity as a constructor argument
        //systems or controls should use context to find targets for entities upon execute() or upon request.
        this.spawner = new FireballSpawner(origin, sceneSize, this.player);
        this.healthSpawner = new HealthPackSpawner(origin, sceneSize * 0.70);
        //context should also have a reference to the entity array for targeting AI.
        this.context = new SceneContext(canvas, vec3Impl.fromValues(0, 0, 0), this.terrain, this.camera);
        this.controls = new Controls(this.context);
        this.systems = new Systems(this.context);
        this.addEntity(this.camera);
        this.addEntity(this.terrain);
        this.addEntity(this.player);
        this.addEntity(this.spawner);
        this.addEntity(this.healthSpawner);
    }
    //these functions are recursive in an odd way and if there are circular references in liftStack then it may loop infinitely.
    addEntity(entity) {
        if (entity === undefined)
            return;
        entity.attachControls(this.controls);
        entity.registerSystems(this.systems);
        //May want to check if an entity is already in the list before pushing it perhaps
        this.entities.push(entity);
        this.graphicsOrganizer.register(entity.graphics);
        this.liftChildren(entity);
    }
    liftChildren(entity) {
        if (entity.childStack !== null) {
            while (entity.childStack.length > 0) {
                this.addEntity(entity.childStack.pop());
            }
        }
    }
    //This is O(n) on every update loop. May want to try lazy deletion if the cost is too high.
    processDeletedEntities() {
        let j = 0;
        for (let i = 0; i < this.entities.length; i++) {
            if (this.entities[i].deleteMe) {
                this.graphicsOrganizer.remove(this.entities[i].graphics);
                this.entities[i].destructor(this.controls, this.systems);
            }
            else {
                if (i !== j) {
                    this.entities[j] = this.entities[i];
                }
                j++;
            }
        }
        this.entities.length = j;
    }
    onResize() {
        this.camera.setAspect(this.canvas.width / this.canvas.height);
    }
    isGameOver() {
        return this.player.health <= 0;
    }
    getScore() {
        return this.score;
    }
    update(deltaTime) {
        this.processDeletedEntities();
        for (const entity of this.entities) {
            this.liftChildren(entity);
        }
        for (const entity of this.entities) {
            entity.update(deltaTime);
        }
        this.systems.execute();
        if (!this.isGameOver()) {
            this.score.update(deltaTime);
        }
    }
    removeEventListeners() {
        this.controls.abortEventListeners();
    }
}

const canvas = document.querySelector('canvas');
const devicePixelRatio = window.devicePixelRatio;
canvas.width = canvas.clientWidth * devicePixelRatio;
canvas.height = canvas.clientHeight * devicePixelRatio;
window.addEventListener('contextmenu', cancelEvent, { passive: false });
window.addEventListener('touchmove', cancelEvent, { passive: false });
window.addEventListener('touchend', cancelEvent, { passive: false });
window.addEventListener('touchstart', translateTouchStartToMouseEvent, { passive: false });
let menu = new Menu();
let scene = new Scene(canvas);
let renderer = new Renderer(canvas);
await renderer.initialized;
function onCanvasResize(entries) {
    for (let entry of entries) {
        canvas.width = Math.max(1, entry.devicePixelContentBoxSize[0].inlineSize);
        canvas.height = Math.max(1, entry.devicePixelContentBoxSize[0].blockSize);
    }
    scene.onResize();
    renderer.render(scene.graphicsOrganizer);
}
const resizeObserver = new ResizeObserver(onCanvasResize);
resizeObserver.observe(canvas);
//time in miliseconds.
let lastFrameMS = performance.now();
const MIN_ALLOWABLE_FRAMERATE = 20;
function frame() {
    const now = performance.now();
    const deltaTime = (now - lastFrameMS) / 1000;
    lastFrameMS = now;
    menu.checkFocus();
    //TODO:flesh out states and transitions for current scene based on state. Game over scene, tutorial scene, Main menu scene, etc...
    if (scene.isGameOver()) {
        scene.removeEventListeners();
        menu.showGameOver(scene.getScore());
        return;
    }
    if (!menu.isInGame()) {
        renderer.render(scene.graphicsOrganizer);
        return;
    }
    //large spans of time due to either being minimized or lag are simply discarded. 
    //Not sure how well this works, but we do not want the game state to change significantly if it cannot be displayed to the screen.
    if (deltaTime <= 1 / MIN_ALLOWABLE_FRAMERATE) {
        scene.update(deltaTime);
    }
    renderer.render(scene.graphicsOrganizer);
    requestAnimationFrame(frame);
    return;
}
requestAnimationFrame(frame);
document.addEventListener('startNewGame', (e) => {
    scene.removeEventListeners();
    scene = new Scene(canvas);
    requestAnimationFrame(frame);
    scene.onResize();
    renderer.render(scene.graphicsOrganizer);
});
document.addEventListener('unpause', (e) => {
    requestAnimationFrame(frame);
});

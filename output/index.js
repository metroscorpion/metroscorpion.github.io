import { m as mat4Impl, v as vec3Impl, a as vec4Impl } from './notMyStuff.js';

class BindGroupLayouts {
    camera;
    transform;
    fireball;
    constructor(device) {
        this.camera = device.createBindGroupLayout(cameraBindGroupLayoutDescriptor);
        this.transform = device.createBindGroupLayout(transformBindGroupLayoutDescriptor);
        this.fireball = device.createBindGroupLayout(fireBallBindGroupLayoutDescriptor);
    }
}
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

const preferredCanvasFormat$1 = navigator.gpu.getPreferredCanvasFormat();
const primitives = {
    topology: 'triangle-list',
    cullMode: 'none',
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
                bindGroupLayouts.fireball,
            ],
        }),
        vertex: {
            module: shader,
            entryPoint: "fireballVert",
            buffers: [{
                    arrayStride: SimpleMesh.simpleVertexSize,
                    attributes: [{
                            shaderLocation: 0,
                            offset: SimpleMesh.simplePositionOffset,
                            format: 'float32x4',
                        },],
                }],
        },
        fragment: {
            module: shader,
            entryPoint: "fireballFrag",
            targets: [{
                    format: preferredCanvasFormat,
                },],
        },
        primitive: primitives,
        depthStencil: depthStencilFormat,
    });
}
const fireballCode = /*wgsl*/ `
    @group(0) @binding(0) var<uniform> viewProjectionMatrix:mat4x4f;
    @group(1) @binding(0) var<uniform> transformMatrix: mat4x4f;
    @group(1) @binding(1) var<uniform> color: vec4f;

    @vertex
    fn fireballVert(@location(0) position: vec4f) -> @builtin(position) vec4f {
        return viewProjectionMatrix * transformMatrix * position;  
    }
    
    @fragment
    fn fireballFrag() -> @location(0) vec4f {
        return color;
    }
`;

class Pipelines {
    simple;
    fireball;
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
            passEncoder.setPipeline(this.pipelines.fireball);
            for (let fireball of graphics.fireballs) {
                if (!fireball.active)
                    continue;
                if (fireball.vertexBuffer === null)
                    fireball.initialize(this.device, this.bindGroupLayouts);
                passEncoder.setVertexBuffer(0, fireball.vertexBuffer);
                passEncoder.setBindGroup(1, fireball.bindGroup);
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
    cameras = [];
    simples = [];
    fireballs = [];
    initList = [];
    register(graphicsComponent) {
        if (graphicsComponent === null) {
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
        }
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
    vertexBuffer;
    transformBuffer;
    bindGroup;
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
        device.queue.writeBuffer(this.transformBuffer, 0, this.parentData.buffer, this.parentData.byteOffset, this.parentData.byteLength);
    }
    destroy() {
        this.vertexBuffer.destroy();
        this.transformBuffer.destroy();
        this.vertexBuffer = undefined;
        this.transformBuffer = undefined;
        this.bindGroup = undefined;
        this.parentData = undefined;
    }
}
class CameraGraphics {
    active = true;
    kind = "camera";
    buffer;
    bindGroup;
    parentCameraMatrix;
    constructor(cameraMatrix) {
        this.parentCameraMatrix = cameraMatrix;
    }
    initialize(device, bindGroupLayouts) {
        this.buffer = device.createBuffer({
            size: 4 * 4 * Float32Array.BYTES_PER_ELEMENT,
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
    transformData;
    colorData;
    label;
    kind = "fireball";
    active = true;
    transformBuffer;
    colorBuffer;
    bindGroup;
    vertexBuffer;
    constructor(mesh, transformData, colorData, label = "") {
        this.mesh = mesh;
        this.transformData = transformData;
        this.colorData = colorData;
        this.label = label;
    }
    initialize(device, bindGroupLayouts) {
        //if you use the singleton buffer don't destroy it.
        this.vertexBuffer = this.mesh.getVertexBuffer(device);
        this.transformBuffer = device.createBuffer({
            label: "Transform Buffer for " + this.label,
            size: 4 * 4 * Float32Array.BYTES_PER_ELEMENT,
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
                        buffer: this.transformBuffer,
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
        device.queue.writeBuffer(this.transformBuffer, 0, this.transformData.buffer, this.transformData.byteOffset, this.transformData.byteLength);
        device.queue.writeBuffer(this.colorBuffer, 0, this.colorData.buffer, this.colorData.byteOffset, this.colorData.byteLength);
    }
    destroy() {
        this.transformBuffer.destroy();
        this.colorBuffer.destroy();
        this.bindGroup = null;
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
        this.graphics = new CameraGraphics(this.viewProjectionMatrix);
    }
    setAspect(aspect) {
        this.aspect = aspect;
        this.projection = mat4Impl.perspective(this.fieldOfView, this.aspect, 1, 100);
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
    -1, 0, 1, 1, 0, 1, 0, 1, 0, 0,
    -1, 0, -1, 1, 0, 1, 0, 1, 0, 1,
    1, 0, 1, 1, 0, 1, 0, 1, 1, 0,
    1, 0, 1, 1, 0, 1, 0, 1, 1, 0,
    1, 0, -1, 1, 0, 1, 0, 1, 1, 1,
    -1, 0, -1, 1, 0, 1, 0, 1, 0, 1,
]);
class FloorMesh extends SimpleMesh {
    constructor() {
        super(floorVertexCount, floorVertexArray);
    }
}

var Coords;
(function (Coords) {
    Coords[Coords["x"] = 0] = "x";
    Coords[Coords["y"] = 1] = "y";
    Coords[Coords["z"] = 2] = "z";
})(Coords || (Coords = {}));
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

const vertCount = 540;
const vertices = new Float32Array([
    0.000000, 0.000000, 0.000000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.650000, 0.000000,
    0.000000, 0.048943, 0.309017, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.700000, 0.100000,
    -0.181636, 0.048943, 0.250000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.600000, 0.100000,
    0.000000, 0.690983, 0.951056, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.700000, 0.400000,
    -0.475528, 0.412215, 0.654509, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.600000, 0.300000,
    0.000000, 0.412215, 0.809017, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.700000, 0.300000,
    0.000000, 1.309017, 0.951056, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.700000, 0.600000,
    -0.475528, 1.587785, 0.654509, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.600000, 0.700000,
    -0.559017, 1.309017, 0.769421, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.600000, 0.600000,
    0.000000, 1.951056, 0.309017, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.700000, 0.900000,
    0.000000, 2.000000, 0.000000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.650000, 1.000000,
    -0.181636, 1.951056, 0.250000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.600000, 0.900000,
    0.000000, 0.412215, 0.809017, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.700000, 0.300000,
    -0.345492, 0.190983, 0.475528, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.600000, 0.200000,
    0.000000, 0.190983, 0.587785, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.700000, 0.200000,
    0.000000, 1.309017, 0.951056, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.700000, 0.600000,
    -0.587785, 1.000000, 0.809017, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.600000, 0.500000,
    0.000000, 1.000000, 1.000000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.700000, 0.500000,
    0.000000, 1.951056, 0.309017, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.700000, 0.900000,
    -0.345492, 1.809017, 0.475528, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.600000, 0.800000,
    0.000000, 1.809017, 0.587785, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.700000, 0.800000,
    0.000000, 0.048943, 0.309017, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.700000, 0.100000,
    -0.345492, 0.190983, 0.475528, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.600000, 0.200000,
    -0.181636, 0.048943, 0.250000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.600000, 0.100000,
    0.000000, 0.690983, 0.951056, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.700000, 0.400000,
    -0.587785, 1.000000, 0.809017, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.600000, 0.500000,
    -0.559017, 0.690983, 0.769421, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.600000, 0.400000,
    0.000000, 1.587785, 0.809017, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.700000, 0.700000,
    -0.345492, 1.809017, 0.475528, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.600000, 0.800000,
    -0.475528, 1.587785, 0.654509, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.600000, 0.700000,
    -0.559017, 0.690983, 0.769421, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.600000, 0.400000,
    -0.769421, 0.412215, 0.250000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.500000, 0.300000,
    -0.475528, 0.412215, 0.654509, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.600000, 0.300000,
    -0.559017, 1.309017, 0.769421, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.600000, 0.600000,
    -0.769421, 1.587785, 0.250000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.500000, 0.700000,
    -0.904509, 1.309017, 0.293893, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.500000, 0.600000,
    -0.181636, 1.951056, 0.250000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.600000, 0.900000,
    0.000000, 2.000000, 0.000000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.550000, 1.000000,
    -0.293893, 1.951056, 0.095492, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.500000, 0.900000,
    -0.475528, 0.412215, 0.654509, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.600000, 0.300000,
    -0.559017, 0.190983, 0.181636, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.500000, 0.200000,
    -0.345492, 0.190983, 0.475528, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.600000, 0.200000,
    -0.587785, 1.000000, 0.809017, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.600000, 0.500000,
    -0.904509, 1.309017, 0.293893, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.500000, 0.600000,
    -0.951057, 1.000000, 0.309017, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.500000, 0.500000,
    -0.181636, 1.951056, 0.250000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.600000, 0.900000,
    -0.559017, 1.809017, 0.181636, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.500000, 0.800000,
    -0.345492, 1.809017, 0.475528, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.600000, 0.800000,
    -0.345492, 0.190983, 0.475528, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.600000, 0.200000,
    -0.293893, 0.048943, 0.095492, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.500000, 0.100000,
    -0.181636, 0.048943, 0.250000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.600000, 0.100000,
    -0.587785, 1.000000, 0.809017, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.600000, 0.500000,
    -0.904509, 0.690983, 0.293893, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.500000, 0.400000,
    -0.559017, 0.690983, 0.769421, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.600000, 0.400000,
    -0.345492, 1.809017, 0.475528, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.600000, 0.800000,
    -0.769421, 1.587785, 0.250000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.500000, 0.700000,
    -0.475528, 1.587785, 0.654509, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.600000, 0.700000,
    0.000000, 0.000000, 0.000000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.550000, 0.000000,
    -0.181636, 0.048943, 0.250000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.600000, 0.100000,
    -0.293893, 0.048943, 0.095492, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.500000, 0.100000,
    -0.559017, 1.809017, 0.181636, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.500000, 0.800000,
    -0.769421, 1.587785, -0.250000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.400000, 0.700000,
    -0.769421, 1.587785, 0.250000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.500000, 0.700000,
    0.000000, 0.000000, 0.000000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.450000, 0.000000,
    -0.293893, 0.048943, 0.095492, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.500000, 0.100000,
    -0.293893, 0.048943, -0.095492, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.400000, 0.100000,
    -0.769421, 0.412215, 0.250000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.500000, 0.300000,
    -0.904509, 0.690983, -0.293893, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.400000, 0.400000,
    -0.769421, 0.412215, -0.250000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.400000, 0.300000,
    -0.769421, 1.587785, 0.250000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.500000, 0.700000,
    -0.904509, 1.309017, -0.293893, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.400000, 0.600000,
    -0.904509, 1.309017, 0.293893, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.500000, 0.600000,
    -0.293893, 1.951056, 0.095492, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.500000, 0.900000,
    0.000000, 2.000000, 0.000000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.450000, 1.000000,
    -0.293893, 1.951056, -0.095492, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.400000, 0.900000,
    -0.769421, 0.412215, 0.250000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.500000, 0.300000,
    -0.559017, 0.190983, -0.181636, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.400000, 0.200000,
    -0.559017, 0.190983, 0.181636, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.500000, 0.200000,
    -0.904509, 1.309017, 0.293893, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.500000, 0.600000,
    -0.951057, 1.000000, -0.309017, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.400000, 0.500000,
    -0.951057, 1.000000, 0.309017, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.500000, 0.500000,
    -0.293893, 1.951056, 0.095492, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.500000, 0.900000,
    -0.559017, 1.809017, -0.181636, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.400000, 0.800000,
    -0.559017, 1.809017, 0.181636, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.500000, 0.800000,
    -0.293893, 0.048943, 0.095492, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.500000, 0.100000,
    -0.559017, 0.190983, -0.181636, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.400000, 0.200000,
    -0.293893, 0.048943, -0.095492, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.400000, 0.100000,
    -0.951057, 1.000000, 0.309017, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.500000, 0.500000,
    -0.904509, 0.690983, -0.293893, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.400000, 0.400000,
    -0.904509, 0.690983, 0.293893, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.500000, 0.400000,
    -0.559017, 0.190983, -0.181636, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.400000, 0.200000,
    -0.181636, 0.048943, -0.250000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.300000, 0.100000,
    -0.293893, 0.048943, -0.095492, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.400000, 0.100000,
    -0.904509, 0.690983, -0.293893, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.400000, 0.400000,
    -0.587785, 1.000000, -0.809017, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.300000, 0.500000,
    -0.559017, 0.690983, -0.769421, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.300000, 0.400000,
    -0.769421, 1.587785, -0.250000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.400000, 0.700000,
    -0.345492, 1.809017, -0.475528, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.300000, 0.800000,
    -0.475528, 1.587785, -0.654509, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.300000, 0.700000,
    0.000000, 0.000000, 0.000000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.350000, 0.000000,
    -0.293893, 0.048943, -0.095492, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.400000, 0.100000,
    -0.181636, 0.048943, -0.250000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.300000, 0.100000,
    -0.904509, 0.690983, -0.293893, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.400000, 0.400000,
    -0.475528, 0.412215, -0.654509, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.300000, 0.300000,
    -0.769421, 0.412215, -0.250000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.400000, 0.300000,
    -0.769421, 1.587785, -0.250000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.400000, 0.700000,
    -0.559017, 1.309017, -0.769421, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.300000, 0.600000,
    -0.904509, 1.309017, -0.293893, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.400000, 0.600000,
    -0.293893, 1.951056, -0.095492, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.400000, 0.900000,
    0.000000, 2.000000, 0.000000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.350000, 1.000000,
    -0.181636, 1.951056, -0.250000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.300000, 0.900000,
    -0.769421, 0.412215, -0.250000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.400000, 0.300000,
    -0.345492, 0.190983, -0.475528, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.300000, 0.200000,
    -0.559017, 0.190983, -0.181636, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.400000, 0.200000,
    -0.951057, 1.000000, -0.309017, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.400000, 0.500000,
    -0.559017, 1.309017, -0.769421, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.300000, 0.600000,
    -0.587785, 1.000000, -0.809017, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.300000, 0.500000,
    -0.559017, 1.809017, -0.181636, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.400000, 0.800000,
    -0.181636, 1.951056, -0.250000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.300000, 0.900000,
    -0.345492, 1.809017, -0.475528, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.300000, 0.800000,
    -0.559017, 1.309017, -0.769421, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.300000, 0.600000,
    -0.000000, 1.000000, -1.000000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.200000, 0.500000,
    -0.587785, 1.000000, -0.809017, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.300000, 0.500000,
    -0.181636, 1.951056, -0.250000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.300000, 0.900000,
    -0.000000, 1.809017, -0.587785, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.200000, 0.800000,
    -0.345492, 1.809017, -0.475528, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.300000, 0.800000,
    -0.345492, 0.190983, -0.475528, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.300000, 0.200000,
    -0.000000, 0.048943, -0.309017, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.200000, 0.100000,
    -0.181636, 0.048943, -0.250000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.300000, 0.100000,
    -0.587785, 1.000000, -0.809017, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.300000, 0.500000,
    -0.000000, 0.690983, -0.951057, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.200000, 0.400000,
    -0.559017, 0.690983, -0.769421, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.300000, 0.400000,
    -0.345492, 1.809017, -0.475528, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.300000, 0.800000,
    -0.000000, 1.587785, -0.809017, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.200000, 0.700000,
    -0.475528, 1.587785, -0.654509, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.300000, 0.700000,
    0.000000, 0.000000, 0.000000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.250000, 0.000000,
    -0.181636, 0.048943, -0.250000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.300000, 0.100000,
    -0.000000, 0.048943, -0.309017, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.200000, 0.100000,
    -0.559017, 0.690983, -0.769421, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.300000, 0.400000,
    -0.000000, 0.412215, -0.809017, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.200000, 0.300000,
    -0.475528, 0.412215, -0.654509, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.300000, 0.300000,
    -0.475528, 1.587785, -0.654509, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.300000, 0.700000,
    -0.000000, 1.309017, -0.951057, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.200000, 0.600000,
    -0.559017, 1.309017, -0.769421, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.300000, 0.600000,
    -0.181636, 1.951056, -0.250000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.300000, 0.900000,
    0.000000, 2.000000, 0.000000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.250000, 1.000000,
    -0.000000, 1.951056, -0.309017, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.200000, 0.900000,
    -0.475528, 0.412215, -0.654509, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.300000, 0.300000,
    -0.000000, 0.190983, -0.587785, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.200000, 0.200000,
    -0.345492, 0.190983, -0.475528, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.300000, 0.200000,
    -0.000000, 1.951056, -0.309017, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.200000, 0.900000,
    0.000000, 2.000000, 0.000000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.150000, 1.000000,
    0.181636, 1.951056, -0.250000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.100000, 0.900000,
    -0.000000, 0.412215, -0.809017, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.200000, 0.300000,
    0.345491, 0.190983, -0.475528, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.100000, 0.200000,
    -0.000000, 0.190983, -0.587785, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.200000, 0.200000,
    -0.000000, 1.309017, -0.951057, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.200000, 0.600000,
    0.587785, 1.000000, -0.809017, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.100000, 0.500000,
    -0.000000, 1.000000, -1.000000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.200000, 0.500000,
    -0.000000, 1.951056, -0.309017, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.200000, 0.900000,
    0.345491, 1.809017, -0.475528, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.100000, 0.800000,
    -0.000000, 1.809017, -0.587785, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.200000, 0.800000,
    -0.000000, 0.190983, -0.587785, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.200000, 0.200000,
    0.181636, 0.048943, -0.250000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.100000, 0.100000,
    -0.000000, 0.048943, -0.309017, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.200000, 0.100000,
    -0.000000, 1.000000, -1.000000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.200000, 0.500000,
    0.559017, 0.690983, -0.769421, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.100000, 0.400000,
    -0.000000, 0.690983, -0.951057, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.200000, 0.400000,
    -0.000000, 1.809017, -0.587785, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.200000, 0.800000,
    0.475528, 1.587785, -0.654509, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.100000, 0.700000,
    -0.000000, 1.587785, -0.809017, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.200000, 0.700000,
    0.000000, 0.000000, 0.000000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.150000, 0.000000,
    -0.000000, 0.048943, -0.309017, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.200000, 0.100000,
    0.181636, 0.048943, -0.250000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.100000, 0.100000,
    -0.000000, 0.690983, -0.951057, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.200000, 0.400000,
    0.475528, 0.412215, -0.654509, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.100000, 0.300000,
    -0.000000, 0.412215, -0.809017, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.200000, 0.300000,
    -0.000000, 1.587785, -0.809017, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.200000, 0.700000,
    0.559017, 1.309017, -0.769421, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.100000, 0.600000,
    -0.000000, 1.309017, -0.951057, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.200000, 0.600000,
    0.475528, 1.587785, -0.654509, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.100000, 0.700000,
    0.904509, 1.309017, -0.293893, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.000000, 0.600000,
    0.559017, 1.309017, -0.769421, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.100000, 0.600000,
    0.181636, 1.951056, -0.250000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.100000, 0.900000,
    0.000000, 2.000000, 0.000000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.050000, 1.000000,
    0.293893, 1.951056, -0.095492, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.000000, 0.900000,
    0.475528, 0.412215, -0.654509, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.100000, 0.300000,
    0.559017, 0.190983, -0.181636, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.000000, 0.200000,
    0.345491, 0.190983, -0.475528, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.100000, 0.200000,
    0.559017, 1.309017, -0.769421, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.100000, 0.600000,
    0.951057, 1.000000, -0.309017, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.000000, 0.500000,
    0.587785, 1.000000, -0.809017, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.100000, 0.500000,
    0.345491, 1.809017, -0.475528, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.100000, 0.800000,
    0.293893, 1.951056, -0.095492, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.000000, 0.900000,
    0.559017, 1.809017, -0.181636, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.000000, 0.800000,
    0.181636, 0.048943, -0.250000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.100000, 0.100000,
    0.559017, 0.190983, -0.181636, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.000000, 0.200000,
    0.293893, 0.048943, -0.095492, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.000000, 0.100000,
    0.559017, 0.690983, -0.769421, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.100000, 0.400000,
    0.951057, 1.000000, -0.309017, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.000000, 0.500000,
    0.904509, 0.690983, -0.293893, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.000000, 0.400000,
    0.345491, 1.809017, -0.475528, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.100000, 0.800000,
    0.769421, 1.587785, -0.250000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.000000, 0.700000,
    0.475528, 1.587785, -0.654509, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.100000, 0.700000,
    0.000000, 0.000000, 0.000000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.050000, 0.000000,
    0.181636, 0.048943, -0.250000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.100000, 0.100000,
    0.293893, 0.048943, -0.095492, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.000000, 0.100000,
    0.559017, 0.690983, -0.769421, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.100000, 0.400000,
    0.769421, 0.412215, -0.250000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.000000, 0.300000,
    0.475528, 0.412215, -0.654509, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.100000, 0.300000,
    0.000000, 0.000000, 0.000000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.950000, 0.000000,
    0.293893, 0.048943, -0.095492, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 1.000000, 0.100000,
    0.293893, 0.048943, 0.095491, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.900000, 0.100000,
    0.769421, 0.412215, -0.250000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 1.000000, 0.300000,
    0.904509, 0.690983, 0.293893, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.900000, 0.400000,
    0.769421, 0.412215, 0.250000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.900000, 0.300000,
    0.769421, 1.587785, -0.250000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 1.000000, 0.700000,
    0.904509, 1.309017, 0.293893, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.900000, 0.600000,
    0.904509, 1.309017, -0.293893, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 1.000000, 0.600000,
    0.293893, 1.951056, -0.095492, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 1.000000, 0.900000,
    0.000000, 2.000000, 0.000000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.950000, 1.000000,
    0.293893, 1.951056, 0.095491, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.900000, 0.900000,
    0.769421, 0.412215, -0.250000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 1.000000, 0.300000,
    0.559017, 0.190983, 0.181636, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.900000, 0.200000,
    0.559017, 0.190983, -0.181636, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 1.000000, 0.200000,
    0.951057, 1.000000, -0.309017, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 1.000000, 0.500000,
    0.904509, 1.309017, 0.293893, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.900000, 0.600000,
    0.951057, 1.000000, 0.309017, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.900000, 0.500000,
    0.293893, 1.951056, -0.095492, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 1.000000, 0.900000,
    0.559017, 1.809017, 0.181636, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.900000, 0.800000,
    0.559017, 1.809017, -0.181636, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 1.000000, 0.800000,
    0.293893, 0.048943, -0.095492, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 1.000000, 0.100000,
    0.559017, 0.190983, 0.181636, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.900000, 0.200000,
    0.293893, 0.048943, 0.095491, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.900000, 0.100000,
    0.951057, 1.000000, -0.309017, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 1.000000, 0.500000,
    0.904509, 0.690983, 0.293893, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.900000, 0.400000,
    0.904509, 0.690983, -0.293893, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 1.000000, 0.400000,
    0.769421, 1.587785, -0.250000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 1.000000, 0.700000,
    0.559017, 1.809017, 0.181636, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.900000, 0.800000,
    0.769421, 1.587785, 0.250000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.900000, 0.700000,
    0.904509, 0.690983, 0.293893, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.900000, 0.400000,
    0.587785, 1.000000, 0.809017, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.800000, 0.500000,
    0.559017, 0.690983, 0.769421, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.800000, 0.400000,
    0.769421, 1.587785, 0.250000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.900000, 0.700000,
    0.345492, 1.809017, 0.475528, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.800000, 0.800000,
    0.475528, 1.587785, 0.654508, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.800000, 0.700000,
    0.000000, 0.000000, 0.000000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.850000, 0.000000,
    0.293893, 0.048943, 0.095491, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.900000, 0.100000,
    0.181636, 0.048943, 0.250000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.800000, 0.100000,
    0.904509, 0.690983, 0.293893, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.900000, 0.400000,
    0.475528, 0.412215, 0.654508, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.800000, 0.300000,
    0.769421, 0.412215, 0.250000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.900000, 0.300000,
    0.904509, 1.309017, 0.293893, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.900000, 0.600000,
    0.475528, 1.587785, 0.654508, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.800000, 0.700000,
    0.559017, 1.309017, 0.769421, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.800000, 0.600000,
    0.293893, 1.951056, 0.095491, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.900000, 0.900000,
    0.000000, 2.000000, 0.000000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.850000, 1.000000,
    0.181636, 1.951056, 0.250000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.800000, 0.900000,
    0.769421, 0.412215, 0.250000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.900000, 0.300000,
    0.345492, 0.190983, 0.475528, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.800000, 0.200000,
    0.559017, 0.190983, 0.181636, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.900000, 0.200000,
    0.904509, 1.309017, 0.293893, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.900000, 0.600000,
    0.587785, 1.000000, 0.809017, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.800000, 0.500000,
    0.951057, 1.000000, 0.309017, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.900000, 0.500000,
    0.293893, 1.951056, 0.095491, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.900000, 0.900000,
    0.345492, 1.809017, 0.475528, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.800000, 0.800000,
    0.559017, 1.809017, 0.181636, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.900000, 0.800000,
    0.293893, 0.048943, 0.095491, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.900000, 0.100000,
    0.345492, 0.190983, 0.475528, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.800000, 0.200000,
    0.181636, 0.048943, 0.250000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.800000, 0.100000,
    0.181636, 1.951056, 0.250000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.800000, 0.900000,
    0.000000, 1.809017, 0.587785, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.700000, 0.800000,
    0.345492, 1.809017, 0.475528, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.800000, 0.800000,
    0.345492, 0.190983, 0.475528, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.800000, 0.200000,
    0.000000, 0.048943, 0.309017, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.700000, 0.100000,
    0.181636, 0.048943, 0.250000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.800000, 0.100000,
    0.587785, 1.000000, 0.809017, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.800000, 0.500000,
    0.000000, 0.690983, 0.951056, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.700000, 0.400000,
    0.559017, 0.690983, 0.769421, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.800000, 0.400000,
    0.475528, 1.587785, 0.654508, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.800000, 0.700000,
    0.000000, 1.809017, 0.587785, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.700000, 0.800000,
    0.000000, 1.587785, 0.809017, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.700000, 0.700000,
    0.000000, 0.000000, 0.000000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.750000, 0.000000,
    0.181636, 0.048943, 0.250000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.800000, 0.100000,
    0.000000, 0.048943, 0.309017, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.700000, 0.100000,
    0.559017, 0.690983, 0.769421, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.800000, 0.400000,
    0.000000, 0.412215, 0.809017, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.700000, 0.300000,
    0.475528, 0.412215, 0.654508, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.800000, 0.300000,
    0.475528, 1.587785, 0.654508, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.800000, 0.700000,
    0.000000, 1.309017, 0.951056, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.700000, 0.600000,
    0.559017, 1.309017, 0.769421, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.800000, 0.600000,
    0.181636, 1.951056, 0.250000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.800000, 0.900000,
    0.000000, 2.000000, 0.000000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.750000, 1.000000,
    0.000000, 1.951056, 0.309017, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.700000, 0.900000,
    0.475528, 0.412215, 0.654508, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.800000, 0.300000,
    0.000000, 0.190983, 0.587785, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.700000, 0.200000,
    0.345492, 0.190983, 0.475528, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.800000, 0.200000,
    0.559017, 1.309017, 0.769421, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.800000, 0.600000,
    0.000000, 1.000000, 1.000000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.700000, 0.500000,
    0.587785, 1.000000, 0.809017, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.800000, 0.500000,
    0.000000, 0.690983, 0.951056, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.700000, 0.400000,
    -0.559017, 0.690983, 0.769421, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.600000, 0.400000,
    -0.475528, 0.412215, 0.654509, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.600000, 0.300000,
    0.000000, 1.309017, 0.951056, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.700000, 0.600000,
    0.000000, 1.587785, 0.809017, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.700000, 0.700000,
    -0.475528, 1.587785, 0.654509, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.600000, 0.700000,
    0.000000, 0.412215, 0.809017, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.700000, 0.300000,
    -0.475528, 0.412215, 0.654509, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.600000, 0.300000,
    -0.345492, 0.190983, 0.475528, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.600000, 0.200000,
    0.000000, 1.309017, 0.951056, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.700000, 0.600000,
    -0.559017, 1.309017, 0.769421, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.600000, 0.600000,
    -0.587785, 1.000000, 0.809017, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.600000, 0.500000,
    0.000000, 1.951056, 0.309017, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.700000, 0.900000,
    -0.181636, 1.951056, 0.250000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.600000, 0.900000,
    -0.345492, 1.809017, 0.475528, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.600000, 0.800000,
    0.000000, 0.048943, 0.309017, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.700000, 0.100000,
    0.000000, 0.190983, 0.587785, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.700000, 0.200000,
    -0.345492, 0.190983, 0.475528, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.600000, 0.200000,
    0.000000, 0.690983, 0.951056, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.700000, 0.400000,
    0.000000, 1.000000, 1.000000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.700000, 0.500000,
    -0.587785, 1.000000, 0.809017, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.600000, 0.500000,
    0.000000, 1.587785, 0.809017, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.700000, 0.700000,
    0.000000, 1.809017, 0.587785, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.700000, 0.800000,
    -0.345492, 1.809017, 0.475528, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.600000, 0.800000,
    -0.559017, 0.690983, 0.769421, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.600000, 0.400000,
    -0.904509, 0.690983, 0.293893, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.500000, 0.400000,
    -0.769421, 0.412215, 0.250000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.500000, 0.300000,
    -0.559017, 1.309017, 0.769421, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.600000, 0.600000,
    -0.475528, 1.587785, 0.654509, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.600000, 0.700000,
    -0.769421, 1.587785, 0.250000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.500000, 0.700000,
    -0.475528, 0.412215, 0.654509, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.600000, 0.300000,
    -0.769421, 0.412215, 0.250000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.500000, 0.300000,
    -0.559017, 0.190983, 0.181636, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.500000, 0.200000,
    -0.587785, 1.000000, 0.809017, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.600000, 0.500000,
    -0.559017, 1.309017, 0.769421, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.600000, 0.600000,
    -0.904509, 1.309017, 0.293893, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.500000, 0.600000,
    -0.181636, 1.951056, 0.250000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.600000, 0.900000,
    -0.293893, 1.951056, 0.095492, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.500000, 0.900000,
    -0.559017, 1.809017, 0.181636, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.500000, 0.800000,
    -0.345492, 0.190983, 0.475528, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.600000, 0.200000,
    -0.559017, 0.190983, 0.181636, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.500000, 0.200000,
    -0.293893, 0.048943, 0.095492, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.500000, 0.100000,
    -0.587785, 1.000000, 0.809017, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.600000, 0.500000,
    -0.951057, 1.000000, 0.309017, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.500000, 0.500000,
    -0.904509, 0.690983, 0.293893, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.500000, 0.400000,
    -0.345492, 1.809017, 0.475528, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.600000, 0.800000,
    -0.559017, 1.809017, 0.181636, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.500000, 0.800000,
    -0.769421, 1.587785, 0.250000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.500000, 0.700000,
    -0.559017, 1.809017, 0.181636, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.500000, 0.800000,
    -0.559017, 1.809017, -0.181636, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.400000, 0.800000,
    -0.769421, 1.587785, -0.250000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.400000, 0.700000,
    -0.769421, 0.412215, 0.250000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.500000, 0.300000,
    -0.904509, 0.690983, 0.293893, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.500000, 0.400000,
    -0.904509, 0.690983, -0.293893, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.400000, 0.400000,
    -0.769421, 1.587785, 0.250000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.500000, 0.700000,
    -0.769421, 1.587785, -0.250000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.400000, 0.700000,
    -0.904509, 1.309017, -0.293893, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.400000, 0.600000,
    -0.769421, 0.412215, 0.250000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.500000, 0.300000,
    -0.769421, 0.412215, -0.250000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.400000, 0.300000,
    -0.559017, 0.190983, -0.181636, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.400000, 0.200000,
    -0.904509, 1.309017, 0.293893, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.500000, 0.600000,
    -0.904509, 1.309017, -0.293893, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.400000, 0.600000,
    -0.951057, 1.000000, -0.309017, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.400000, 0.500000,
    -0.293893, 1.951056, 0.095492, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.500000, 0.900000,
    -0.293893, 1.951056, -0.095492, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.400000, 0.900000,
    -0.559017, 1.809017, -0.181636, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.400000, 0.800000,
    -0.293893, 0.048943, 0.095492, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.500000, 0.100000,
    -0.559017, 0.190983, 0.181636, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.500000, 0.200000,
    -0.559017, 0.190983, -0.181636, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.400000, 0.200000,
    -0.951057, 1.000000, 0.309017, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.500000, 0.500000,
    -0.951057, 1.000000, -0.309017, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.400000, 0.500000,
    -0.904509, 0.690983, -0.293893, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.400000, 0.400000,
    -0.559017, 0.190983, -0.181636, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.400000, 0.200000,
    -0.345492, 0.190983, -0.475528, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.300000, 0.200000,
    -0.181636, 0.048943, -0.250000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.300000, 0.100000,
    -0.904509, 0.690983, -0.293893, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.400000, 0.400000,
    -0.951057, 1.000000, -0.309017, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.400000, 0.500000,
    -0.587785, 1.000000, -0.809017, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.300000, 0.500000,
    -0.769421, 1.587785, -0.250000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.400000, 0.700000,
    -0.559017, 1.809017, -0.181636, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.400000, 0.800000,
    -0.345492, 1.809017, -0.475528, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.300000, 0.800000,
    -0.904509, 0.690983, -0.293893, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.400000, 0.400000,
    -0.559017, 0.690983, -0.769421, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.300000, 0.400000,
    -0.475528, 0.412215, -0.654509, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.300000, 0.300000,
    -0.769421, 1.587785, -0.250000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.400000, 0.700000,
    -0.475528, 1.587785, -0.654509, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.300000, 0.700000,
    -0.559017, 1.309017, -0.769421, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.300000, 0.600000,
    -0.769421, 0.412215, -0.250000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.400000, 0.300000,
    -0.475528, 0.412215, -0.654509, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.300000, 0.300000,
    -0.345492, 0.190983, -0.475528, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.300000, 0.200000,
    -0.951057, 1.000000, -0.309017, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.400000, 0.500000,
    -0.904509, 1.309017, -0.293893, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.400000, 0.600000,
    -0.559017, 1.309017, -0.769421, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.300000, 0.600000,
    -0.559017, 1.809017, -0.181636, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.400000, 0.800000,
    -0.293893, 1.951056, -0.095492, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.400000, 0.900000,
    -0.181636, 1.951056, -0.250000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.300000, 0.900000,
    -0.559017, 1.309017, -0.769421, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.300000, 0.600000,
    -0.000000, 1.309017, -0.951057, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.200000, 0.600000,
    -0.000000, 1.000000, -1.000000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.200000, 0.500000,
    -0.181636, 1.951056, -0.250000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.300000, 0.900000,
    -0.000000, 1.951056, -0.309017, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.200000, 0.900000,
    -0.000000, 1.809017, -0.587785, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.200000, 0.800000,
    -0.345492, 0.190983, -0.475528, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.300000, 0.200000,
    -0.000000, 0.190983, -0.587785, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.200000, 0.200000,
    -0.000000, 0.048943, -0.309017, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.200000, 0.100000,
    -0.587785, 1.000000, -0.809017, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.300000, 0.500000,
    -0.000000, 1.000000, -1.000000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.200000, 0.500000,
    -0.000000, 0.690983, -0.951057, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.200000, 0.400000,
    -0.345492, 1.809017, -0.475528, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.300000, 0.800000,
    -0.000000, 1.809017, -0.587785, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.200000, 0.800000,
    -0.000000, 1.587785, -0.809017, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.200000, 0.700000,
    -0.559017, 0.690983, -0.769421, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.300000, 0.400000,
    -0.000000, 0.690983, -0.951057, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.200000, 0.400000,
    -0.000000, 0.412215, -0.809017, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.200000, 0.300000,
    -0.475528, 1.587785, -0.654509, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.300000, 0.700000,
    -0.000000, 1.587785, -0.809017, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.200000, 0.700000,
    -0.000000, 1.309017, -0.951057, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.200000, 0.600000,
    -0.475528, 0.412215, -0.654509, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.300000, 0.300000,
    -0.000000, 0.412215, -0.809017, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.200000, 0.300000,
    -0.000000, 0.190983, -0.587785, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.200000, 0.200000,
    -0.000000, 0.412215, -0.809017, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.200000, 0.300000,
    0.475528, 0.412215, -0.654509, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.100000, 0.300000,
    0.345491, 0.190983, -0.475528, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.100000, 0.200000,
    -0.000000, 1.309017, -0.951057, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.200000, 0.600000,
    0.559017, 1.309017, -0.769421, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.100000, 0.600000,
    0.587785, 1.000000, -0.809017, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.100000, 0.500000,
    -0.000000, 1.951056, -0.309017, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.200000, 0.900000,
    0.181636, 1.951056, -0.250000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.100000, 0.900000,
    0.345491, 1.809017, -0.475528, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.100000, 0.800000,
    -0.000000, 0.190983, -0.587785, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.200000, 0.200000,
    0.345491, 0.190983, -0.475528, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.100000, 0.200000,
    0.181636, 0.048943, -0.250000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.100000, 0.100000,
    -0.000000, 1.000000, -1.000000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.200000, 0.500000,
    0.587785, 1.000000, -0.809017, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.100000, 0.500000,
    0.559017, 0.690983, -0.769421, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.100000, 0.400000,
    -0.000000, 1.809017, -0.587785, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.200000, 0.800000,
    0.345491, 1.809017, -0.475528, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.100000, 0.800000,
    0.475528, 1.587785, -0.654509, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.100000, 0.700000,
    -0.000000, 0.690983, -0.951057, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.200000, 0.400000,
    0.559017, 0.690983, -0.769421, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.100000, 0.400000,
    0.475528, 0.412215, -0.654509, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.100000, 0.300000,
    -0.000000, 1.587785, -0.809017, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.200000, 0.700000,
    0.475528, 1.587785, -0.654509, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.100000, 0.700000,
    0.559017, 1.309017, -0.769421, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.100000, 0.600000,
    0.475528, 1.587785, -0.654509, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.100000, 0.700000,
    0.769421, 1.587785, -0.250000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.000000, 0.700000,
    0.904509, 1.309017, -0.293893, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.000000, 0.600000,
    0.475528, 0.412215, -0.654509, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.100000, 0.300000,
    0.769421, 0.412215, -0.250000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.000000, 0.300000,
    0.559017, 0.190983, -0.181636, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.000000, 0.200000,
    0.559017, 1.309017, -0.769421, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.100000, 0.600000,
    0.904509, 1.309017, -0.293893, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.000000, 0.600000,
    0.951057, 1.000000, -0.309017, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.000000, 0.500000,
    0.345491, 1.809017, -0.475528, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.100000, 0.800000,
    0.181636, 1.951056, -0.250000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.100000, 0.900000,
    0.293893, 1.951056, -0.095492, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.000000, 0.900000,
    0.181636, 0.048943, -0.250000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.100000, 0.100000,
    0.345491, 0.190983, -0.475528, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.100000, 0.200000,
    0.559017, 0.190983, -0.181636, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.000000, 0.200000,
    0.559017, 0.690983, -0.769421, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.100000, 0.400000,
    0.587785, 1.000000, -0.809017, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.100000, 0.500000,
    0.951057, 1.000000, -0.309017, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.000000, 0.500000,
    0.345491, 1.809017, -0.475528, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.100000, 0.800000,
    0.559017, 1.809017, -0.181636, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.000000, 0.800000,
    0.769421, 1.587785, -0.250000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.000000, 0.700000,
    0.559017, 0.690983, -0.769421, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.100000, 0.400000,
    0.904509, 0.690983, -0.293893, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.000000, 0.400000,
    0.769421, 0.412215, -0.250000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.000000, 0.300000,
    0.769421, 0.412215, -0.250000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 1.000000, 0.300000,
    0.904509, 0.690983, -0.293893, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 1.000000, 0.400000,
    0.904509, 0.690983, 0.293893, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.900000, 0.400000,
    0.769421, 1.587785, -0.250000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 1.000000, 0.700000,
    0.769421, 1.587785, 0.250000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.900000, 0.700000,
    0.904509, 1.309017, 0.293893, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.900000, 0.600000,
    0.769421, 0.412215, -0.250000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 1.000000, 0.300000,
    0.769421, 0.412215, 0.250000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.900000, 0.300000,
    0.559017, 0.190983, 0.181636, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.900000, 0.200000,
    0.951057, 1.000000, -0.309017, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 1.000000, 0.500000,
    0.904509, 1.309017, -0.293893, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 1.000000, 0.600000,
    0.904509, 1.309017, 0.293893, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.900000, 0.600000,
    0.293893, 1.951056, -0.095492, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 1.000000, 0.900000,
    0.293893, 1.951056, 0.095491, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.900000, 0.900000,
    0.559017, 1.809017, 0.181636, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.900000, 0.800000,
    0.293893, 0.048943, -0.095492, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 1.000000, 0.100000,
    0.559017, 0.190983, -0.181636, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 1.000000, 0.200000,
    0.559017, 0.190983, 0.181636, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.900000, 0.200000,
    0.951057, 1.000000, -0.309017, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 1.000000, 0.500000,
    0.951057, 1.000000, 0.309017, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.900000, 0.500000,
    0.904509, 0.690983, 0.293893, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.900000, 0.400000,
    0.769421, 1.587785, -0.250000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 1.000000, 0.700000,
    0.559017, 1.809017, -0.181636, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 1.000000, 0.800000,
    0.559017, 1.809017, 0.181636, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.900000, 0.800000,
    0.904509, 0.690983, 0.293893, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.900000, 0.400000,
    0.951057, 1.000000, 0.309017, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.900000, 0.500000,
    0.587785, 1.000000, 0.809017, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.800000, 0.500000,
    0.769421, 1.587785, 0.250000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.900000, 0.700000,
    0.559017, 1.809017, 0.181636, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.900000, 0.800000,
    0.345492, 1.809017, 0.475528, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.800000, 0.800000,
    0.904509, 0.690983, 0.293893, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.900000, 0.400000,
    0.559017, 0.690983, 0.769421, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.800000, 0.400000,
    0.475528, 0.412215, 0.654508, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.800000, 0.300000,
    0.904509, 1.309017, 0.293893, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.900000, 0.600000,
    0.769421, 1.587785, 0.250000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.900000, 0.700000,
    0.475528, 1.587785, 0.654508, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.800000, 0.700000,
    0.769421, 0.412215, 0.250000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.900000, 0.300000,
    0.475528, 0.412215, 0.654508, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.800000, 0.300000,
    0.345492, 0.190983, 0.475528, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.800000, 0.200000,
    0.904509, 1.309017, 0.293893, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.900000, 0.600000,
    0.559017, 1.309017, 0.769421, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.800000, 0.600000,
    0.587785, 1.000000, 0.809017, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.800000, 0.500000,
    0.293893, 1.951056, 0.095491, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.900000, 0.900000,
    0.181636, 1.951056, 0.250000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.800000, 0.900000,
    0.345492, 1.809017, 0.475528, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.800000, 0.800000,
    0.293893, 0.048943, 0.095491, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.900000, 0.100000,
    0.559017, 0.190983, 0.181636, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.900000, 0.200000,
    0.345492, 0.190983, 0.475528, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.800000, 0.200000,
    0.181636, 1.951056, 0.250000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.800000, 0.900000,
    0.000000, 1.951056, 0.309017, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.700000, 0.900000,
    0.000000, 1.809017, 0.587785, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.700000, 0.800000,
    0.345492, 0.190983, 0.475528, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.800000, 0.200000,
    0.000000, 0.190983, 0.587785, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.700000, 0.200000,
    0.000000, 0.048943, 0.309017, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.700000, 0.100000,
    0.587785, 1.000000, 0.809017, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.800000, 0.500000,
    0.000000, 1.000000, 1.000000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.700000, 0.500000,
    0.000000, 0.690983, 0.951056, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.700000, 0.400000,
    0.475528, 1.587785, 0.654508, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.800000, 0.700000,
    0.345492, 1.809017, 0.475528, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.800000, 0.800000,
    0.000000, 1.809017, 0.587785, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.700000, 0.800000,
    0.559017, 0.690983, 0.769421, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.800000, 0.400000,
    0.000000, 0.690983, 0.951056, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.700000, 0.400000,
    0.000000, 0.412215, 0.809017, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.700000, 0.300000,
    0.475528, 1.587785, 0.654508, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.800000, 0.700000,
    0.000000, 1.587785, 0.809017, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.700000, 0.700000,
    0.000000, 1.309017, 0.951056, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.700000, 0.600000,
    0.475528, 0.412215, 0.654508, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.800000, 0.300000,
    0.000000, 0.412215, 0.809017, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.700000, 0.300000,
    0.000000, 0.190983, 0.587785, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.700000, 0.200000,
    0.559017, 1.309017, 0.769421, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.800000, 0.600000,
    0.000000, 1.309017, 0.951056, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.700000, 0.600000,
    0.000000, 1.000000, 1.000000, 1.000000, 0.439216, 0.000000, 1.000000, 1.000000, 0.700000, 0.500000,
]);
class Ball {
    static vertexArray = vertices;
    static vertexCount = vertCount;
    static instance = undefined;
    static getMesh() {
        if (Ball.instance === undefined) {
            Ball.instance = new SimpleMesh(Ball.vertexCount, Ball.vertexArray);
        }
        return Ball.instance;
    }
    constructor() {
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

class Player extends Entity {
    animationBuffer = mat4Impl.copy(this.transformMatrix);
    graphics = new SimpleGraphics(Ball.getMesh(), this.animationBuffer, "Player");
    target;
    destination = vec3Impl.create();
    speed = 5.5;
    velocity;
    stopped = true;
    team = "player";
    collisionRadius = 1.0;
    healthBar;
    constructor(pos) {
        super(pos);
        vec3Impl.copy(pos, this.destination);
        this.velocity = vec3Impl.fromValues(0, 0, 0);
        this.stopped = true;
        this.target = new Target(this.destination);
        this.healthBar = new Healthbar(3, 3, this.position);
        this.childStack = [this.target, this.healthBar];
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
    update(deltaTime) {
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
    resolveCollision() {
        this.healthBar.takeDamage(1);
    }
    get health() {
        return this.healthBar.health;
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
    color = new Float32Array([1.0, 0.2, 0.2, 1.0]);
    graphics = new FireballGraphics(new SimpleCube(), this.transformMatrix, this.color, "Healthbar");
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
        this._health = Math.max(0, this._health - damage);
        //this loop could go over less elements in theory...
        for (let i = this._health; i < this.healthBricks.length; i++) {
            this.healthBricks[i].graphics.active = false;
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
        vec4Impl.set(2 * ((e.offsetX * this.window.devicePixelRatio / this.canvas.width) - 0.5), -2 * ((e.offsetY * this.window.devicePixelRatio / this.canvas.height) - 0.5), -1.0, 1.0, this.clickPosition);
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
        for (const player of this.members.filter((member) => member.team === "player")) {
            for (const enemy of this.members.filter((member) => member.team === "enemy")) {
                let distance = vec3Impl.distance(player.position, enemy.position);
                if (distance < player.collisionRadius + enemy.collisionRadius) {
                    enemy.resolveCollision();
                    player.resolveCollision();
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

class Fireball extends Entity {
    animationBuffer = mat4Impl.copy(this.transformMatrix);
    color = new Float32Array([0.0, 0.5, 0.0, 0.5]);
    graphics = new FireballGraphics(Ball.getMesh(), this.animationBuffer, this.color, "static fireball");
    speed = 18.5;
    direction;
    stopped;
    team = "enemy";
    collisionRadius = 2.15;
    constructor(initLocation, direction) {
        super(initLocation);
        this.direction = vec3Impl.normalize(direction);
        this.stopped = false;
    }
    update(deltaTime) {
        this.color[0] = 0.0;
        this.color[1] = 0.5;
        mat4Impl.uniformScale(this.transformMatrix, this.collisionRadius, this.animationBuffer);
        if (this.stopped) {
            return;
        }
        vec3Impl.mulScalar(this.direction, this.speed * deltaTime, this.direction);
        mat4Impl.translate(this.transformMatrix, this.direction, this.transformMatrix);
        vec3Impl.normalize(this.direction, this.direction);
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
    fireballs = [];
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
        this.fireballs.push(fireball);
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

const sceneSize = 100;
const origin = vec3Impl.fromValues(0, 0, 0);
class Scene {
    canvas;
    camera;
    player;
    context;
    terrain;
    spawner;
    controls;
    systems;
    entities = [];
    graphicsOrganizer = new GraphicsOrganizer();
    constructor(canvas) {
        this.canvas = canvas;
        this.camera = new TopCamera(this.canvas);
        this.terrain = new Floor(sceneSize);
        this.player = new Player(origin);
        //ideally no entity takes another entity as a constructor argument
        //systems or controls should use context to find targets for entities upon execute() or upon request.
        this.spawner = new FireballSpawner(origin, sceneSize, this.player);
        //context should also have a reference to the entity array for targeting AI.
        this.context = new SceneContext(canvas, vec3Impl.fromValues(0, 0, 0), this.terrain, this.camera);
        this.controls = new Controls(this.context);
        this.systems = new Systems(this.context);
        this.addEntity(this.camera);
        this.addEntity(this.terrain);
        this.addEntity(this.player);
        this.addEntity(this.spawner);
    }
    //these functions are recursive in an odd way and if there are circular references in liftStack then it may loop infinitely.
    addEntity(entity) {
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
    update(deltaTime) {
        this.processDeletedEntities();
        for (const entity of this.entities) {
            this.liftChildren(entity);
        }
        for (const entity of this.entities) {
            entity.update(deltaTime);
        }
        this.systems.execute();
    }
    destroy() {
        this.controls.abortEventListeners();
    }
}

const canvas = document.querySelector('canvas');
const devicePixelRatio = window.devicePixelRatio;
canvas.width = canvas.clientWidth * devicePixelRatio;
canvas.height = canvas.clientHeight * devicePixelRatio;
window.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    e.stopImmediatePropagation();
});
let scene = new Scene(canvas);
let renderer = new Renderer(canvas);
await renderer.initialized;
function onCanvasResize(entries) {
    for (let entry of entries) {
        canvas.width = Math.max(1, entry.devicePixelContentBoxSize[0].inlineSize);
        canvas.height = Math.max(1, entry.devicePixelContentBoxSize[0].blockSize);
    }
    scene.onResize();
}
const resizeObserver = new ResizeObserver(onCanvasResize);
resizeObserver.observe(canvas);
let paused = false;
//time in miliseconds.
let lastFrameMS = performance.now();
const MIN_ALLOWABLE_FRAMERATE = 20;
function frame() {
    const now = performance.now();
    const deltaTime = (now - lastFrameMS) / 1000;
    lastFrameMS = now;
    if (!document.hasFocus()) {
        paused = true;
        //TODO: Render a --PAUSED-- overlay over the screen before pausing.
        renderer.render(scene.graphicsOrganizer);
        return;
    }
    //TODO:flesh out states and transitions for current scene based on state. Game over scene, tutorial scene, Main menu scene, etc...
    if (scene.isGameOver()) {
        scene.destroy();
        scene = new Scene(canvas);
    }
    //large spans of time due to either being minimized or lag are simply discarded. 
    //Not sure how well this works, but we do not want the game state to change significantly if it cannot be displayed to the screen.
    if (deltaTime <= 1 / MIN_ALLOWABLE_FRAMERATE) {
        scene.update(deltaTime);
        renderer.render(scene.graphicsOrganizer);
    }
    requestAnimationFrame(frame);
    return;
}
requestAnimationFrame(frame);
document.addEventListener('pointerdown', (e) => {
    if (paused) {
        paused = false;
        requestAnimationFrame(frame);
    }
});

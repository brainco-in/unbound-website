import {
  baseVertexShader,
  clearShader,
  copyShader,
  displayShader,
  displayMaskShader,
  splatShader,
  advectionShader,
  divergenceShader,
  curlShader,
  vorticityShader,
  pressureShader,
  gradientSubtractShader,
} from "./shaders";

export interface FluidConfig {
  simResolution: number;
  dyeResolution: number;
  densityDissipation: number;
  velocityDissipation: number;
  pressure: number;
  pressureIterations: number;
  curl: number;
  splatRadius: number;
  splatForce: number;
  colorR: number;
  colorG: number;
  colorB: number;
}

export const defaultConfig: FluidConfig = {
  simResolution: 128,
  dyeResolution: 512,
  densityDissipation: 0.97,
  velocityDissipation: 0.98,
  pressure: 0.8,
  pressureIterations: 20,
  curl: 30,
  splatRadius: 0.25,
  splatForce: 6000,
  colorR: 1.0,
  colorG: 1.0,
  colorB: 1.0,
};

interface PointerData {
  id: number;
  texcoordX: number;
  texcoordY: number;
  prevTexcoordX: number;
  prevTexcoordY: number;
  deltaX: number;
  deltaY: number;
  down: boolean;
  moved: boolean;
  color: { r: number; g: number; b: number };
}

interface FBO {
  texture: WebGLTexture;
  fbo: WebGLFramebuffer;
  width: number;
  height: number;
  texelSizeX: number;
  texelSizeY: number;
  attach: (id: number) => number;
}

interface DoubleFBO {
  width: number;
  height: number;
  texelSizeX: number;
  texelSizeY: number;
  read: FBO;
  write: FBO;
  swap: () => void;
}

interface Program {
  program: WebGLProgram;
  uniforms: { [key: string]: WebGLUniformLocation | null };
  bind: () => void;
}

export class FluidSimulation {
  private canvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext;
  private ext: {
    formatRGBA: { internalFormat: number; format: number };
    formatRG: { internalFormat: number; format: number };
    formatR: { internalFormat: number; format: number };
    halfFloatTexType: number;
    supportLinearFiltering: boolean;
  };
  private config: FluidConfig;
  
  // Framebuffers
  private dye!: DoubleFBO;
  private velocity!: DoubleFBO;
  private divergence!: FBO;
  private curl!: FBO;
  private pressure!: DoubleFBO;

  // Programs
  private copyProgram!: Program;
  private clearProgram!: Program;
  private splatProgram!: Program;
  private advectionProgram!: Program;
  private divergenceProgram!: Program;
  private curlProgram!: Program;
  private vorticityProgram!: Program;
  private pressureProgram!: Program;
  private gradientSubtractProgram!: Program;
  private displayProgram!: Program;

  // Geometry
  private blit!: (target: FBO | null, clear?: boolean) => void;

  // Pointer tracking
  private pointers: PointerData[] = [];
  private lastUpdateTime = Date.now();
  private animationFrameId: number | null = null;

  constructor(canvas: HTMLCanvasElement, config: Partial<FluidConfig> = {}) {
    this.canvas = canvas;
    this.config = { ...defaultConfig, ...config };

    const params = {
      alpha: true,
      depth: false,
      stencil: false,
      antialias: false,
      preserveDrawingBuffer: false,
    };

    const gl = canvas.getContext("webgl", params) || canvas.getContext("experimental-webgl", params);
    if (!gl) {
      throw new Error("WebGL not supported");
    }
    this.gl = gl as WebGLRenderingContext;

    // Get extensions
    const halfFloat = this.gl.getExtension("OES_texture_half_float");
    const supportLinearFiltering = this.gl.getExtension("OES_texture_half_float_linear");

    this.gl.clearColor(0.0, 0.0, 0.0, 1.0);

    const halfFloatTexType = halfFloat ? halfFloat.HALF_FLOAT_OES : this.gl.UNSIGNED_BYTE;

    let formatRGBA: { internalFormat: number; format: number };
    let formatRG: { internalFormat: number; format: number };
    let formatR: { internalFormat: number; format: number };

    if (halfFloat) {
      formatRGBA = { internalFormat: this.gl.RGBA, format: this.gl.RGBA };
      formatRG = { internalFormat: this.gl.RGBA, format: this.gl.RGBA };
      formatR = { internalFormat: this.gl.RGBA, format: this.gl.RGBA };
    } else {
      formatRGBA = { internalFormat: this.gl.RGBA, format: this.gl.RGBA };
      formatRG = { internalFormat: this.gl.RGBA, format: this.gl.RGBA };
      formatR = { internalFormat: this.gl.RGBA, format: this.gl.RGBA };
    }

    this.ext = {
      formatRGBA,
      formatRG,
      formatR,
      halfFloatTexType,
      supportLinearFiltering: !!supportLinearFiltering,
    };

    // Initialize pointer
    this.pointers.push(this.createPointer());

    this.initBlit();
    this.initPrograms();
    this.initFramebuffers();
  }

  private createPointer(): PointerData {
    return {
      id: -1,
      texcoordX: 0,
      texcoordY: 0,
      prevTexcoordX: 0,
      prevTexcoordY: 0,
      deltaX: 0,
      deltaY: 0,
      down: false,
      moved: false,
      color: { r: this.config.colorR, g: this.config.colorG, b: this.config.colorB },
    };
  }

  private initBlit(): void {
    const gl = this.gl;
    
    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);

    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);

    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);

    this.blit = (target: FBO | null, clear = false) => {
      if (target == null) {
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      } else {
        gl.viewport(0, 0, target.width, target.height);
        gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
      }
      if (clear) {
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
      }
      gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    };
  }

  private compileShader(type: number, source: string): WebGLShader {
    const gl = this.gl;
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(shader));
      throw new Error("Shader compilation failed");
    }

    return shader;
  }

  private createProgram(vertexShader: string, fragmentShader: string): Program {
    const gl = this.gl;
    const program = gl.createProgram()!;

    gl.attachShader(program, this.compileShader(gl.VERTEX_SHADER, vertexShader));
    gl.attachShader(program, this.compileShader(gl.FRAGMENT_SHADER, fragmentShader));
    
    // Bind attribute location BEFORE linking
    gl.bindAttribLocation(program, 0, "aPosition");
    
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(program));
      throw new Error("Program linking failed");
    }

    const uniforms: { [key: string]: WebGLUniformLocation | null } = {};
    const uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < uniformCount; i++) {
      const uniformInfo = gl.getActiveUniform(program, i);
      if (uniformInfo) {
        uniforms[uniformInfo.name] = gl.getUniformLocation(program, uniformInfo.name);
      }
    }

    return {
      program,
      uniforms,
      bind: () => gl.useProgram(program),
    };
  }

  private initPrograms(): void {
    this.copyProgram = this.createProgram(baseVertexShader, copyShader);
    this.clearProgram = this.createProgram(baseVertexShader, clearShader);
    this.splatProgram = this.createProgram(baseVertexShader, splatShader);
    this.advectionProgram = this.createProgram(baseVertexShader, advectionShader);
    this.divergenceProgram = this.createProgram(baseVertexShader, divergenceShader);
    this.curlProgram = this.createProgram(baseVertexShader, curlShader);
    this.vorticityProgram = this.createProgram(baseVertexShader, vorticityShader);
    this.pressureProgram = this.createProgram(baseVertexShader, pressureShader);
    this.gradientSubtractProgram = this.createProgram(baseVertexShader, gradientSubtractShader);
    this.displayProgram = this.createProgram(baseVertexShader, displayMaskShader);
  }

  private getResolution(resolution: number): { width: number; height: number } {
    let aspectRatio = this.gl.drawingBufferWidth / this.gl.drawingBufferHeight;
    if (aspectRatio < 1) {
      aspectRatio = 1.0 / aspectRatio;
    }

    const min = Math.round(resolution);
    const max = Math.round(resolution * aspectRatio);

    if (this.gl.drawingBufferWidth > this.gl.drawingBufferHeight) {
      return { width: max, height: min };
    } else {
      return { width: min, height: max };
    }
  }

  private createFBO(w: number, h: number, internalFormat: number, format: number, type: number, param: number): FBO {
    const gl = this.gl;
    
    gl.activeTexture(gl.TEXTURE0);
    const texture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, param);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, param);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, null);

    const fbo = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.viewport(0, 0, w, h);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const texelSizeX = 1.0 / w;
    const texelSizeY = 1.0 / h;

    return {
      texture,
      fbo,
      width: w,
      height: h,
      texelSizeX,
      texelSizeY,
      attach: (id: number) => {
        gl.activeTexture(gl.TEXTURE0 + id);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        return id;
      },
    };
  }

  private createDoubleFBO(w: number, h: number, internalFormat: number, format: number, type: number, param: number): DoubleFBO {
    let fbo1 = this.createFBO(w, h, internalFormat, format, type, param);
    let fbo2 = this.createFBO(w, h, internalFormat, format, type, param);

    return {
      width: w,
      height: h,
      texelSizeX: fbo1.texelSizeX,
      texelSizeY: fbo1.texelSizeY,
      get read() {
        return fbo1;
      },
      set read(value) {
        fbo1 = value;
      },
      get write() {
        return fbo2;
      },
      set write(value) {
        fbo2 = value;
      },
      swap() {
        const temp = fbo1;
        fbo1 = fbo2;
        fbo2 = temp;
      },
    };
  }

  private initFramebuffers(): void {
    const gl = this.gl;
    const simRes = this.getResolution(this.config.simResolution);
    const dyeRes = this.getResolution(this.config.dyeResolution);

    const texType = this.ext.halfFloatTexType;
    const rgba = this.ext.formatRGBA;
    const rg = this.ext.formatRG;
    const r = this.ext.formatR;
    const filtering = this.ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST;

    this.dye = this.createDoubleFBO(dyeRes.width, dyeRes.height, rgba.internalFormat, rgba.format, texType, filtering);
    this.velocity = this.createDoubleFBO(simRes.width, simRes.height, rg.internalFormat, rg.format, texType, filtering);
    this.divergence = this.createFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST);
    this.curl = this.createFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST);
    this.pressure = this.createDoubleFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST);
  }

  private lastWidth = 0;
  private lastHeight = 0;

  public resize(): void {
    // Only reinitialize framebuffers if size actually changed
    const width = this.gl.drawingBufferWidth;
    const height = this.gl.drawingBufferHeight;
    
    if (width !== this.lastWidth || height !== this.lastHeight) {
      this.lastWidth = width;
      this.lastHeight = height;
      if (width > 0 && height > 0) {
        this.initFramebuffers();
      }
    }
  }

  public updatePointerDownData(posX: number, posY: number): void {
    const pointer = this.pointers[0];
    pointer.down = true;
    pointer.moved = false;
    pointer.texcoordX = posX / this.canvas.width;
    pointer.texcoordY = 1.0 - posY / this.canvas.height;
    pointer.prevTexcoordX = pointer.texcoordX;
    pointer.prevTexcoordY = pointer.texcoordY;
    pointer.deltaX = 0;
    pointer.deltaY = 0;
    pointer.color = { r: this.config.colorR, g: this.config.colorG, b: this.config.colorB };
  }

  public updatePointerMoveData(posX: number, posY: number): void {
    const pointer = this.pointers[0];
    pointer.prevTexcoordX = pointer.texcoordX;
    pointer.prevTexcoordY = pointer.texcoordY;
    pointer.texcoordX = posX / this.canvas.width;
    pointer.texcoordY = 1.0 - posY / this.canvas.height;
    pointer.deltaX = this.correctDeltaX(pointer.texcoordX - pointer.prevTexcoordX);
    pointer.deltaY = this.correctDeltaY(pointer.texcoordY - pointer.prevTexcoordY);
    pointer.moved = Math.abs(pointer.deltaX) > 0 || Math.abs(pointer.deltaY) > 0;
  }

  public updatePointerUpData(): void {
    this.pointers[0].down = false;
  }

  private correctDeltaX(delta: number): number {
    const aspectRatio = this.canvas.width / this.canvas.height;
    if (aspectRatio < 1) delta *= aspectRatio;
    return delta;
  }

  private correctDeltaY(delta: number): number {
    const aspectRatio = this.canvas.width / this.canvas.height;
    if (aspectRatio > 1) delta /= aspectRatio;
    return delta;
  }

  private splat(x: number, y: number, dx: number, dy: number, color: { r: number; g: number; b: number }): void {
    const gl = this.gl;
    
    this.splatProgram.bind();
    gl.uniform1i(this.splatProgram.uniforms["uTarget"], this.velocity.read.attach(0));
    gl.uniform1f(this.splatProgram.uniforms["aspectRatio"], this.canvas.width / this.canvas.height);
    gl.uniform2f(this.splatProgram.uniforms["point"], x, y);
    gl.uniform3f(this.splatProgram.uniforms["color"], dx, dy, 0.0);
    gl.uniform1f(this.splatProgram.uniforms["radius"], this.correctRadius(this.config.splatRadius / 100.0));
    this.blit(this.velocity.write);
    this.velocity.swap();

    gl.uniform1i(this.splatProgram.uniforms["uTarget"], this.dye.read.attach(0));
    gl.uniform3f(this.splatProgram.uniforms["color"], color.r, color.g, color.b);
    this.blit(this.dye.write);
    this.dye.swap();
  }

  private correctRadius(radius: number): number {
    const aspectRatio = this.canvas.width / this.canvas.height;
    if (aspectRatio > 1) radius *= aspectRatio;
    return radius;
  }

  private step(dt: number): void {
    const gl = this.gl;

    gl.disable(gl.BLEND);
    gl.viewport(0, 0, this.velocity.width, this.velocity.height);

    // Curl
    this.curlProgram.bind();
    gl.uniform2f(this.curlProgram.uniforms["texelSize"], this.velocity.texelSizeX, this.velocity.texelSizeY);
    gl.uniform1i(this.curlProgram.uniforms["uVelocity"], this.velocity.read.attach(0));
    this.blit(this.curl);

    // Vorticity
    this.vorticityProgram.bind();
    gl.uniform2f(this.vorticityProgram.uniforms["texelSize"], this.velocity.texelSizeX, this.velocity.texelSizeY);
    gl.uniform1i(this.vorticityProgram.uniforms["uVelocity"], this.velocity.read.attach(0));
    gl.uniform1i(this.vorticityProgram.uniforms["uCurl"], this.curl.attach(1));
    gl.uniform1f(this.vorticityProgram.uniforms["curl"], this.config.curl);
    gl.uniform1f(this.vorticityProgram.uniforms["dt"], dt);
    this.blit(this.velocity.write);
    this.velocity.swap();

    // Divergence
    this.divergenceProgram.bind();
    gl.uniform2f(this.divergenceProgram.uniforms["texelSize"], this.velocity.texelSizeX, this.velocity.texelSizeY);
    gl.uniform1i(this.divergenceProgram.uniforms["uVelocity"], this.velocity.read.attach(0));
    this.blit(this.divergence);

    // Clear pressure
    this.clearProgram.bind();
    gl.uniform1i(this.clearProgram.uniforms["uTexture"], this.pressure.read.attach(0));
    gl.uniform1f(this.clearProgram.uniforms["value"], this.config.pressure);
    this.blit(this.pressure.write);
    this.pressure.swap();

    // Pressure
    this.pressureProgram.bind();
    gl.uniform2f(this.pressureProgram.uniforms["texelSize"], this.velocity.texelSizeX, this.velocity.texelSizeY);
    gl.uniform1i(this.pressureProgram.uniforms["uDivergence"], this.divergence.attach(0));
    for (let i = 0; i < this.config.pressureIterations; i++) {
      gl.uniform1i(this.pressureProgram.uniforms["uPressure"], this.pressure.read.attach(1));
      this.blit(this.pressure.write);
      this.pressure.swap();
    }

    // Gradient Subtract
    this.gradientSubtractProgram.bind();
    gl.uniform2f(this.gradientSubtractProgram.uniforms["texelSize"], this.velocity.texelSizeX, this.velocity.texelSizeY);
    gl.uniform1i(this.gradientSubtractProgram.uniforms["uPressure"], this.pressure.read.attach(0));
    gl.uniform1i(this.gradientSubtractProgram.uniforms["uVelocity"], this.velocity.read.attach(1));
    this.blit(this.velocity.write);
    this.velocity.swap();

    // Advect velocity
    this.advectionProgram.bind();
    gl.uniform2f(this.advectionProgram.uniforms["texelSize"], this.velocity.texelSizeX, this.velocity.texelSizeY);
    if (!this.ext.supportLinearFiltering) {
      gl.uniform2f(this.advectionProgram.uniforms["dyeTexelSize"], this.velocity.texelSizeX, this.velocity.texelSizeY);
    }
    gl.uniform1i(this.advectionProgram.uniforms["uVelocity"], this.velocity.read.attach(0));
    gl.uniform1i(this.advectionProgram.uniforms["uSource"], this.velocity.read.attach(0));
    gl.uniform1f(this.advectionProgram.uniforms["dt"], dt);
    gl.uniform1f(this.advectionProgram.uniforms["dissipation"], this.config.velocityDissipation);
    this.blit(this.velocity.write);
    this.velocity.swap();

    // Advect dye
    gl.viewport(0, 0, this.dye.width, this.dye.height);
    if (!this.ext.supportLinearFiltering) {
      gl.uniform2f(this.advectionProgram.uniforms["dyeTexelSize"], this.dye.texelSizeX, this.dye.texelSizeY);
    }
    gl.uniform1i(this.advectionProgram.uniforms["uVelocity"], this.velocity.read.attach(0));
    gl.uniform1i(this.advectionProgram.uniforms["uSource"], this.dye.read.attach(1));
    gl.uniform1f(this.advectionProgram.uniforms["dissipation"], this.config.densityDissipation);
    this.blit(this.dye.write);
    this.dye.swap();
  }

  private render(): void {
    const gl = this.gl;
    
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.BLEND);

    this.displayProgram.bind();
    gl.uniform1i(this.displayProgram.uniforms["uTexture"], this.dye.read.attach(0));
    this.blit(null);
  }

  public update(): void {
    const now = Date.now();
    let dt = (now - this.lastUpdateTime) / 1000;
    dt = Math.min(dt, 0.016666);
    this.lastUpdateTime = now;

    this.resize();
    this.applyInputs();
    this.step(dt);
    this.render();
  }

  private applyInputs(): void {
    for (const pointer of this.pointers) {
      if (pointer.moved) {
        pointer.moved = false;
        const dx = pointer.deltaX * this.config.splatForce;
        const dy = pointer.deltaY * this.config.splatForce;
        this.splat(pointer.texcoordX, pointer.texcoordY, dx, dy, pointer.color);
      }
    }
  }

  public start(): void {
    if (this.animationFrameId !== null) return;
    
    // Add an initial splat in the center to show the simulation is working
    this.splat(0.5, 0.5, 1000, 1000, { r: 1, g: 1, b: 1 });
    
    const loop = () => {
      this.update();
      this.animationFrameId = requestAnimationFrame(loop);
    };
    loop();
  }

  public stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  public updateConfig(config: Partial<FluidConfig>): void {
    this.config = { ...this.config, ...config };
  }

  public getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }
}

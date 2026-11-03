/**
 * PCFixCoachOutline — runtime-built wireframe box (12 thin edge bars) used for
 * step highlights. Plain helper class, not a component.
 *
 * Owns: its 12 bar SceneObjects + one cloned unlit material.
 * Must not: decide step logic (PCFixCoachGuideController drives colors/visibility).
 */
export class PCFixCoachOutline {
  readonly root: SceneObject
  private material: Material
  private color: vec4 = new vec4(1, 1, 1, 1)

  constructor(
    parent: SceneObject,
    name: string,
    center: vec3,
    size: vec3,
    thickness: number,
    mesh: RenderMesh,
    baseMaterial: Material
  ) {
    this.root = global.scene.createSceneObject(name)
    this.root.setParent(parent)
    this.root.getTransform().setLocalPosition(center)
    this.material = baseMaterial.clone()

    const hx = size.x / 2
    const hy = size.y / 2
    const hz = size.z / 2
    const t = thickness
    // 4 edges along X, 4 along Y, 4 along Z
    for (const sy of [-1, 1]) {
      for (const sz of [-1, 1]) {
        this.addBar(new vec3(0, sy * hy, sz * hz), new vec3(size.x + t, t, t), mesh)
      }
    }
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        this.addBar(new vec3(sx * hx, 0, sz * hz), new vec3(t, size.y + t, t), mesh)
      }
    }
    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        this.addBar(new vec3(sx * hx, sy * hy, 0), new vec3(t, t, size.z + t), mesh)
      }
    }
  }

  private addBar(pos: vec3, scale: vec3, mesh: RenderMesh): void {
    const bar = global.scene.createSceneObject("OutlineEdge")
    bar.setParent(this.root)
    const tr = bar.getTransform()
    tr.setLocalPosition(pos)
    tr.setLocalScale(scale)
    const rmv = bar.createComponent("Component.RenderMeshVisual") as RenderMeshVisual
    rmv.mesh = mesh
    rmv.mainMaterial = this.material
  }

  setColor(c: vec4): void {
    this.color = c
    this.material.mainPass.baseColor = c
  }

  getColor(): vec4 {
    return this.color
  }

  setVisible(v: boolean): void {
    this.root.enabled = v
  }

  isVisible(): boolean {
    return this.root.enabled
  }
}

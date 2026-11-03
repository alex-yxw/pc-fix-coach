import WorldCameraFinderProvider from "SpectaclesInteractionKit.lspkg/Providers/CameraProvider/WorldCameraFinderProvider"

/**
 * PCFixCoachEdgeArrow — large directional arrow at the edge of the view that points
 * toward the current target whenever the target is outside the field of view.
 *
 * Lives on the EdgeArrow SceneObject. Its `arrowVisual` child is an arrow pointing +Y
 * in local space; each frame it is placed on an ellipse in front of the camera and
 * rolled so it points at the target. Hidden when the target is in view.
 *
 * Owns: the arrow transform + visibility. Must not: choose the target (Main calls setTarget).
 */
@component
export class PCFixCoachEdgeArrow extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">PCFixCoachEdgeArrow – off-screen target pointer</span>')
  @ui.separator
  @ui.label('<span style="color: #60A5FA;">References</span>')
  @ui.group_start("References")
  @input
  @hint("Child SceneObject holding the arrow visual (points +Y).")
  arrowVisual: SceneObject
  @ui.group_end

  @ui.separator
  @ui.label('<span style="color: #60A5FA;">Settings</span>')
  @ui.group_start("Settings")
  @input
  @widget(new SliderWidget(30, 120, 5))
  @hint("Distance (cm) in front of the eyes where the arrow floats.")
  distanceCm: number = 55

  @input
  @hint("Ellipse radii (cm) of the view edge at that distance (x = horizontal, y = vertical).")
  edgeRadiusCm: vec2 = new vec2(14, 9)

  @input
  @widget(new SliderWidget(0, 0.3, 0.01))
  @hint("Screen margin (0..0.3). Targets closer than this to the screen edge count as out of view.")
  screenMargin: number = 0.06
  @ui.group_end

  private target: SceneObject | null = null
  private showing = false
  private bob = 0

  onAwake(): void {
    if (this.arrowVisual) this.arrowVisual.enabled = false
    this.createEvent("LateUpdateEvent").bind(() => this.refresh())
  }

  /** Point at this object (null hides the arrow). */
  setTarget(target: SceneObject | null): void {
    this.target = target
  }

  getTarget(): SceneObject | null {
    return this.target
  }

  /** True while the arrow is visible (target out of view). */
  isShowing(): boolean {
    return this.showing
  }

  /** True when the current target is inside the view (or there is no target). */
  isTargetInView(): boolean {
    if (!this.target) return true
    const cam = WorldCameraFinderProvider.getInstance().getComponent()
    if (!cam) return true
    const t = this.target.getTransform().getWorldPosition()
    const local = cam.getTransform().getInvertedWorldTransform().multiplyPoint(t)
    if (local.z > -1) return false // behind or beside the eye
    const s = cam.worldSpaceToScreenSpace(t)
    const m = this.screenMargin
    return s.x >= m && s.x <= 1 - m && s.y >= m && s.y <= 1 - m
  }

  private refresh(): void {
    const show = this.target !== null && !this.isTargetInView()
    this.showing = show
    if (this.arrowVisual) this.arrowVisual.enabled = show
    if (!show) return

    const camComp = WorldCameraFinderProvider.getInstance().getComponent()
    const camTr = camComp.getTransform()
    const t = this.target!.getTransform().getWorldPosition()
    const local = camTr.getInvertedWorldTransform().multiplyPoint(t)
    let nx = local.x
    let ny = local.y
    const len = Math.sqrt(nx * nx + ny * ny)
    if (len < 1e-3) {
      nx = 1
      ny = 0
    } else {
      nx /= len
      ny /= len
    }
    this.bob += getDeltaTime()
    const pulse = 1 + 0.06 * Math.sin(this.bob * 6)
    const camPos = camTr.getWorldPosition()
    const pos = camPos
      .add(camTr.back.uniformScale(this.distanceCm)) // camera looks along local -Z == transform.back
      .add(camTr.right.uniformScale(nx * this.edgeRadiusCm.x * pulse))
      .add(camTr.up.uniformScale(ny * this.edgeRadiusCm.y * pulse))
    const tr = this.getTransform()
    tr.setWorldPosition(pos)
    const roll = Math.atan2(-nx, ny)
    tr.setWorldRotation(camTr.getWorldRotation().multiply(quat.angleAxis(roll, vec3.forward())))
  }
}

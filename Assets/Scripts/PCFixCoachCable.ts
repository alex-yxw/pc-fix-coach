/**
 * PCFixCoachCable — simple straight power cable (no bend simulation, per the brief).
 *
 * Lives on the PowerCable SceneObject (a unit cylinder visual along +Y). Every frame it
 * stretches between startAnchor (the PSU outlet) and endAnchor (the plug's cable socket).
 *
 * Owns: the cable's transform. Must not: move either anchor.
 */
@component
export class PCFixCoachCable extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">PCFixCoachCable – straight stand-in cable</span>')
  @ui.separator
  @ui.label('<span style="color: #60A5FA;">References</span>')
  @ui.group_start("References")
  @input
  @hint("Cable start point (PSU outlet).")
  startAnchor: SceneObject

  @input
  @hint("Cable end point (moves with the power plug).")
  endAnchor: SceneObject
  @ui.group_end

  @ui.separator
  @ui.label('<span style="color: #60A5FA;">Settings</span>')
  @ui.group_start("Settings")
  @input
  @widget(new SliderWidget(0.2, 2, 0.1))
  @hint("Cable thickness in cm.")
  thicknessCm: number = 0.8
  @ui.group_end

  onAwake(): void {
    this.createEvent("LateUpdateEvent").bind(() => this.refresh())
  }

  private refresh(): void {
    if (!this.startAnchor || !this.endAnchor) return
    const a = this.startAnchor.getTransform().getWorldPosition()
    const b = this.endAnchor.getTransform().getWorldPosition()
    const d = b.sub(a)
    const len = Math.max(0.01, d.length)
    const tr = this.getTransform()
    tr.setWorldPosition(a.add(b).uniformScale(0.5))
    const dir = d.uniformScale(1 / len)
    // Rotate +Y onto dir.
    const up = vec3.up()
    const axis = up.cross(dir)
    const dot = Math.max(-1, Math.min(1, up.dot(dir)))
    let rot: quat
    if (axis.length < 1e-4) {
      rot = dot > 0 ? quat.quatIdentity() : quat.angleAxis(Math.PI, vec3.right())
    } else {
      rot = quat.angleAxis(Math.acos(dot), axis.normalize())
    }
    tr.setWorldRotation(rot)
    // World scale: thickness x length (parents are unit-scale).
    tr.setWorldScale(new vec3(this.thicknessCm, len, this.thicknessCm))
  }
}

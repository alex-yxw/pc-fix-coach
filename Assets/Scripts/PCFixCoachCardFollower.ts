import WorldCameraFinderProvider from "SpectaclesInteractionKit.lspkg/Providers/CameraProvider/WorldCameraFinderProvider"

/**
 * PCFixCoachCardFollower — keeps the instruction card above and beside the PC case.
 *
 * Lives on the InstructionCard root (the UI panel is a child). Each frame it:
 *  - places the card `heightAboveTargetCm` above the current step's component
 *    (never more than `heightAboveCaseCm` above the case top),
 *  - shifts it `sideOffsetCm` sideways from that component: toward the case middle when
 *    the user faces the case straight-on, or toward the side of the case the user is
 *    viewing from once they are more than `sideSwitchAngleDeg` off-axis,
 *  - yaw-billboards it to face the user.
 * Both offsets are as seen from the user's eye. The card itself sits just in front of the
 * case, so the case never hides it. It moves with every step and never covers the component.
 *
 * Owns: the card root transform. Must not: change card content (that's the UI module).
 */
@component
export class PCFixCoachCardFollower extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">PCFixCoachCardFollower – card placement beside the case</span>')
  @ui.separator
  @ui.label('<span style="color: #60A5FA;">References</span>')
  @ui.group_start("References")
  @input
  @hint("The PC case root (origin at the bottom-center of the case).")
  caseRoot: SceneObject
  @ui.group_end

  @ui.separator
  @ui.label('<span style="color: #60A5FA;">Settings</span>')
  @ui.group_start("Settings")
  @input
  @hint("Case size in cm in the case's local axes (x = depth, y = height, z = width).")
  caseSizeCm: vec3 = new vec3(45, 45, 21)

  @input
  @hint("Card size in cm (width, height).")
  cardSizeCm: vec2 = new vec2(25, 10)

  @input
  @widget(new SliderWidget(0, 30, 1))
  @hint("Highest the card goes: gap (cm) between the case top and the bottom of the card.")
  heightAboveCaseCm: number = 10

  @input
  @widget(new SliderWidget(4, 30, 1))
  @hint("Gap (cm) kept between the current component and the bottom of the card, so the card never covers it.")
  heightAboveTargetCm: number = 10

  @input
  @widget(new SliderWidget(0, 40, 1))
  @hint("Sideways shift (cm) of the card from the current component, toward that component's side of the case.")
  sideOffsetCm: number = 15


  @input
  @widget(new SliderWidget(5, 60, 1))
  @hint("Viewing angle (degrees from straight-on) past which the card moves to the side of the case the user is standing on.")
  sideSwitchAngleDeg: number = 20
  @ui.group_end

  private readonly followSpeed = 6
  private focus: vec3 | null = null
  private side = 1
  /** Card side in the case's own left/right axis: +1 = case +X, -1 = case -X. */
  private caseSide = 1
  /** Viewing zone: -1 = user on case -X side, 0 = straight-on, +1 = case +X side. */
  private viewZone = 0
  private initialized = false
  private lastTarget: vec3 = vec3.zero()

  onAwake(): void {
    this.createEvent("LateUpdateEvent").bind(() => this.refresh())
  }

  /** World point of the current step's component (null = centered above the case). */
  setFocusPoint(p: vec3 | null): void {
    this.focus = p
  }

  /** +1 = card on the viewer's right of the component, -1 = viewer's left. */
  getSide(): number {
    return this.side
  }

  /** +1 = card on the case's +X side of the component, -1 = case -X side. */
  getCaseSide(): number {
    return this.caseSide
  }

  /** -1 / 0 / +1: which side of the case the user is viewing from (0 = straight-on). */
  getViewZone(): number {
    return this.viewZone
  }

  /** Where the card is heading this frame (world). */
  getTargetPosition(): vec3 {
    return this.lastTarget
  }

  private refresh(): void {
    if (!this.caseRoot) return
    const cam = WorldCameraFinderProvider.getInstance().getComponent()
    if (!cam) return
    const camPos = cam.getTransform().getWorldPosition()
    const caseTr = this.caseRoot.getTransform()
    const up = vec3.up()
    const caseCenter = caseTr.getWorldPosition().add(up.uniformScale(this.caseSizeCm.y / 2))

    let toCam = camPos.sub(caseCenter)
    toCam = new vec3(toCam.x, 0, toCam.z)
    if (toCam.length < 1e-3) toCam = vec3.forward()
    const v = toCam.normalize()
    const viewerForward = v.uniformScale(-1)
    const right = viewerForward.cross(up).normalize()

    // Case half-extent toward the viewer (card sits just in front of the open side).
    const ax = caseTr.right
    const az = caseTr.forward
    const hx = this.caseSizeCm.x / 2
    const hz = this.caseSizeCm.z / 2
    const halfV = Math.abs(v.dot(ax)) * hx + Math.abs(v.dot(az)) * hz
    const caseTopY = caseCenter.y + this.caseSizeCm.y / 2
    const maxCenterY = caseTopY + this.heightAboveCaseCm + this.cardSizeCm.y / 2

    // Which side of the case is the user viewing from? (hysteresis avoids flicker)
    const angleDeg = Math.atan2(v.dot(ax), v.dot(az)) * (180 / Math.PI)
    const enter = this.sideSwitchAngleDeg
    const exit = Math.max(0, enter - 8)
    if (angleDeg > enter) this.viewZone = 1
    else if (angleDeg < -enter) this.viewZone = -1
    else if (Math.abs(angleDeg) < exit) this.viewZone = 0

    // Card depth: just in front of the case's near side (so the case never hides it).
    const frontPoint = caseCenter.add(v.uniformScale(halfV + 2))
    let target = new vec3(caseCenter.x, maxCenterY, caseCenter.z).add(v.uniformScale(halfV + 2))
    if (this.focus) {
      const rel = this.focus.sub(caseCenter)
      if (this.viewZone !== 0) {
        // Viewing from a side: card goes to that side of the component (near the user).
        this.caseSide = this.viewZone
      } else {
        // Straight-on: card goes toward the middle of the case, so it stays in the narrow view.
        const dCase = rel.dot(ax)
        if (Math.abs(dCase) > 3) this.caseSide = dCase > 0 ? -1 : 1
      }
      const r = right.dot(ax)
      this.side = Math.abs(r) < 1e-3 ? 1 : this.caseSide * (r > 0 ? 1 : -1)
      // Place the card as the user sees it: at the component's depth it would sit
      // heightAboveTargetCm above and sideOffsetCm beside the component. The card is then slid
      // toward the eye along that sight line to the front of the case. Sliding along the sight
      // line keeps where it appears, and the size terms are scaled so the closer (larger-looking)
      // card still clears the component by the same visual gap.
      const dComp = Math.max(1, this.focus.sub(camPos).dot(viewerForward))
      const dFront = frontPoint.sub(camPos).dot(viewerForward)
      const t = Math.max(0.3, Math.min(1, dFront / dComp))
      const halfW = this.cardSizeCm.x / 2 / t
      const halfH = this.cardSizeCm.y / 2 / t
      const sideShift = this.sideOffsetCm - this.cardSizeCm.x / 2 + halfW
      const anchorY = Math.min(caseTopY + this.heightAboveCaseCm + halfH, this.focus.y + this.heightAboveTargetCm + halfH)
      const anchor = new vec3(this.focus.x, anchorY, this.focus.z).add(right.uniformScale(this.side * sideShift))
      target = camPos.add(anchor.sub(camPos).uniformScale(t))
    }
    this.lastTarget = target

    const tr = this.getTransform()
    if (!this.initialized) {
      tr.setWorldPosition(target)
      this.initialized = true
    } else {
      const k = 1 - Math.exp(-getDeltaTime() * this.followSpeed)
      tr.setWorldPosition(vec3.lerp(tr.getWorldPosition(), target, k))
    }

    let face = camPos.sub(tr.getWorldPosition())
    face = new vec3(face.x, 0, face.z)
    if (face.length > 1e-3) tr.setWorldRotation(quat.lookAt(face.normalize(), up))
  }
}

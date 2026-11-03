import {Interactable} from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable"
import {InteractorEvent} from "SpectaclesInteractionKit.lspkg/Core/Interactor/InteractorEvent"
import Event, {PublicApi} from "SpectaclesInteractionKit.lspkg/Utils/Event"

/**
 * PCFixCoachPlacementSurface — the pinchable top of the STANDIN virtual table.
 *
 * Lives on the unit-scale STANDIN_TableSurface wrapper. Adds a box collider + SIK
 * Interactable; a pinch (mouse click in Interactive Preview) fires onPlaceRequested.
 * Brightens the table top while aimed at so the target reads as pinchable.
 *
 * Owns: table collider, hover highlight. Must not: place the PC (Main does).
 */
@component
export class PCFixCoachPlacementSurface extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">PCFixCoachPlacementSurface – pinch-to-place table top</span>')
  @ui.separator
  @ui.label('<span style="color: #60A5FA;">References</span>')
  @ui.group_start("References")
  @input
  @hint("The table-top visual to brighten while aimed at.")
  topVisual: RenderMeshVisual
  @ui.group_end

  @ui.separator
  @ui.label('<span style="color: #60A5FA;">Settings</span>')
  @ui.group_start("Settings")
  @input
  @hint("Size (cm) of the pinchable box over the table top.")
  surfaceSizeCm: vec3 = new vec3(120, 4, 60)

  @input
  @widget(new SliderWidget(0, 0.6, 0.05))
  @hint("How much the table top brightens while aimed at.")
  hoverBrighten: number = 0.25
  @ui.group_end

  private _onPlaceRequested = new Event<vec3>()
  /** Fires with the world-space hit point of the pinch. */
  get onPlaceRequested(): PublicApi<vec3> {
    return this._onPlaceRequested.publicApi()
  }

  private interactable: Interactable
  private collider: ColliderComponent
  private mat: Material
  private baseColor: vec4
  private active = true

  onAwake(): void {
    this.collider = this.sceneObject.createComponent("Physics.ColliderComponent") as ColliderComponent
    const shape = Shape.createBoxShape()
    shape.size = this.surfaceSizeCm
    this.collider.shape = shape
    this.collider.fitVisual = false
    this.interactable = this.sceneObject.createComponent(Interactable.getTypeName()) as Interactable
    this.interactable.targetingMode = 3

    if (this.topVisual && this.topVisual.mainMaterial) {
      this.mat = this.topVisual.mainMaterial.clone()
      this.topVisual.mainMaterial = this.mat
      this.baseColor = this.mat.mainPass.baseColor
    }

    this.createEvent("OnStartEvent").bind(() => {
      this.interactable.onTriggerEnd.add((e: InteractorEvent) => {
        if (!this.active) return
        const hit = e.interactor && e.interactor.targetHitInfo ? e.interactor.targetHitInfo.hit.position : null
        this._onPlaceRequested.invoke(hit ? hit : this.getTransform().getWorldPosition())
      })
      this.interactable.onHoverEnter.add(() => this.setTint(this.active ? this.hoverBrighten : 0))
      this.interactable.onHoverExit.add(() => this.setTint(0))
    })
  }

  /** Disable pinching once the PC is placed. */
  setActive(on: boolean): void {
    this.active = on
    if (this.interactable) this.interactable.enabled = on
    if (this.collider) this.collider.enabled = on
    if (!on) this.setTint(0)
  }

  isActive(): boolean {
    return this.active
  }

  private setTint(k: number): void {
    if (!this.mat) return
    this.mat.mainPass.baseColor = vec4.lerp(this.baseColor, new vec4(1, 1, 1, 1), k)
  }
}

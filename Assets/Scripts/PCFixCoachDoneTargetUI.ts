import {RoundButton} from "SpectaclesUIKit.lspkg/Scripts/Components/Button/RoundButton"
import {ElementContent} from "SpectaclesUIKit.lspkg/Scripts/Components/Content/ElementContent"
import Event, {PublicApi} from "SpectaclesInteractionKit.lspkg/Utils/Event"

/**
 * PCFixCoachDoneTargetUI — the large (~8 cm) pinchable "Done" target for step 2
 * (locate the PCIe x16 slot). UIKit RoundButton with a check icon + "Done" label.
 *
 * Passive view: Main calls show()/hide(); a pinch fires onDone. Starts hidden.
 * The button lives on a child host so the component's own SceneObject stays enabled
 * (UIKit buttons must reach OnStart before they are hidden).
 *
 * Owns: the button visuals. Must not: advance steps itself.
 */
const ICON_CHECK = requireAsset("../Icons/check.png") as Texture

@component
export class PCFixCoachDoneTargetUI extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">PCFixCoachDoneTargetUI – step 2 Done target</span>')
  @ui.separator
  @ui.label('<span style="color: #60A5FA;">Settings</span>')
  @ui.group_start("Settings")
  @input
  @widget(new SliderWidget(4, 14, 0.5))
  @hint("Diameter of the Done target in cm.")
  diameterCm: number = 8

  @input
  @hint("Label under the check icon.")
  label: string = "Done"
  @ui.group_end

  private _onDone = new Event<void>()
  get onDone(): PublicApi<void> {
    return this._onDone.publicApi()
  }

  private host: SceneObject
  private button: RoundButton
  private ready = false
  private wantVisible = false

  onAwake(): void {
    this.sceneObject.createComponent("Component.Canvas")
    this.host = global.scene.createSceneObject("DoneButton")
    this.host.setParent(this.sceneObject)
    this.button = this.host.createComponent(RoundButton.getTypeName()) as RoundButton
    this.button.width = this.diameterCm // before init
    const ec = this.host.createComponent(ElementContent.getTypeName()) as ElementContent
    ec.leadingIcon = ICON_CHECK
    ec.iconLayout = "top"
    ec.text = this.label
    ec.textSize = 30
    ec.spacing = 0.2

    this.button.onInitialized.add(() => {
      this.ready = true
      this.host.enabled = this.wantVisible // hide only after init
    })
    this.button.onTriggerUp.add(() => {
      if (!this.wantVisible) return
      this._onDone.invoke()
    })
  }

  show(): void {
    this.wantVisible = true
    if (this.ready) this.host.enabled = true
  }

  hide(): void {
    this.wantVisible = false
    if (this.ready) this.host.enabled = false
  }

  get isShown(): boolean {
    return this.wantVisible
  }

  /** Test hook: same path as a pinch on the button. */
  press(): void {
    if (this.wantVisible) this._onDone.invoke()
  }
}

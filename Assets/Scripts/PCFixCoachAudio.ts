/**
 * PCFixCoachAudio — one-shot SFX for the GPU install flow.
 *
 * Lives on the "Audio" child of the PCFixCoach root. Creates one AudioComponent per cue
 * (LowLatency, since every cue answers a user action).
 *
 * Owns: SFX playback + volume. Must not: decide when cues fire (Main calls play*).
 */
const SFX_PLACE = requireAsset("../GeneratedSFX/PlacePC.wav") as AudioTrackAsset
const SFX_GRAB = requireAsset("../GeneratedSFX/GrabPart.wav") as AudioTrackAsset
const SFX_SNAP = requireAsset("../GeneratedSFX/SnapIn.wav") as AudioTrackAsset
const SFX_WRONG = requireAsset("../GeneratedSFX/WrongDrop.wav") as AudioTrackAsset
const SFX_STEP = requireAsset("../GeneratedSFX/StepDone.wav") as AudioTrackAsset
const SFX_DONE = requireAsset("../GeneratedSFX/GPUInstalled.wav") as AudioTrackAsset

export type PCFixCoachCue = "place" | "grab" | "snap" | "wrong" | "step" | "complete"

@component
export class PCFixCoachAudio extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">PCFixCoachAudio – SFX cues</span>')
  @ui.separator
  @ui.label('<span style="color: #60A5FA;">Settings</span>')
  @ui.group_start("Settings")
  @input
  @widget(new SliderWidget(0, 1, 0.05))
  @hint("Master volume for all coaching sound effects.")
  sfxVolume: number = 0.8
  @ui.group_end

  private players: {[k: string]: AudioComponent} = {}
  /** Last cue played — handy for tests. */
  lastCue: string = ""

  onAwake(): void {
    this.add("place", SFX_PLACE)
    this.add("grab", SFX_GRAB)
    this.add("snap", SFX_SNAP)
    this.add("wrong", SFX_WRONG)
    this.add("step", SFX_STEP)
    this.add("complete", SFX_DONE)
  }

  play(cue: PCFixCoachCue): void {
    this.lastCue = cue
    const a = this.players[cue]
    if (!a || !a.audioTrack) return
    a.volume = this.sfxVolume
    if (a.isPlaying()) a.stop(false)
    a.play(1)
  }

  private add(cue: string, track: AudioTrackAsset): void {
    const so = global.scene.createSceneObject("SFX_" + cue)
    so.setParent(this.sceneObject)
    const a = so.createComponent("Component.AudioComponent") as AudioComponent
    a.audioTrack = track
    a.playbackMode = Audio.PlaybackMode.LowLatency
    a.volume = this.sfxVolume
    this.players[cue] = a
  }
}

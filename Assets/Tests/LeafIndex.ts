import {scenariosIndex} from "Leaf.lspkg/Scenarios/decorator/ScenarioIndexDecorator"
import {ScenarioMetadata} from "Leaf.lspkg/Scenarios/scenario/ScenarioMetadata"
import {C1PlacePcByPinchScenario} from "./C1PlacePcByPinchScenario"
import {C1PlacePcByHandPinchScenario} from "./C1PlacePcByHandPinchScenario"
import {C1PcAnchoredWhileUserMovesScenario} from "./C1PcAnchoredWhileUserMovesScenario"
import {C2GuidanceEachStepRealScenario} from "./C2GuidanceEachStepRealScenario"
import {C2GuidanceEachStepHooksScenario} from "./C2GuidanceEachStepHooksScenario"
import {C3GpuDragSnapsAndAdvancesRealScenario} from "./C3GpuDragSnapsAndAdvancesRealScenario"
import {C3GpuHandDragSnapsScenario} from "./C3GpuHandDragSnapsScenario"
import {C3GpuSnapDistanceRealScenario} from "./C3GpuSnapDistanceRealScenario"
import {C3GpuSnapHookScenario} from "./C3GpuSnapHookScenario"
import {C4PowerPlugDragSnapsAndAdvancesRealScenario} from "./C4PowerPlugDragSnapsAndAdvancesRealScenario"
import {C4PowerPlugSnapHookScenario} from "./C4PowerPlugSnapHookScenario"
import {WrongReleaseReturnsHomeRealScenario} from "./WrongReleaseReturnsHomeRealScenario"
import {C5CompletedOutlinesDimRealScenario} from "./C5CompletedOutlinesDimRealScenario"
import {C5EdgeArrowPointsToOffscreenTargetScenario} from "./C5EdgeArrowPointsToOffscreenTargetScenario"
import {C5GpuInstalledMessageRealScenario} from "./C5GpuInstalledMessageRealScenario"
import {C5GpuInstalledMessageHooksScenario} from "./C5GpuInstalledMessageHooksScenario"
import {IKReachTableAndDoneTargetScenario} from "./IKReachTableAndDoneTargetScenario"
import {C2CardMovesBetweenStepsRealScenario} from "./C2CardMovesBetweenStepsRealScenario"
import {C2CardSwitchesSideWithViewScenario} from "./C2CardSwitchesSideWithViewScenario"
import {C3GpuSnap3DBoundaryHookScenario} from "./C3GpuSnap3DBoundaryHookScenario"
import {C3GpuSnap3DBoundaryRealScenario} from "./C3GpuSnap3DBoundaryRealScenario"

@component
export class LeafIndex extends BaseScriptComponent {
  @scenariosIndex
  static scenariosIndex: ScenarioMetadata[] = [
    {id: "c1_place_pc_pinch", typename: C1PlacePcByPinchScenario.getTypeName()},
    {id: "c1_place_pc_hand_pinch", typename: C1PlacePcByHandPinchScenario.getTypeName()},
    {id: "c1_pc_anchored_while_user_moves", typename: C1PcAnchoredWhileUserMovesScenario.getTypeName()},
    {id: "c2_guidance_each_step_real", typename: C2GuidanceEachStepRealScenario.getTypeName()},
    {id: "c2_guidance_each_step_hooks", typename: C2GuidanceEachStepHooksScenario.getTypeName()},
    {id: "c3_gpu_drag_snaps_advances_real", typename: C3GpuDragSnapsAndAdvancesRealScenario.getTypeName()},
    {id: "c3_gpu_hand_drag_snaps", typename: C3GpuHandDragSnapsScenario.getTypeName()},
    {id: "c3_gpu_snap_distance_real", typename: C3GpuSnapDistanceRealScenario.getTypeName()},
    {id: "c3_gpu_snap_hook", typename: C3GpuSnapHookScenario.getTypeName()},
    {id: "c4_power_plug_drag_snaps_advances_real", typename: C4PowerPlugDragSnapsAndAdvancesRealScenario.getTypeName()},
    {id: "c4_power_plug_snap_hook", typename: C4PowerPlugSnapHookScenario.getTypeName()},
    {id: "c5_completed_outlines_dim_real", typename: C5CompletedOutlinesDimRealScenario.getTypeName()},
    {id: "c5_edge_arrow_offscreen_target", typename: C5EdgeArrowPointsToOffscreenTargetScenario.getTypeName()},
    {id: "c5_gpu_installed_message_real", typename: C5GpuInstalledMessageRealScenario.getTypeName()},
    {id: "c5_gpu_installed_message_hooks", typename: C5GpuInstalledMessageHooksScenario.getTypeName()},
    {id: "wrong_release_returns_home_real", typename: WrongReleaseReturnsHomeRealScenario.getTypeName()},
    {id: "ik_reach_table_and_done_target", typename: IKReachTableAndDoneTargetScenario.getTypeName()},
    {id: "c2_card_moves_between_steps_real", typename: C2CardMovesBetweenStepsRealScenario.getTypeName()},
    {id: "c2_card_switches_side_with_view", typename: C2CardSwitchesSideWithViewScenario.getTypeName()},
    {id: "c3_gpu_snap_3d_boundary_hook", typename: C3GpuSnap3DBoundaryHookScenario.getTypeName()},
    {id: "c3_gpu_snap_3d_boundary_real", typename: C3GpuSnap3DBoundaryRealScenario.getTypeName()},
  ]
}

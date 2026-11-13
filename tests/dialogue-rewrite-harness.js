// Read-only diagnostics, loaded only by the explicitly isolated local playtest.
export function mountDialogueRewriteHarness({getSim,world}){
 globalThis.dialogueRewriteQA=()=>{
  const s=getSim().s;
  return structuredClone({player:s.player,facts:s.facts,people:s.people,chapter:s.chapter,
   items:s.ecosystem?.items,positions:Object.fromEntries([...world.npcs].map(([id,n])=>[id,{x:n.actor.position.x,z:n.actor.position.z}])),
   yaw:world.yaw,locked:world.locked,gateVisible:world.gateBar.visible,
   details:Object.fromEntries([...world.npcs].filter(([,n])=>n.detailPose).map(([id,n])=>[id,n.detailPose.kind]))});
 };
}

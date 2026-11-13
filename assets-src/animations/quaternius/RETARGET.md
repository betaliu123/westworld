# NPC combat motions

Downloaded 2026-11-12 from the author's **Universal Animation Library [Standard]** free download:
https://quaternius.itch.io/universal-animation-library

Author: Quaternius. Original CC0 notice is in `License.txt`. `UAL1_Standard.glb` is the in-place source; original mesh is not used in-game.

`python tools/retarget-combat.py` generates seven NPC-specific packs. Each records source and target SHA-256. Clips: Sword_Idle, Jog_Fwd_Loop, Sprint_Loop, Sword_Attack, Punch_Cross, Hit_Chest, Hit_Head. The last is a brief recoil underneath an authored protective-hand startled pose.

Retargeting matches semantic limb directions between source T pose and each target A/T bind pose, then applies world-space rotation deltas. Horizontal root travel is removed; game navigation owns movement. Sword sockets use the actual palm's radial direction, rather than assuming every hand has the hero's local axes.

The shared HeroCombat clock owns damage at contact; animation playback never deals damage. Existing local-only hero motion assets are not copied or republished.

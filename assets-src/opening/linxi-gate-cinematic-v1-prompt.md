# 临溪城门 · 电影镜头样张 v1

日期：2026-11-12。制作方式：内置 image_gen；工具未暴露具体模型选择参数。

用途：四张开场中的关口镜头风格试作，尚未接入游戏。

生成输出：`linxi-gate-cinematic-v1.png`，1672×941，RGB。已检查人物手部与背影、城门、纲车、无嵌入文字；尚待用户确认美术方向。实际输出分辨率低于提示词目标 2048×1152，未做人工放大。

用户新反馈：原先古画插页样张不够美观、电影感不足；提供三张武侠剧情过场参考，要求类似的电影镜头。

参考图仅用于镜头、光影和材质，不复用其剧情、人物与 UI：
- codex-clipboard-6030f5d5-98bf-4d53-a169-cc3e1121890d.png：低机位、近处人物、斜向动作与远近关系。
- codex-clipboard-378ebc2d-9bcf-4f01-baa3-4f67fd661b9f.png：建筑尺度与空间压迫感。
- codex-clipboard-84373342-3ce0-42c0-8b70-9d0b4dea3807.png：人物动作、服饰材质与自然光。

主角仍以背面和遮脸角度出镜，不固定玩家性别；蛊毒是既有背景，不新增中毒缘由。生成内容不代表游戏新增了毒发扣血或城门动画。

## 完整提示词

```text
Use case: stylized-concept.
Asset: a single cinematic wuxia story cutscene still for a game opening, delivered as a flat 2D raster image, landscape 16:9, preferably 2048x1152.

REFERENCE ROLES: All THREE attached images are CINEMATOGRAPHY, MATERIAL AND RENDERING references, not scenes or characters to copy. Image 1: the bold low camera, close foreground character, diagonal staging and huge depth separation. Image 2: imposing architectural scale, wide-angle spatial energy, selective light and shadow. Image 3: beautiful premium Chinese wuxia character and costume materials, emotionally legible human gestures, selective focus and natural light. Ignore all text, browser bars and UI in these references. Render the new shot with similarly polished, dimensional, realistic cinematic CG / matte-painting finish. "2D" describes the delivered still image: do NOT flatten it into ink illustration. Abandon parchment texture, uniformly etched outlines and the antique landscape-painting look.

NEW STORY SHOT — ARRIVING AT LINXI, THE GATE ABOUT TO CLOSE:
Northern Song wuxia. A lone traveler, already suffering from an established gu poison, has reached Linxi seeking a route to Genyue and a possible cure. Just as they try to enter, the imperial ornamental-stone tribute convoy takes priority and the gate is being closed. Show one suspended dramatic instant that makes this personal predicament clear. No battlefield, magic scroll, villains, burning city or companion group from the references.

CAMERA / BLOCKING:
Very close, low three-quarter rear camera beside the traveler at roughly their waist height, 28–32mm cinematic lens perspective. The traveler fills the left 40 percent of the frame, cropped by the left and lower frame edges, NOT a small figure centered in a pretty landscape. Their upper body pitches forward after a brief pang; one clearly articulated hand presses against a rough waist-high roadside stone parapet close to camera, supporting their weight. The other forearm is drawn toward the body. They turn their head toward the gate across the frame. Their body and arm make a strong diagonal from lower left toward middle right, and the near stone parapet leads into depth. Visually natural anatomy and shoulder/hand placement. Only the near hand is prominent; the far arm can remain partly occluded.
Beyond the traveler, the road rises slightly to a substantial Song town gate occupying the right-center upper half, just 15–25 meters away. The gate is a believable weathered masonry wall topped by a dark timber-and-tile gatehouse, large in perspective, not an imperial palace or miniature background prop. One heavy gate leaf has begun to swing inward across the opening. Through the remaining gap, the last timber cart carrying one beautiful pale perforated scholar's rock lashed with thick ropes rolls inside. Two or three subdued distant workers/guards maximum. An ochre convoy banner strains sideways in the wind above the cart. Architecture recedes behind the gate into damp atmospheric depth. Strong occlusion and three spatial planes: intimate traveler/hand foreground, stone convoy middle ground, imposing gateway behind.

CHARACTER:
A graceful young adult martial traveler of deliberately ambiguous gender, seen from behind and under the shadow of a broad woven straw hat, with no recognizable face. Dark tied hair, a complete and well-tailored charcoal/slate cross-collar traveling robe, subtle layered fabric, fitted cloth wrist wraps, restrained weathered leather belt, and a compact neat cloth travel bundle. Elegant silhouette and convincing fabric folds. Travel wear but intact and cared-for clothes, no rags or beggar styling, no massive armor or decorative weapons. A narrow loose sleeve edge and belt cloth move in the wind. The bent posture and tightened hand convey pain restrained by determination, not theatrical collapse. Keep the skin normal: no gore, no glowing veins or visible insects.

LIGHT / BEAUTY:
After-rain late-afternoon light breaking beneath dense slate-blue clouds. A low warm sidelight picks out the hand, hat edge, shoulder folds, wet stone edges and the pale rock on the cart. Cool soft sky fill preserves readable dark cloth detail. The opening inside the gate has a subtle warm glow from sunlight, suggesting the urgently desired destination. Sophisticated restrained warm/cool contrast, rich but natural colors, crisp focal detail on hand/shoulder and nuanced depth falloff toward the gate. Fine mist in the gate passage, not a uniform gray veil. A little windborne road dust and one or two leaves, no particle storm. Premium polished Chinese wuxia cutscene aesthetic, realistic fabric/stone/wood, atmospheric cinematic lighting, expressive framing, no toy/plastic character finish. Black levels must retain texture; do not make everything dark.

OUTPUT CONSTRAINTS:
One full-bleed image, no collage, no black letterbox bars, NO TEXT OR UI of any kind, no signs with writing, no captions, no logo/watermark. Keep the lower middle visually quiet enough for a separate subtitle without creating a blank strip. Do not copy specific named characters or outfits from the references. Avoid a scenic postcard, ink wash, parchment, etched illustration, centered full-body travel portrait, generic open-world gameplay camera, oversaturated teal-orange filter, gratuitous destruction or supernatural spectacle.
```

# 艮岳湖山远眺 · v3 用户参考图编辑

日期：2026-11-12。用户认为上一版岩石与建筑细节过密，要求基于所提供的秋色湖山图，在山上加宫殿，并与另一张开场图的风格更统一。

方式：内置 image_gen 编辑。输入一为用户提供的上下两种色调的湖山截图，保留共同构图并取下半张暖色；输入二为 `linxi-gate-cinematic-v1.png`，仅用于写实材质与电影光影。输出一张完整画面，保留旧版本。

输出文件：`02-genyue-lake-cinematic-v3.png`，1672×941 RGB PNG。用户参考原图另存 `reference-autumn-lake-user.png`。已查看宫殿位置、湖面留白、大片岩面、原图廊桥和秋树的保留、截图边框移除及无嵌入文字。未做人工放大，尚未接入游戏。

第一幕字幕沿用用户定稿，单独排版：

> 你身中蛊毒，寻医无果。
> 听闻道君皇帝营建仙山艮岳，招聚天下异人，仙山上必有解毒之法。

## 完整提示词

```text
Use case: style-transfer / precise-object-edit.
Task: EDIT the supplied lake-and-mountain landscape into ONE finished cinematic wuxia opening image, adding an imperial palace on the distant mountain and gently harmonizing its rendering with the second input, a traveler-at-the-town-gate cutscene.

INPUT ROLES:
Image 1 is the EDIT TARGET: a screenshot containing two stacked color treatments of the SAME autumn lake landscape. Use the lower landscape's warm golden atmosphere and the shared scene composition as the basis. Produce ONLY ONE coherent landscape, not two panels. Remove all screenshot chrome, the blue strip, black margins, separator, border and paper tint.
Image 2 is a STYLE REFERENCE ONLY: borrow its natural dimensional materials, sophisticated restrained cinematic lighting and realistic wuxia cutscene finish. Do not import its town gate, close-up traveler, carts or rocks.

PRESERVE THE TARGET'S APPEAL AND LAYOUT:
Keep its broad open lake in the middle, beautiful golden autumn trees at the left shore, the existing elegant pavilion/tower nestled among those trees, small distant sailboats, the slender curving pedestrian bridge spanning the water near the lower middle-right, softly suggested pale reeds across the nearest bank, and the distinctive tall mountain group rising on the right across the lake. Preserve spacious calm water and clear air between the major visual masses. The scene must remain recognizable as this supplied landscape, with its restful elegant openness. If retaining the tiny foreground traveler at the far right, keep them minute and anonymous, seen from behind, in a dark travel robe; no recognizable face or gender. They stand on the distant opposite lakeshore from the mountain. Do not add other figures.

MAIN EDIT — PALACE:
Add a beautifully proportioned, coherent Northern Song inspired imperial palace on a broad natural terrace HIGH ON THE RIGHT-HAND MOUNTAIN, visibly above the lake and bridge. One clear dominant main hall and only two subordinate halls, with elegant wide upturned tiled roofs, warm ochre roof highlights, dark timber structure and restrained pale stone terraces. Their silhouette must read as an impressive imperial destination at a distance. They should integrate naturally into the existing mountain, not sit on a newly invented enormous fortress. Keep the rest of the peaks clean. Do not scatter dozens of miniature pavilions or windows over every ridge; no densely stacked town, no crowds of pagodas. The existing lakefront pavilion stays smaller and secondary.

CRITICAL TEXTURE REQUEST:
The user disliked the prior generated image because its repeated dense rock formations felt trypophobic. Use broad, handsome, smooth-faced mountain planes and only a few purposeful large fissures and pine silhouettes. NO honeycomb holes, perforated scholar's rocks, porous surfaces, skull-like rock cavities, repeating tiny crags, clusters of dots, or dense pebbly patterns. Treat foliage and reeds as soft natural grouped masses at this viewing distance, not individually sharpened repetitive flecks. Give water, sky and mist plenty of low-detail breathing room.

STYLE / LIGHT / COLOR:
Unify gently with the gate reference: polished, realistic cinematic wuxia matte painting / premium CG still, rendered as one 2D image, physically plausible depth and material. Natural late-afternoon warm ivory sunlight brushes the golden leaves, palace roofs and mountain shoulder; cool desaturated slate-blue and jade-green shadows and a soft luminous lake. Lift the dark side enough to keep the landscape inviting and readable. Thin ribbons of white mist wrap the mountain shoulders and recede across the lake. Beautiful soft sky with warm cloud breaks. Retain the autumn yellow and tranquil water of the user's picture, but reduce electric cyan, saturated neon yellow and aged golden-paper wash. Do not make the whole landscape gray, dark or uniformly sepia. Detailed only where it matters: palace silhouette, selected branch/bridge shapes, shore. No ink drawing, antique paper, etched outlines, anime, plastic render or lens-flare effects.

OUTPUT:
One full-bleed landscape 16:9, preferably 2048x1152, suitable for the same opening sequence as the gate image. Adapt the screenshot's very wide composition to 16:9 by allowing a little more sky and quiet foreground while preserving the spatial arrangement; do not crop out lake or right mountain. Keep the lower center calm enough for separately overlaid subtitles. NO TEXT, UI, logos, watermarks, borders, split screen or black letterbox bars. The image should convey an elegant imperial 'immortal mountain' across a serene autumn lake, with one clear palace destination and ample visual rest.
```

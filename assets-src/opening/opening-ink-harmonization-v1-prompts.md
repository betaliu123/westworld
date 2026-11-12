# 两张开场图 · 轻水墨统一

日期：2026-11-12。用户确认城门近景与秋色湖山宫殿两张图，要求画风稍作统一，更贴近后续实际游玩的水墨感。

方式：内置 image_gen 编辑。先编辑城门图，再以编辑后的城门图作为仙山图的画风参照；实际游戏截图仅提供纸墨色调与气氛参照，不移入 UI、场景几何或人物。未指定工具无法核验的模型版本。

输出：
- `linxi-gate-ink-v2.png`：保留人物扶栏姿态、纲车、城门与低机位，以较大墨色层次与轻笔触收整衣料、岩面和反光。
- `02-genyue-lake-ink-v4.png`：保留湖面、秋树、廊桥、宫殿与旅人位置，以同等强度的轻水墨统一山石、云雾、树叶和水面。

两张均保留电影构图和空间层次，第一幕字幕沿用用户定稿。旧版图片保留，当前只交付素材，尚未接入游戏。

## 成品检查

两张均为 1672×941 RGB PNG，未做人工放大。已逐张查看构图、手部与人物姿态、湖面留白、宫殿和廊桥位置，以及两张墨色与笔触的协调；无嵌入字幕或 UI。

| 文件 | 字节数 | SHA-256 |
| --- | --- | --- |
| `linxi-gate-ink-v2.png` | 2602795 | `9b37c87713a5ecb2cca87cbc04800e6e44d8b0bce5558c782218a1e2dbeef474` |
| `02-genyue-lake-ink-v4.png` | 2521191 | `f0323bd3dd4afe05c41846ed8b28ba0d5885a38e5715fef23156fe7fb8dff453` |

## 城门图完整提示词

```text
Use case: style-transfer. EDIT IMAGE 1 ONLY into one 16:9 landscape image, same framing and composition. No collage.
INPUT ROLES:
1. The traveler bracing against the stone parapet outside the town gate: EXACT EDIT TARGET.
2. The autumn lake and distant mountain palace: the other approved opening image; sibling palette reference only. Do not import any of its objects.
3. The actual gameplay screenshot: tonal and ink-atmosphere context ONLY. Borrow its paper-neutral light, muted ink shadows and limited mineral pigments, not its low-detail geometry, camera, models, UI, text or HUD.
SHARED TWO-IMAGE FINISH — LIGHT CINEMATIC INK PAINTING:
The user has approved these two compositions and asks only for a SLIGHT stylistic harmonization toward the actual game's Chinese ink-painting atmosphere. Preserve the cinematic staging, emotional clarity, modeled volumes, depth, camera and all major details. Treat this as roughly 75% of the current cinematic image with 25% restrained ink-and-mineral-pigment finish, not a wholesale remake.
Use nuanced warm black / charcoal ink, pale neutral paper-ivory light, quiet slate/azurite blue and jade gray-green distance, subdued ochre accents. Retain local colors and warm directional sunlight. Brush modulation should be perceptible in broad clothing folds, rock planes, foliage groups and clouds. Fine dry-brush structure at a few edges; faint soft ink diffusion only in atmospheric distance. Simplify microtexture and highlights, allowing richer larger tonal masses and visual breathing room. Skin, cloth, wood and stone remain distinct, with anatomical and architectural clarity. A very fine barely perceptible unaged paper tooth is allowed within painted surfaces, but no pasted parchment overlay, yellow antique wash, vignettes or blank paper border. Keep excellent cinematic light/shadow structure, no flattening everything to beige, no equally dark outlines around all objects. No heavy traditional scroll illustration, no monochrome wash, no caricature, no low-poly geometry, no fantasy glow. The result should feel like a premium wuxia film frame translated gently into painted ink, retaining the user's selected composition and visual impact.

PRESERVE THE TARGET:
Keep the identical close low three-quarter rear camera; the traveler fills the left foreground in the same pose with the near hand bracing against the parapet and the other arm at the abdomen. Preserve exact natural hands, face hidden by the same straw hat, tied hair, same robe silhouette, pack and straps. Do not change gender presentation or make new facial details. Preserve the current gatehouse location and size, gate-leaf angle, two distant workers, wooden cart, single pale ornamental tribute rock and ochre flag, wet roadside stones and composition. Keep the line of sight from the hand/shoulder toward the gate and the warm light inside. No additions, removals, new signage or extra figures.

SPECIFIC STYLE CHANGES:
Translate the microscopic repeated robe weave into a more restrained wash-and-dry-brush textile surface while keeping its layered folds and subtle motifs. Give the dark robe expressive graded ink masses without making it a featureless black silhouette. The straw hat, wet parapet and wall bricks retain believable form but have fewer sharp micro-reflections and slightly brushed transitions. Render the hand naturally with soft painted modeling, not photoreal skin pores or a hard outline. Let distant architecture and mist softly dissolve in ink-like atmospheric values. Keep the ochre banner as a muted warm accent. Preserve the main rock's existing overall shape and negative spaces, but do not increase hole counts or dense dotted texture.
The light touch is critical: this must still be immediately recognizable as the user's chosen cinematic gate image and remain visually striking. Full-bleed 16:9, preferably 2048x1152; NO TEXT, subtitles, seals, calligraphy, watermark, frame, black bars or UI.
```

## 仙山图完整提示词

```text
Use case: style-transfer. EDIT IMAGE 1 ONLY into one 16:9 landscape image, preserving its exact composition. This is the companion opening image to Image 2.
INPUT ROLES:
1. The autumn lake, bridge and distant mountain palace: EXACT EDIT TARGET.
2. The newly finished softly ink-painted traveler-at-the-gate image: MATCH THIS FINISH. Use it as the authoritative reference for brush texture, degree of stylization, warm ink neutrals, controlled highlights and atmospheric softness. Do not import its content.
3. Actual gameplay screenshot: secondary context for ink atmosphere only. Do not reproduce any UI, text, models, camera, coarse geometry or HUD.
SHARED TWO-IMAGE FINISH — LIGHT CINEMATIC INK PAINTING:
The user has approved these two compositions and asks only for a SLIGHT stylistic harmonization toward the actual game's Chinese ink-painting atmosphere. Preserve the cinematic staging, emotional clarity, modeled volumes, depth, camera and all major details. Treat this as roughly 75% of the current cinematic image with 25% restrained ink-and-mineral-pigment finish, not a wholesale remake.
Use nuanced warm black / charcoal ink, pale neutral paper-ivory light, quiet slate/azurite blue and jade gray-green distance, subdued ochre accents. Retain local colors and warm directional sunlight. Brush modulation should be perceptible in broad clothing folds, rock planes, foliage groups and clouds. Fine dry-brush structure at a few edges; faint soft ink diffusion only in atmospheric distance. Simplify microtexture and highlights, allowing richer larger tonal masses and visual breathing room. Skin, cloth, wood and stone remain distinct, with anatomical and architectural clarity. A very fine barely perceptible unaged paper tooth is allowed within painted surfaces, but no pasted parchment overlay, yellow antique wash, vignettes or blank paper border. Keep excellent cinematic light/shadow structure, no flattening everything to beige, no equally dark outlines around all objects. No heavy traditional scroll illustration, no monochrome wash, no caricature, no low-poly geometry, no fantasy glow. The result should feel like a premium wuxia film frame translated gently into painted ink, retaining the user's selected composition and visual impact.

CONTINUITY PRIORITY:
Use the same amount of visible brushwork as Image 2, the same charcoal/ivory tonal family and understated surface texture. It should be obvious that these two paintings belong to the same opening sequence. Keep the lake image airy and luminous, with restrained ochre autumn trees and gray-green/slate-blue water so it does not become one flat sepia image. Preserve the warm direction of sunlight from the upper right. No over-saturated golden trees or glossy water.

PRESERVE THE TARGET EXACTLY:
Same camera, same open lake occupying the center, same left-hand autumn tree masses and pavilion tower, small left cliff pavilion, same three sailboats, the same slender bridge and its pavilion across the lower center-right, same white-gold foreground reeds and tiny anonymous rear-view traveler at the lower right. Preserve the right-hand mountain's smooth broad shape, the EXACT same main palace and two smaller accompanying halls, stairway and terraces, all in their existing locations and scale. Preserve the distant mountain ridges and mist wrapping the slope. Do not add architecture, figures, boats, ornaments, new paths or extra peaks. Do not change the tiny traveler's identity presentation.

LIGHT STYLE CHANGES ONLY:
Translate distant hills, clouds and water into restrained layered ink washes with selective soft edges, without losing the original lighting and depth. Paint the major autumn foliage as elegant ochre brush groups, not hundreds of equally sharp individual leaves. Render foreground reeds with a few expressive directional strokes and soft clusters, keeping them out of competition with the palace. Use broad brushed stone planes with sparse fine dry-brush texture; absolutely no porous rock holes, stippled micro-crags or crowded repetitive texture. Palace, bridge and boats retain accurate silhouettes and only enough controlled line-and-wash detail to read beautifully. Reflections become subtle horizontal painted marks and quiet tonal water. The final visual should match the companion gate image's gentle painted quality, not a fully traditional flat scroll and not photoreal CG. Keep the source's spaciousness and balanced composition.

OUTPUT:
One full-bleed landscape 16:9, preferably 2048x1152. No text, calligraphy, red seals, watermarks, UI, frame, black bars or comparison panels. No aged yellow paper overlay. Preserve all original visual storytelling and all original object positions.
```

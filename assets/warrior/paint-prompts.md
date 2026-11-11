# Texture paint prompts

Tool: built-in `image_gen`; use case: `precise-object-edit`.
Outputs copied to this directory; no external API runner was used.

## Front

Edit the 900×1100 orthographic front render of the sample. The supplied warrior
sprite is a detail/color reference only. Preserve canvas aspect, camera, framing,
silhouette, every body-part position, dimensions, hair locks, face, belt and shoes.
Repaint only surfaces: sharp amber anime eyes in the existing sockets, dark upper
eyelids and pupils, confident eyebrows, clean mouth, honey-gold hair with fine
painted strands, warm skin, indigo-purple shorts with gold ornamental embroidery,
chestnut leather belt/pouch with stitching, silver buckle and bracer edges, plum
fingerless gloves, gold boot laces and silver plates. Adapt reference detail to
the exact model geometry. Soft even neutral diffuse light, minimal shading,
no harsh shadows or directional highlights. Keep floor and background unchanged;
no props or text. Preserve bangs even where they occlude the face. One front view.

## Back

Edit the exact back orthographic render; use the repainted front for palette and
finish only. Warm tan skin, honey-gold hair with distinct fine painted locks,
indigo-purple shorts with crisp gold hem piping, chestnut belts/straps with
stitching, plum gloves/boots, silver edging. Preserve exact geometry, silhouette,
body-part/hair positions, camera, framing and aspect. Do not add accessories or
ornament geometry. Sharp material detail without gritty noise. Even diffuse light,
minimal directional shading, no strong highlights. Keep background and floor.
One full-body back view.

These are the consolidated generation instructions. The saved images are the
reproducible inputs; generating again does not guarantee pixel-identical paint.

# Hero images: glow-up before and after, for both versions

Four portraits, shot front-on, waist up (head to mid torso), centred, black seamless backdrop (#0a0c0b),
same person within a pair, 4:5 portrait, highest resolution. Run each prompt with
`codex exec -m gpt-5.5 -s workspace-write -C <dir> "<prompt>"` (needs image generation credits), save the
files as f-before.png, f-after.png, m-before.png, m-after.png, then run:

    /tmp/fvenv/bin/python tools/hero-images/cutout.py f-before.png f-after.png m-before.png m-after.png

The after is generated FIRST EDITED FROM the before (attach the before with `-i`) so it is clearly the same person.

## Before (same style for both)
Plain, tired, unstyled: messy or flat hair, plain washed-out grey t-shirt or hoodie, slightly slouched shoulders,
neutral or tired expression, dull skin with a visible acne breakout, redness, uneven tone, shadows under the eyes.
Soft flat even lighting. Real, unretouched.

## After, female
Same woman, a glow-up: styled hair with shape and shine, clear healthy glowing skin with natural texture (not
airbrushed), brows groomed, a well-fitted dark tailored top or blazer over a simple tee, relaxed confident
posture, head slightly tilted, calm confident look into the camera, subtle natural light and a soft rim light.
Same backdrop. Same face, same eyes, same bone structure.

## After, male
Same man, a glow-up: a good haircut with texture, healthy even skin with natural texture, groomed brows and
clean beard line or clean shave, a well-fitted dark jacket or overshirt over a plain tee, shoulders back,
relaxed confident posture, slight head tilt, steady confident look into the camera, subtle rim light.
Same backdrop. Same face, same eyes, same bone structure.

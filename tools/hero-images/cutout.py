"""Cut the four hero portraits out of their background and write assets/img/hero/{f,m}/{before,after}.webp
plus {f,m}/meta.json (face position of the AFTER image, used for the round switcher portraits).
Usage: python cutout.py f-before.png f-after.png m-before.png m-after.png   (needs rembg, Pillow, mediapipe)"""
import sys, os, json
from PIL import Image
from rembg import remove, new_session
names = [('f', 'before'), ('f', 'after'), ('m', 'before'), ('m', 'after')]
here = os.path.dirname(os.path.abspath(__file__))
root = os.path.join(here, '..', '..', 'assets', 'img', 'hero')
MODEL = os.environ.get('FACE_MODEL', '/Users/Lucas/Desktop/Archive/E-Muell/website-shots/tools/face_landmarker.task')
s = new_session('u2net_human_seg')

def face_meta(img):
    """cx, cy = face centre, s = crop width for a round avatar, all as a share of the image."""
    try:
        import numpy as np, mediapipe as mp
        from mediapipe.tasks import python as mpp
        from mediapipe.tasks.python import vision
        flat = Image.new('RGBA', img.size, (10, 12, 11, 255)); flat.alpha_composite(img.convert('RGBA'))
        tmp = os.path.join(here, '_flat.png'); flat.convert('RGB').save(tmp)
        fl = vision.FaceLandmarker.create_from_options(vision.FaceLandmarkerOptions(base_options=mpp.BaseOptions(model_asset_path=MODEL), num_faces=1))
        L = np.array([[p.x, p.y] for p in fl.detect(mp.Image.create_from_file(tmp)).face_landmarks[0]])
        os.remove(tmp)
        w = float(abs(L[454][0] - L[234][0]))
        return {'cx': round(float((L[234][0] + L[454][0]) / 2), 4), 'cy': round(float((L[10][1] + L[152][1]) / 2), 4), 's': round(min(.9, w * 1.15), 4)}
    except Exception as e:
        print('face meta failed, using defaults:', e)
        return {'cx': .5, 'cy': .38, 's': .5}

for (g, kind), path in zip(names, sys.argv[1:5]):
    out = os.path.join(root, g, kind + '.webp')
    os.makedirs(os.path.dirname(out), exist_ok=True)
    cut = remove(Image.open(path).convert('RGB'), session=s)
    cut.save(out, quality=90, method=6)
    print('wrote', out)
    if kind == 'after':
        import numpy as np
        a = np.asarray(cut.convert('RGBA'))[..., 3].astype(np.float32) / 255
        t = np.clip((a - .35) / .45, 0, 1)
        m = np.zeros((*a.shape, 4), np.uint8); m[..., :3] = 255; m[..., 3] = (t * 255).astype(np.uint8)
        Image.fromarray(m, 'RGBA').save(os.path.join(root, g, 'mask.webp'), quality=85, method=6)
        meta = face_meta(cut)
        json.dump(meta, open(os.path.join(root, g, 'meta.json'), 'w'))
        print('meta', g, meta)

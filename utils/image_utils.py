from PIL import Image
import os

SUPPORTED_OUT = ['png','jpg','jpeg','webp','tiff','bmp']

def convert_image(in_path, out_dir, out_format='png', resize=None, quality=90):
    if out_format.lower() == 'jpg':
        out_format = 'jpeg'
    out_format = out_format.lower()
    if out_format not in SUPPORTED_OUT:
        raise ValueError(f'Unsupported output format: {out_format}')
    img = Image.open(in_path)
    if resize:
        w,h = resize
        img = img.resize((w,h))
    base = os.path.splitext(os.path.basename(in_path))[0]
    out_path = os.path.join(out_dir, f"{base}.{out_format}")
    save_kwargs = {}
    if out_format in ['jpeg','webp']:
        save_kwargs['quality'] = int(quality)
        if out_format=='jpeg':
            save_kwargs['optimize'] = True
    img.convert('RGB').save(out_path, out_format.upper(), **save_kwargs)
    return out_path

def images_to_pdf(image_paths, out_pdf):
    imgs = [Image.open(p).convert('RGB') for p in image_paths]
    first, rest = imgs[0], imgs[1:]
    first.save(out_pdf, save_all=True, append_images=rest)
    return out_pdf

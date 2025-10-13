
from PIL import Image
import os
import subprocess
import shutil

# Formats that can be READ (input formats)
SUPPORTED_INPUT = ['3fr', 'arw', 'avif', 'bmp', 'cr2', 'cr3', 'crw', 'dcr', 'dng', 'eps', 'erf', 'gif', 'heic', 'heif', 'icns', 'ico', 'jfif', 'jpeg', 'jpg', 'mos', 'mrw', 'nef', 'odd', 'odg', 'orf', 'pef', 'png', 'ppm', 'ps', 'psd', 'pub', 'raf', 'raw', 'rw2', 'tif', 'tiff', 'webp', 'x3f', 'xcf', 'xps']

# Formats PIL can write to
PIL_OUTPUT = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'tiff', 'tif', 'ico', 'ppm', 'eps', 'pdf', 'im', 'msp', 'pcx', 'sgi', 'tga', 'xbm']

# Formats ImageMagick can write to (beyond PIL)
IMAGEMAGICK_WRITE = ['avif', 'heic', 'heif', 'icns', 'jfif', 'ps', 'psd', 'xcf', 'xps']

# All supported output formats (can WRITE to)
SUPPORTED_OUTPUT = list(set(PIL_OUTPUT + IMAGEMAGICK_WRITE))

def has_imagemagick():
    """Check if ImageMagick is installed"""
    return shutil.which('convert') is not None

def convert_with_imagemagick(in_path, out_path, out_format, resize=None, quality=90):
    """Convert using ImageMagick"""
    if not has_imagemagick():
        raise RuntimeError('ImageMagick is required for this format')
    
    cmd = ['convert', in_path]
    
    if resize:
        w, h = resize
        cmd.extend(['-resize', f'{w}x{h}'])
    
    if out_format.lower() in ['jpg', 'jpeg', 'webp', 'avif', 'heic', 'heif']:
        cmd.extend(['-quality', str(quality)])
    
    # Ensure output format is specified correctly
    cmd.append(f'{out_format.lower()}:{out_path}')
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        error_msg = result.stderr.strip() if result.stderr.strip() else "Unknown error"
        raise RuntimeError(f'ImageMagick conversion failed: {error_msg}')
    
    if not os.path.exists(out_path):
        raise RuntimeError(f'ImageMagick conversion failed: Output file was not created')
    
    return out_path

def convert_image(in_path, out_dir, out_format='png', resize=None, quality=90):
    if out_format.lower() == 'jpg':
        out_format = 'jpeg'
    if out_format.lower() == 'tif':
        out_format = 'tiff'
    out_format = out_format.lower()
    
    if out_format not in SUPPORTED_OUTPUT:
        raise ValueError(f'Cannot convert TO {out_format.upper()} format. This is a read-only format. Supported output formats: {", ".join([f.upper() for f in SUPPORTED_OUTPUT])}')
    
    base = os.path.splitext(os.path.basename(in_path))[0]
    out_path = os.path.join(out_dir, f"{base}.{out_format}")
    
    # Try PIL first for supported formats
    if out_format in PIL_OUTPUT:
        try:
            img = Image.open(in_path)
            
            # Handle formats that require RGB mode
            rgb_only_formats = ['jpeg', 'jpg', 'bmp', 'jfif', 'eps', 'ps', 'pdf']
            if img.mode in ('RGBA', 'LA', 'P') and out_format in rgb_only_formats:
                img = img.convert('RGB')
            elif img.mode not in ('RGB', 'L') and out_format not in ['png', 'webp', 'gif', 'tiff', 'tif', 'ico']:
                img = img.convert('RGB')
            
            if resize:
                w, h = resize
                img = img.resize((w, h))
            
            save_kwargs = {}
            
            # Format-specific settings
            if out_format in ['jpeg', 'jpg', 'jfif']:
                save_kwargs['quality'] = int(quality)
                save_kwargs['optimize'] = True
                img.save(out_path, 'JPEG', **save_kwargs)
            elif out_format == 'webp':
                save_kwargs['quality'] = int(quality)
                img.save(out_path, 'WEBP', **save_kwargs)
            elif out_format == 'gif':
                if img.mode == 'RGBA':
                    img = img.convert('RGB')
                img.save(out_path, 'GIF')
            elif out_format == 'ico':
                save_kwargs['sizes'] = [(256, 256)]
                img.save(out_path, 'ICO', **save_kwargs)
            elif out_format in ['tiff', 'tif']:
                img.save(out_path, 'TIFF', **save_kwargs)
            elif out_format in ['eps', 'ps']:
                if img.mode != 'RGB':
                    img = img.convert('RGB')
                img.save(out_path, 'EPS')
            else:
                img.save(out_path, out_format.upper(), **save_kwargs)
            
            return out_path
        except Exception as e:
            # If PIL fails, fall back to ImageMagick
            print(f"PIL conversion failed, trying ImageMagick: {e}")
            return convert_with_imagemagick(in_path, out_path, out_format, resize, quality)
    
    # Use ImageMagick for formats PIL doesn't support
    else:
        return convert_with_imagemagick(in_path, out_path, out_format, resize, quality)

def images_to_pdf(image_paths, out_pdf):
    imgs = [Image.open(p).convert('RGB') for p in image_paths]
    first, rest = imgs[0], imgs[1:]
    first.save(out_pdf, save_all=True, append_images=rest)
    return out_pdf

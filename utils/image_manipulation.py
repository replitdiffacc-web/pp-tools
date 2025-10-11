
from PIL import Image, ImageDraw, ImageFont, ImageOps
import os

def invert_image(in_path, out_dir):
    img = Image.open(in_path)
    inverted = ImageOps.invert(img.convert('RGB'))
    base = os.path.splitext(os.path.basename(in_path))[0]
    out_path = os.path.join(out_dir, f"{base}_inverted.png")
    inverted.save(out_path)
    return out_path

def text_to_image(text, out_path, width=800, height=600, font_size=24):
    img = Image.new('RGB', (width, height), color='white')
    draw = ImageDraw.Draw(img)
    
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", font_size)
    except:
        font = ImageFont.load_default()
    
    # Simple text wrapping
    words = text.split()
    lines = []
    current_line = []
    
    for word in words:
        current_line.append(word)
        line = ' '.join(current_line)
        bbox = draw.textbbox((0, 0), line, font=font)
        if bbox[2] > width - 40:
            current_line.pop()
            lines.append(' '.join(current_line))
            current_line = [word]
    
    if current_line:
        lines.append(' '.join(current_line))
    
    y = 20
    for line in lines:
        draw.text((20, y), line, fill='black', font=font)
        y += font_size + 10
    
    img.save(out_path)
    return out_path

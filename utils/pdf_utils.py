import os
from pdf2image import convert_from_path
from pypdf import PdfReader, PdfWriter
from PIL import Image

def pdf_to_images(pdf_path, out_dir, dpi=200, fmt='png'):
    images = convert_from_path(pdf_path, dpi=dpi)
    out_files = []
    base = os.path.splitext(os.path.basename(pdf_path))[0]
    for i, img in enumerate(images):
        path = os.path.join(out_dir, f"{base}_page{i+1}.{fmt}")
        img.save(path, fmt.upper())
        out_files.append(path)
    return out_files

def merge_pdfs(pdf_paths, out_pdf):
    writer = PdfWriter()
    for p in pdf_paths:
        reader = PdfReader(p)
        for page in reader.pages:
            writer.add_page(page)
    with open(out_pdf, 'wb') as f:
        writer.write(f)
    return out_pdf

def images_to_pdf(image_paths, out_pdf):
    imgs = [Image.open(p).convert('RGB') for p in image_paths]
    first, rest = imgs[0], imgs[1:]
    first.save(out_pdf, save_all=True, append_images=rest)
    return out_pdf

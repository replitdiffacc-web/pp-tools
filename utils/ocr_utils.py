import os, tempfile
import pytesseract
from pdf2image import convert_from_path
from PIL import Image

def image_to_text(image_path, lang='eng'):
    text = pytesseract.image_to_string(Image.open(image_path), lang=lang)
    return text

def pdf_to_text(pdf_path, lang='eng', dpi=200):
    pages = convert_from_path(pdf_path, dpi=dpi)
    texts = []
    for img in pages:
        texts.append(pytesseract.image_to_string(img, lang=lang))
    return "\n\n".join(texts)

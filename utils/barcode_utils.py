import os
import platform
import ctypes
import subprocess
import json
from PIL import Image
import qrcode
import shutil
import cv2
import numpy as np

try:
    from pyzbar.pyzbar import decode as pyzbar_decode
    PYZBAR_AVAILABLE = True
except ImportError:
    PYZBAR_AVAILABLE = False
    pyzbar_decode = None

def _preload_zbar():
    if platform.system() != "Darwin":
        return
    candidates = [
        os.environ.get("ZBAR_LIBRARY_PATH"),
        "/opt/homebrew/opt/zbar/lib/libzbar.dylib",
        "/opt/homebrew/lib/libzbar.dylib",
        "/opt/homebrew/lib/libzbar.0.dylib",
        "/usr/local/lib/libzbar.dylib",
    ]
    for p in candidates:
        if p and os.path.exists(p):
            try:
                ctypes.CDLL(p, mode=getattr(ctypes, "RTLD_GLOBAL", 0))
                return
            except OSError:
                continue

_preload_zbar()

_pybar_ok = False
try:
    from pyzbar.pyzbar import decode as _pyzbar_decode
    _pybar_ok = True
except Exception:
    _pybar_ok = False

def make_qr(data, out_path):
    img = qrcode.make(data)
    img.save(out_path)
    return out_path

def _decode_with_pyzbar(image_path):
    img = Image.open(image_path)
    decoded = _pyzbar_decode(img)
    results = []
    for d in decoded:
        results.append({"type": d.type, "data": d.data.decode("utf-8", "ignore")})
    return results

def _decode_with_cli(image_path):
    zbarimg = shutil.which("zbarimg")
    if not zbarimg:
        return []
    cmd = [zbarimg, "--raw", image_path]
    cp = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if cp.returncode not in (0, 4):  # 0=found, 4=no symbols found
        return []
    lines = [l for l in cp.stdout.splitlines() if l.strip()]
    results = []
    if lines:
        for l in lines:
            if ":" in l:
                t, data = l.split(":", 1)
                results.append({"type": t.strip(), "data": data.strip()})
            else:
                results.append({"type": "UNKNOWN", "data": l.strip()})
    return results

def decode_codes(image_path):
    img = Image.open(image_path)
    
    # Try with pyzbar first if available
    if PYZBAR_AVAILABLE and pyzbar_decode:
        try:
            decoded_objects = pyzbar_decode(img)
            if decoded_objects:
                results = []
                for obj in decoded_objects:
                    data = obj.data.decode('utf-8')
                    results.append({'data': data, 'type': obj.type})
                return results
        except Exception:
            pass

    # If pyzbar fails, try with OpenCV QR detector
    try:
        img_cv = cv2.imread(image_path)
        detector = cv2.QRCodeDetector()
        data, bbox, _ = detector.detectAndDecode(img_cv)

        if data:
            return [{'data': data, 'type': 'QRCODE'}]
    except:
        pass

    # Try with grayscale and enhanced contrast
    try:
        img_gray = img.convert('L')
        # Enhance contrast
        from PIL import ImageEnhance
        enhancer = ImageEnhance.Contrast(img_gray)
        img_enhanced = enhancer.enhance(2.0)

        decoded_objects = pyzbar_decode(img_enhanced)
        if decoded_objects:
            results = []
            for obj in decoded_objects:
                data = obj.data.decode('utf-8')
                results.append({'data': data, 'type': obj.type})
            return results
    except:
        pass

    raise ValueError('No QR code or barcode found in the image')
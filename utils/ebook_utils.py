
import os
import subprocess
import shutil

def has_calibre():
    """Check if Calibre's ebook-convert is installed"""
    return shutil.which('ebook-convert') is not None

def convert_ebook(in_path, out_path, out_format):
    """Convert ebooks using Calibre"""
    if not has_calibre():
        raise RuntimeError('Calibre ebook-convert not found. Install with: nix-env -iA nixpkgs.calibre')
    
    cmd = ['ebook-convert', in_path, out_path]
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        error_msg = result.stderr.strip() if result.stderr.strip() else "Unknown error"
        raise RuntimeError(f'ebook-convert failed: {error_msg}')
    
    if not os.path.exists(out_path):
        raise RuntimeError(f'Ebook conversion failed: Output file was not created')
    
    return out_path


import os
import subprocess
import shutil

def has_libreoffice():
    """Check if LibreOffice is available"""
    return shutil.which('soffice') is not None

def convert_presentation(in_path, out_path, out_format):
    """Convert presentations using LibreOffice Impress"""
    if not has_libreoffice():
        raise RuntimeError('LibreOffice not found. Install with: nix-env -iA nixpkgs.libreoffice')
    
    out_dir = os.path.dirname(out_path)
    
    # Map format extensions to LibreOffice format names
    format_map = {
        'pdf': 'pdf',
        'odp': 'odp',
        'ppt': 'ppt',
        'pptx': 'pptx',
        'key': 'key',
    }
    
    lo_format = format_map.get(out_format.lower(), out_format)
    
    cmd = ['soffice', '--headless', '--convert-to', lo_format, '--outdir', out_dir, in_path]
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f'Presentation conversion failed: {result.stderr}')
    
    return out_path

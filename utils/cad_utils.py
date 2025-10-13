
import os
import subprocess
import shutil

def has_libreoffice():
    """Check if LibreOffice is available"""
    return shutil.which('soffice') is not None

def convert_cad(in_path, out_path, out_format):
    """Convert CAD files using LibreOffice Draw"""
    if not has_libreoffice():
        raise RuntimeError('LibreOffice not found for CAD conversion')
    
    out_dir = os.path.dirname(out_path)
    cmd = ['soffice', '--headless', '--convert-to', out_format, '--outdir', out_dir, in_path]
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f'CAD conversion failed: {result.stderr}')
    
    return out_path

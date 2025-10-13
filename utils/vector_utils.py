
import os
import subprocess
import shutil

def has_inkscape():
    """Check if Inkscape is installed"""
    return shutil.which('inkscape') is not None

def has_imagemagick():
    """Check if ImageMagick is installed"""
    return shutil.which('convert') is not None

def convert_vector(in_path, out_path, out_format):
    """Convert vector graphics using Inkscape or ImageMagick"""
    
    # Try Inkscape first for SVG-related conversions
    if has_inkscape() and out_format.lower() in ['svg', 'pdf', 'eps', 'ps', 'png']:
        cmd = ['inkscape', in_path, '--export-filename=' + out_path]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode == 0 and os.path.exists(out_path):
            return out_path
    
    # Fallback to ImageMagick
    if has_imagemagick():
        cmd = ['convert', in_path, out_path]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            raise RuntimeError(f'Vector conversion failed: {result.stderr}')
        
        if not os.path.exists(out_path):
            raise RuntimeError('Vector conversion failed: Output file not created')
        
        return out_path
    
    raise RuntimeError('No vector conversion tools available. Install Inkscape or ImageMagick')

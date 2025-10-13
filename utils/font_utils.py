
import os
import subprocess
import shutil

def has_fontforge():
    """Check if FontForge is installed"""
    return shutil.which('fontforge') is not None

def convert_font(in_path, out_path, out_format):
    """Convert fonts using FontForge"""
    if not has_fontforge():
        raise RuntimeError('FontForge not found. Install with: nix-env -iA nixpkgs.fontforge')
    
    # FontForge script to convert
    script = f'''Open("{in_path}");
Generate("{out_path}");
'''
    
    script_path = in_path + '.ff_script'
    with open(script_path, 'w') as f:
        f.write(script)
    
    try:
        result = subprocess.run(['fontforge', '-script', script_path], capture_output=True, text=True)
        if result.returncode != 0:
            raise RuntimeError(f'Font conversion failed: {result.stderr}')
        
        if not os.path.exists(out_path):
            raise RuntimeError('Font conversion failed: Output file not created')
        
        return out_path
    finally:
        if os.path.exists(script_path):
            os.remove(script_path)

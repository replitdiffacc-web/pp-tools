
import os
import subprocess
import shutil

def has_libreoffice():
    """Check if LibreOffice is available"""
    return shutil.which('soffice') is not None

def convert_spreadsheet(in_path, out_path, out_format):
    """Convert spreadsheets using LibreOffice Calc"""
    if not has_libreoffice():
        raise RuntimeError('LibreOffice not found. Install with: nix-env -iA nixpkgs.libreoffice')
    
    out_dir = os.path.dirname(out_path)
    
    # Map format extensions
    format_map = {
        'pdf': 'pdf',
        'ods': 'ods',
        'xls': 'xls',
        'xlsx': 'xlsx',
        'csv': 'csv',
    }
    
    lo_format = format_map.get(out_format.lower(), out_format)
    
    cmd = ['soffice', '--headless', '--convert-to', lo_format, '--outdir', out_dir, in_path]
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f'Spreadsheet conversion failed: {result.stderr}')
    
    return out_path

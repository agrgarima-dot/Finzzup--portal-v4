"""
File Organizer Script
Organizes Desktop, Downloads, and OneDrive folders by file type.
Run with --dry-run first to preview changes before anything moves.

Usage:
    python organize_files.py --dry-run     # Preview only, nothing moves
    python organize_files.py               # Actually organize files
    python organize_files.py --undo        # Undo last run (uses log file)
"""

import os
import shutil
import json
import argparse
from pathlib import Path
from datetime import datetime

# ──────────────────────────────────────────────
# FILE TYPE CATEGORIES
# Add/remove extensions here to customize
# ──────────────────────────────────────────────
FILE_CATEGORIES = {
    "Images":      [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".svg", ".ico",
                    ".tiff", ".tif", ".webp", ".raw", ".heic", ".heif", ".cr2"],
    "Documents":   [".pdf", ".doc", ".docx", ".txt", ".xls", ".xlsx", ".ppt",
                    ".pptx", ".odt", ".ods", ".odp", ".rtf", ".md", ".pages",
                    ".numbers", ".key", ".epub"],
    "Spreadsheets":[".csv", ".tsv"],
    "Videos":      [".mp4", ".avi", ".mov", ".mkv", ".wmv", ".flv", ".webm",
                    ".m4v", ".3gp", ".mpeg", ".mpg"],
    "Audio":       [".mp3", ".wav", ".flac", ".aac", ".ogg", ".wma", ".m4a",
                    ".opus", ".aiff"],
    "Archives":    [".zip", ".rar", ".7z", ".tar", ".gz", ".bz2", ".xz", ".iso"],
    "Executables": [".exe", ".msi", ".dmg", ".pkg", ".deb", ".rpm", ".appx"],
    "Code":        [".py", ".js", ".ts", ".html", ".css", ".java", ".cpp", ".c",
                    ".h", ".json", ".xml", ".yaml", ".yml", ".sh", ".bat",
                    ".ps1", ".sql", ".php", ".rb", ".go", ".rs", ".swift"],
    "Shortcuts":   [".lnk", ".url", ".webloc"],
}

# Files/folders to never touch
SKIP_NAMES = {
    "desktop.ini", "thumbs.db", ".ds_store", "ntuser.dat",
    "organize_files.py", "organize_log.json",
}

LOG_FILE = Path.home() / "organize_log.json"


def get_folders():
    """Auto-detect Desktop, Downloads, and OneDrive paths."""
    home = Path.home()

    candidates = {
        "Desktop":   [home / "Desktop", home / "OneDrive" / "Desktop"],
        "Downloads": [home / "Downloads"],
        "OneDrive":  [home / "OneDrive", home / "OneDrive - Personal"],
    }

    # Also check for company-named OneDrive folders (e.g. "OneDrive - Acme Corp")
    for item in home.iterdir():
        if item.is_dir() and item.name.startswith("OneDrive - "):
            candidates["OneDrive"].append(item)

    found = {}
    for label, paths in candidates.items():
        for p in paths:
            if p.exists():
                found[label] = p
                break

    return found


def get_category(file_path: Path) -> str:
    ext = file_path.suffix.lower()
    for category, extensions in FILE_CATEGORIES.items():
        if ext in extensions:
            return category
    return "Others"


def safe_destination(dest_folder: Path, filename: str) -> Path:
    """If a file with the same name exists, append _1, _2, etc."""
    dest = dest_folder / filename
    if not dest.exists():
        return dest
    stem = Path(filename).stem
    suffix = Path(filename).suffix
    counter = 1
    while dest.exists():
        dest = dest_folder / f"{stem}_{counter}{suffix}"
        counter += 1
    return dest


def organize_folder(folder: Path, label: str, dry_run: bool, log: list):
    """Organize a single folder — only top-level files, not subfolders."""
    print(f"\n{'[DRY RUN] ' if dry_run else ''}Scanning: {folder}")
    print("-" * 60)

    moved = 0
    skipped = 0

    for item in sorted(folder.iterdir()):
        # Skip folders, hidden files, and system files
        if item.is_dir():
            continue
        if item.name.lower() in SKIP_NAMES:
            continue
        if item.name.startswith("."):
            continue

        category = get_category(item)
        dest_folder = folder / category
        dest_path = safe_destination(dest_folder, item.name)

        print(f"  {item.name}")
        print(f"    → {category}/{dest_path.name}")

        if not dry_run:
            dest_folder.mkdir(exist_ok=True)
            shutil.move(str(item), str(dest_path))
            log.append({
                "original": str(item),
                "moved_to": str(dest_path),
                "timestamp": datetime.now().isoformat(),
            })

        moved += 1

    if moved == 0:
        print("  Nothing to organize — already clean!")
    else:
        print(f"\n  {'Would move' if dry_run else 'Moved'}: {moved} file(s)")

    return moved


def undo_last_run():
    """Move all files back to their original locations using the log."""
    if not LOG_FILE.exists():
        print("No log file found. Nothing to undo.")
        return

    with open(LOG_FILE) as f:
        log = json.load(f)

    if not log:
        print("Log is empty. Nothing to undo.")
        return

    print(f"Undoing {len(log)} file move(s)...\n")
    errors = 0
    for entry in reversed(log):
        src = Path(entry["moved_to"])
        dest = Path(entry["original"])
        if src.exists():
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.move(str(src), str(dest))
            print(f"  Restored: {dest.name}")
        else:
            print(f"  MISSING (skipped): {src}")
            errors += 1

    LOG_FILE.unlink()
    print(f"\nUndo complete. {len(log) - errors} restored, {errors} skipped.")


def main():
    parser = argparse.ArgumentParser(description="Organize Desktop, Downloads & OneDrive")
    parser.add_argument("--dry-run", action="store_true",
                        help="Preview what will happen without moving anything")
    parser.add_argument("--undo", action="store_true",
                        help="Undo the last run using the saved log")
    parser.add_argument("--folder", type=str,
                        help="Organize a specific folder path instead")
    args = parser.parse_args()

    if args.undo:
        undo_last_run()
        return

    print("=" * 60)
    print("  FILE ORGANIZER")
    if args.dry_run:
        print("  MODE: DRY RUN — nothing will be moved")
    else:
        print("  MODE: LIVE — files will be moved!")
    print("=" * 60)

    log = []

    if args.folder:
        target = Path(args.folder)
        if not target.exists():
            print(f"Error: folder not found: {target}")
            return
        organize_folder(target, target.name, args.dry_run, log)
    else:
        folders = get_folders()

        if not folders:
            print("Could not find Desktop, Downloads or OneDrive folders.")
            print("Use: python organize_files.py --folder \"C:\\path\\to\\folder\"")
            return

        print("\nFolders found:")
        for label, path in folders.items():
            print(f"  {label}: {path}")

        total = 0
        for label, path in folders.items():
            total += organize_folder(path, label, args.dry_run, log)

        print("\n" + "=" * 60)
        print(f"  Total files {'that would be moved' if args.dry_run else 'moved'}: {total}")

    if not args.dry_run and log:
        with open(LOG_FILE, "w") as f:
            json.dump(log, f, indent=2)
        print(f"\n  Log saved to: {LOG_FILE}")
        print("  To undo: python organize_files.py --undo")

    if args.dry_run:
        print("\n  Run without --dry-run to actually move files.")
    print("=" * 60)


if __name__ == "__main__":
    main()

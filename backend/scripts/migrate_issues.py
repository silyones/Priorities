#!/usr/bin/env python3
"""One-time migration: seed Firestore `issues` from existing submissions.

Usage (from repo root):
  python backend/scripts/migrate_issues.py

Skips if the `issues` collection already contains documents unless --force is passed.
"""

from __future__ import annotations

import argparse
import logging
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from dotenv import load_dotenv

load_dotenv(BACKEND_DIR / ".env")

from firestore_service import count_issues, migrate_create_issue
from issue_service import migration_groups_from_submissions
from ts_bridge import warm_bridge

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("migrate_issues")


def main() -> int:
    parser = argparse.ArgumentParser(description="Seed persisted issues from submissions")
    parser.add_argument(
        "--force",
        action="store_true",
        help="Run even if issues collection is non-empty (may create duplicates)",
    )
    args = parser.parse_args()

    warm_bridge()

    existing = count_issues()
    if existing > 0 and not args.force:
        logger.error(
            "issues collection already has %d document(s). "
            "Pass --force to run anyway (not recommended).",
            existing,
        )
        return 1

    groups = migration_groups_from_submissions()
    if not groups:
        logger.info("No submissions to migrate.")
        return 0

    created = 0
    for group in groups:
        issue_id = migrate_create_issue(group)
        created += 1
        logger.info(
            "created issue %s (%d submissions, %d subscribers)",
            issue_id,
            len(group.get("submissionIds") or []),
            len(set(group.get("phoneNumbers") or [])),
        )

    logger.info("Migration complete — %d issue(s) created.", created)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

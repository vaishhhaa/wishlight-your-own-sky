import os
import sqlite3
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "wishes.db")


def get_connection():
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def init_db():
    with get_connection() as db:
        db.execute(
            """
            CREATE TABLE IF NOT EXISTS wishes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT NOT NULL DEFAULT '',
                category TEXT NOT NULL DEFAULT 'Other',
                status TEXT NOT NULL DEFAULT 'Dreaming',
                target_date TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        count = db.execute("SELECT COUNT(*) FROM wishes").fetchone()[0]
        if count == 0:
            now = datetime.now().isoformat(timespec="seconds")
            samples = [
                ("Get my dream job", "A role where I can learn, grow and enjoy what I do.", "Career"),
                ("Travel to Japan", "Cherry blossoms, quiet temples and night trains.", "Travel"),
                ("Learn to play guitar", "Play one song for the people I love.", "Personal"),
                ("Build a portfolio project", "Something I'm proud to show.", "Education"),
                ("Run a 10K", "Slow, steady and finished.", "Health"),
                ("Read 20 books", "One quiet page at a time.", "Personal"),
                ("Buy a little home", "A small place that feels like mine.", "Finance"),
            ]
            db.executemany(
                """
                INSERT INTO wishes
                (title, description, category, status, target_date, created_at, updated_at)
                VALUES (?, ?, ?, 'Dreaming', NULL, ?, ?)
                """,
                [(t, d, c, now, now) for t, d, c in samples],
            )


def _dict(row):
    return dict(row) if row else None


def get_all_wishes():
    with get_connection() as db:
        rows = db.execute("SELECT * FROM wishes ORDER BY id DESC").fetchall()
    return [_dict(row) for row in rows]


def create_wish(title, description, category, target_date=None):
    now = datetime.now().isoformat(timespec="seconds")
    with get_connection() as db:
        cursor = db.execute(
            """
            INSERT INTO wishes
            (title, description, category, status, target_date, created_at, updated_at)
            VALUES (?, ?, ?, 'Dreaming', ?, ?, ?)
            """,
            (title, description, category, target_date, now, now),
        )
        row = db.execute("SELECT * FROM wishes WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return _dict(row)


def update_wish(wish_id, updates):
    if not updates:
        with get_connection() as db:
            return _dict(db.execute("SELECT * FROM wishes WHERE id = ?", (wish_id,)).fetchone())

    columns = []
    values = []
    for key, value in updates.items():
        if key in {"title", "description", "category", "status", "target_date"}:
            columns.append(f"{key} = ?")
            values.append(str(value).strip() if value is not None else None)

    if not columns:
        return None

    columns.append("updated_at = ?")
    values.append(datetime.now().isoformat(timespec="seconds"))
    values.append(wish_id)

    with get_connection() as db:
        cursor = db.execute(
            f"UPDATE wishes SET {', '.join(columns)} WHERE id = ?",
            values,
        )
        if cursor.rowcount == 0:
            return None
        row = db.execute("SELECT * FROM wishes WHERE id = ?", (wish_id,)).fetchone()
    return _dict(row)


def delete_wish(wish_id):
    with get_connection() as db:
        cursor = db.execute("DELETE FROM wishes WHERE id = ?", (wish_id,))
    return cursor.rowcount > 0

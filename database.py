import sqlite3
from pathlib import Path


DATABASE = Path(__file__).resolve().parent / "giftwise.db"


def get_connection():

    connection = sqlite3.connect(DATABASE)

    connection.row_factory = sqlite3.Row

    connection.execute("PRAGMA foreign_keys = ON")

    return connection


def initialize_database():

    connection = get_connection()

    cursor = connection.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS shopping_plans (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            total_budget REAL NOT NULL,

            number_of_gifts INTEGER NOT NULL,

            deadline TEXT NOT NULL,

            created_at TEXT DEFAULT CURRENT_TIMESTAMP

        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS gift_allocations (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            plan_id INTEGER NOT NULL,

            gift_number INTEGER NOT NULL,

            gift_name TEXT NOT NULL,

            allocated_budget REAL NOT NULL,

            spent_amount REAL DEFAULT 0,

            status TEXT DEFAULT 'Planned',

            FOREIGN KEY (plan_id)
            REFERENCES shopping_plans(id)
            ON DELETE CASCADE,

            UNIQUE(plan_id, gift_number)

        )
    """)

    connection.commit()

    connection.close()
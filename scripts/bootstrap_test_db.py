import os
import sys
from urllib.parse import urlparse, unquote

import psycopg2


def _parse_database_url(database_url: str) -> dict:
    parsed = urlparse(database_url)
    return {
        "dbname": unquote(parsed.path.lstrip("/")),
        "user": unquote(parsed.username or ""),
        "password": unquote(parsed.password or ""),
        "host": parsed.hostname or "",
        "port": int(parsed.port or 5432),
        "sslmode": "require",
    }


def _connect(params: dict):
    return psycopg2.connect(
        dbname=params["dbname"],
        user=params["user"],
        password=params["password"],
        host=params["host"],
        port=params["port"],
        sslmode=params.get("sslmode", "require"),
    )


def _run_sql_file(conn, sql_path: str):
    with open(sql_path, "r", encoding="utf-8") as handle:
        sql = handle.read()
    with conn.cursor() as cursor:
        cursor.execute(sql)
    conn.commit()


def main():
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("DATABASE_URL is required.")
        return 2

    drop_first = "--drop" in sys.argv
    test_db_name = os.getenv("TEST_DB_NAME", "test_postgres")
    schema_path = os.getenv(
        "TEST_SCHEMA_PATH",
        os.path.join(os.path.dirname(__file__), "test_core_schema.sql"),
    )

    params = _parse_database_url(database_url)
    admin_db = os.getenv("TEST_DB_ADMIN_NAME", "postgres")
    params_admin = dict(params)
    params_admin["dbname"] = admin_db

    try:
        admin_conn = _connect(params_admin)
        admin_conn.autocommit = True
    except Exception as exc:
        print(f"Failed to connect to admin db '{admin_db}': {exc}")
        return 2

    try:
        with admin_conn.cursor() as cursor:
            if drop_first:
                cursor.execute(f"DROP DATABASE IF EXISTS {test_db_name};")
            cursor.execute(f"CREATE DATABASE {test_db_name};")
    except Exception as exc:
        if "already exists" not in str(exc).lower():
            print(f"Failed to create test db: {exc}")
            return 2
    finally:
        admin_conn.close()

    params_test = dict(params)
    params_test["dbname"] = test_db_name

    try:
        test_conn = _connect(params_test)
    except Exception as exc:
        print(f"Failed to connect to test db '{test_db_name}': {exc}")
        return 2

    try:
        _run_sql_file(test_conn, schema_path)
    except Exception as exc:
        print(f"Failed to bootstrap schema: {exc}")
        return 2
    finally:
        test_conn.close()

    print(f"Bootstrapped schema in {test_db_name} using {schema_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

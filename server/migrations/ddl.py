"""Idempotent DDL helpers for Alembic migrations."""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


def _inspector():
    return inspect(op.get_bind())


def table_exists(table_name: str) -> bool:
    return table_name in _inspector().get_table_names()


def column_exists(table_name: str, column_name: str) -> bool:
    if not table_exists(table_name):
        return False
    return column_name in {c["name"] for c in _inspector().get_columns(table_name)}


def rename_column(table_name: str, old_name: str, new_name: str, **kwargs) -> None:
    if column_exists(table_name, old_name) and not column_exists(table_name, new_name):
        op.alter_column(table_name, old_name, new_column_name=new_name, **kwargs)


def drop_column(table_name: str, column_name: str) -> None:
    if column_exists(table_name, column_name):
        op.drop_column(table_name, column_name)


def add_column(table_name: str, column: sa.Column) -> None:
    if not column_exists(table_name, column.name):
        op.add_column(table_name, column)


def rename_table(old_name: str, new_name: str) -> None:
    if table_exists(old_name) and not table_exists(new_name):
        op.rename_table(old_name, new_name)


def constraint_exists(table_name: str, constraint_name: str) -> bool:
    if not table_exists(table_name):
        return False
    insp = _inspector()
    for fk in insp.get_foreign_keys(table_name):
        if fk.get("name") == constraint_name:
            return True
    for uq in insp.get_unique_constraints(table_name):
        if uq.get("name") == constraint_name:
            return True
    for ck in insp.get_check_constraints(table_name):
        if ck.get("name") == constraint_name:
            return True
    return False


def create_foreign_key(
    name: str,
    source_table: str,
    referent_table: str,
    local_cols: list[str],
    remote_cols: list[str],
    **kwargs,
) -> None:
    if not constraint_exists(source_table, name):
        op.create_foreign_key(name, source_table, referent_table, local_cols, remote_cols, **kwargs)


def create_unique_constraint(name: str, table_name: str, columns: list[str]) -> None:
    if not constraint_exists(table_name, name):
        op.create_unique_constraint(name, table_name, columns)


def drop_index_if_exists(index_name: str, table_name: str) -> None:
    if not table_exists(table_name):
        return
    insp = _inspector()
    if index_name in {idx["name"] for idx in insp.get_indexes(table_name)}:
        op.drop_index(index_name, table_name=table_name)

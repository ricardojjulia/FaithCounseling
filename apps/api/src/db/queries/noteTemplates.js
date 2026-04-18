/**
 * Query helpers for the system-level clinical note template library.
 *
 * These templates are system-wide (no tenant scoping) and are read-only
 * via the API. They are seeded in migrate.js.
 */

import pool from '../pool.js';

function rowToTemplate(row) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    category: row.category,
    structure: row.structure_json
      ? typeof row.structure_json === 'string'
        ? JSON.parse(row.structure_json)
        : row.structure_json
      : [],
    isDefault: Boolean(row.is_default),
    createdAt: row.created_at,
  };
}

/**
 * Return all system clinical note templates ordered by category then name.
 * @returns {Promise<Array>}
 */
export async function listNoteTemplates() {
  const [rows] = await pool.query(
    `SELECT id, name, slug, category, structure_json, is_default, created_at
       FROM clinical_note_templates
      ORDER BY FIELD(category, 'standard', 'faith_integrated', 'specialty', 'crisis'), name ASC`,
  );
  return rows.map(rowToTemplate);
}

/**
 * Return a single clinical note template by id or slug.
 * @param {string} idOrSlug
 * @returns {Promise<object|null>}
 */
export async function getNoteTemplate(idOrSlug) {
  const [rows] = await pool.query(
    `SELECT id, name, slug, category, structure_json, is_default, created_at
       FROM clinical_note_templates
      WHERE id = ? OR slug = ?
      LIMIT 1`,
    [idOrSlug, idOrSlug],
  );
  return rows.length ? rowToTemplate(rows[0]) : null;
}

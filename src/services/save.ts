/**
 * SaveService — localStorage-based character save management.
 * Provides CRUD operations, JSON import/export, format validation, and UID privacy.
 */

import { v4 as uuidv4 } from 'uuid';
import type { CharacterSave, ExportData } from '../types';
import { loadAllCharacters } from '../data/characters';

/** localStorage key prefix for character saves. */
const SAVE_KEY_PREFIX = 'gao_save_';

/** Current app version for export/import compatibility. */
const APP_VERSION = '3.0.0';

/** App identifier for export files. */
const APP_IDENTIFIER = 'genshin-artifact-optimizer-v2';

/** Import result returned from importFromJSON(). */
export interface ImportResult {
  /** Whether the import was successful. */
  success: boolean;
  /** Number of saves successfully imported. */
  imported: number;
  /** Number of saves skipped (e.g. duplicate or invalid). */
  skipped: number;
  /** Error messages for failed imports. */
  errors: string[];
}

/** Validation result returned from validateImport(). */
export interface ValidationResult {
  /** Whether the data is valid. */
  valid: boolean;
  /** Validation error messages. */
  errors: string[];
}

/**
 * SaveService — static class for managing character saves in localStorage.
 */
export class SaveService {
  /**
   * List all character saves from localStorage.
   * Scans all keys matching the SAVE_KEY_PREFIX and deserializes them.
   */
  static listSaves(): CharacterSave[] {
    const saves: CharacterSave[] = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(SAVE_KEY_PREFIX)) {
          try {
            const raw = localStorage.getItem(key);
            if (raw) {
              const save: CharacterSave = JSON.parse(raw);
              saves.push(save);
            }
          } catch {
            // Skip corrupted entries
          }
        }
      }
    } catch {
      // localStorage unavailable
    }
    // Sort by updatedAt descending (most recent first)
    return saves.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  /**
   * Get a single character save by ID.
   * @param saveId - The save's unique ID
   * @returns The CharacterSave or null if not found
   */
  static getSave(saveId: string): CharacterSave | null {
    try {
      const raw = localStorage.getItem(`${SAVE_KEY_PREFIX}${saveId}`);
      if (!raw) return null;
      return JSON.parse(raw) as CharacterSave;
    } catch {
      return null;
    }
  }

  /**
   * Save (create or update) a character save to localStorage.
   * Updates the `updatedAt` timestamp automatically.
   * @param data - The complete CharacterSave object
   */
  static saveCharacter(data: CharacterSave): void {
    try {
      const updated: CharacterSave = {
        ...data,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(
        `${SAVE_KEY_PREFIX}${updated.saveId}`,
        JSON.stringify(updated),
      );
    } catch {
      // localStorage may be full; silently ignore
    }
  }

  /**
   * Delete a character save from localStorage.
   * @param saveId - The save's unique ID
   */
  static deleteSave(saveId: string): void {
    try {
      localStorage.removeItem(`${SAVE_KEY_PREFIX}${saveId}`);
    } catch {
      // Silently ignore
    }
  }

  /**
   * Create a new CharacterSave with a generated UUID.
   * @param partial - Partial save data (characterId, characterLevel, etc.)
   * @returns A new CharacterSave with generated saveId and timestamps
   */
  static createSave(partial: Omit<CharacterSave, 'saveId' | 'createdAt' | 'updatedAt'>): CharacterSave {
    const now = new Date().toISOString();
    return {
      ...partial,
      saveId: uuidv4(),
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Export character saves to a JSON string.
   * @param saves - Array of CharacterSave to export
   * @param includeUid - Whether to include UID in the exported data (default: false for privacy)
   * @returns JSON string of ExportData
   */
  static exportToJSON(saves: CharacterSave[], includeUid: boolean = false): string {
    const exportData: ExportData = {
      version: APP_VERSION,
      exportedAt: new Date().toISOString(),
      app: APP_IDENTIFIER,
      saves: includeUid
        ? saves
        : saves.map((save) => {
            const { uid: _uid, ...rest } = save;
            return rest as CharacterSave;
          }),
    };
    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import character saves from a JSON string.
   * Validates the data first, then saves each valid entry.
   * @param jsonStr - JSON string to import
   * @returns ImportResult with success count and any errors
   */
  static importFromJSON(jsonStr: string): ImportResult {
    const result: ImportResult = {
      success: false,
      imported: 0,
      skipped: 0,
      errors: [],
    };

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      result.errors.push('JSON 格式无效，无法解析');
      return result;
    }

    // Validate structure
    const validation = SaveService.validateImport(parsed);
    if (!validation.valid) {
      result.errors.push(...validation.errors);
      return result;
    }

    const data = parsed as ExportData;
    const existingSaves = SaveService.listSaves();
    const existingIds = new Set(existingSaves.map((s) => s.saveId));

    for (const save of data.saves) {
      // Skip duplicates by saveId
      if (existingIds.has(save.saveId)) {
        result.skipped++;
        continue;
      }

      // Assign a new UUID if saveId is missing or duplicate
      if (!save.saveId) {
        save.saveId = uuidv4();
      }

      // Ensure timestamps exist
      if (!save.createdAt) {
        save.createdAt = new Date().toISOString();
      }
      if (!save.updatedAt) {
        save.updatedAt = new Date().toISOString();
      }

      try {
        SaveService.saveCharacter(save);
        result.imported++;
      } catch {
        result.errors.push(`保存角色 "${save.name || save.characterId}" 失败`);
        result.skipped++;
      }
    }

    result.success = result.imported > 0 || data.saves.length === 0;
    return result;
  }

  /**
   * Validate imported data structure.
   * Checks: version field exists and major version is compatible,
   * saves is a non-empty array, each save has required fields.
   * @param data - Parsed JSON data to validate
   * @returns ValidationResult with validity and error messages
   */
  static validateImport(data: unknown): ValidationResult {
    const errors: string[] = [];

    if (!data || typeof data !== 'object') {
      errors.push('数据格式无效');
      return { valid: false, errors };
    }

    const obj = data as Record<string, unknown>;

    // Check version field
    if (!obj.version || typeof obj.version !== 'string') {
      errors.push('缺少 version 字段');
    } else {
      // Check major version compatibility
      const importMajor = parseInt(obj.version.split('.')[0], 10);
      const currentMajor = parseInt(APP_VERSION.split('.')[0], 10);
      if (isNaN(importMajor) || importMajor > currentMajor) {
        errors.push(`版本不兼容：导入文件版本 ${obj.version}，当前支持版本 ≤ ${APP_VERSION}`);
      }
    }

    // Check app field
    if (!obj.app || typeof obj.app !== 'string') {
      errors.push('缺少 app 字段');
    }

    // Check saves array
    if (!Array.isArray(obj.saves)) {
      errors.push('saves 字段不是数组');
      return { valid: errors.length === 0, errors };
    }

    if (obj.saves.length === 0) {
      errors.push('saves 数组为空');
      return { valid: false, errors };
    }

    // Validate each save entry
    const knownCharacterIds = new Set(loadAllCharacters().keys());

    for (let i = 0; i < obj.saves.length; i++) {
      const save = obj.saves[i];
      if (!save || typeof save !== 'object') {
        errors.push(`存档 #${i + 1}: 格式无效`);
        continue;
      }

      const s = save as Record<string, unknown>;

      if (!s.characterId || typeof s.characterId !== 'string') {
        errors.push(`存档 #${i + 1}: 缺少 characterId`);
      } else if (!knownCharacterIds.has(s.characterId)) {
        errors.push(`存档 #${i + 1}: 未知角色 "${s.characterId}"`);
      }

      if (typeof s.characterLevel !== 'number') {
        errors.push(`存档 #${i + 1}: 缺少 characterLevel`);
      }

      if (!Array.isArray(s.artifacts)) {
        errors.push(`存档 #${i + 1}: 缺少 artifacts`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Rename a save (updates the name field).
   * @param saveId - The save's unique ID
   * @param newName - New display name
   */
  static renameSave(saveId: string, newName: string): void {
    const save = SaveService.getSave(saveId);
    if (save) {
      save.name = newName;
      SaveService.saveCharacter(save);
    }
  }
}

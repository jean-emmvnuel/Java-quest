// Erreurs pédagogiques : chaque erreur porte une ligne, un message clair en français
// et, si possible, un indice pour aider l'apprenant à corriger.

export class JavaError extends Error {
  /**
   * @param {'compile'|'runtime'} kind
   * @param {string} message
   * @param {number|null} line
   * @param {string} [hint]
   */
  constructor(kind, message, line, hint) {
    super(message);
    this.kind = kind;
    this.line = line ?? null;
    this.hint = hint || null;
  }
}

export const compileError = (message, line, hint) => new JavaError('compile', message, line, hint);
export const runtimeError = (message, line, hint) => new JavaError('runtime', message, line, hint);

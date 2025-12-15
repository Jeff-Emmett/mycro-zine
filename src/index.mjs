/**
 * MycroZine - 8-page mini-zine generator utilities
 *
 * A toolkit for creating print-ready mycro-zines (8-page mini folded zines).
 *
 * @module mycro-zine
 */

export { createPrintLayout } from './layout.mjs';
export {
  STYLES,
  TONES,
  PAGE_TEMPLATES,
  ZINE_STRUCTURES,
  getContentOutlinePrompt,
  getImagePrompt,
  getIdeationPrompt
} from './prompts.mjs';

/**
 * Zine configuration defaults
 */
export const DEFAULTS = {
  style: 'punk-zine',
  tone: 'rebellious',
  paperFormat: 'letter', // US Letter 8.5" x 11"
  dpi: 300,
  pageCount: 8
};

/**
 * Page dimensions in pixels at 300 DPI
 */
export const DIMENSIONS = {
  letter: {
    width: 2550,  // 8.5" x 300
    height: 3300, // 11" x 300
    panelWidth: 1275,  // width / 2 cols
    panelHeight: 825,  // height / 4 rows
    panelCols: 2,
    panelRows: 4
  },
  a4: {
    width: 2480,  // 210mm at 300 DPI
    height: 3508, // 297mm at 300 DPI
    panelWidth: 1240,
    panelHeight: 877,
    panelCols: 2,
    panelRows: 4
  }
};

/**
 * Validate a zine configuration
 *
 * @param {Object} config - Zine configuration to validate
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateConfig(config) {
  const errors = [];

  if (!config.topic || typeof config.topic !== 'string') {
    errors.push('Topic is required and must be a string');
  }

  if (config.style && !['punk-zine', 'minimal', 'collage', 'retro', 'academic'].includes(config.style)) {
    errors.push(`Invalid style: ${config.style}`);
  }

  if (config.tone && !['rebellious', 'playful', 'informative', 'poetic'].includes(config.tone)) {
    errors.push(`Invalid tone: ${config.tone}`);
  }

  if (config.paperFormat && !['letter', 'a4'].includes(config.paperFormat)) {
    errors.push(`Invalid paper format: ${config.paperFormat}`);
  }

  if (config.pages && (!Array.isArray(config.pages) || config.pages.length !== 8)) {
    errors.push('Pages must be an array of exactly 8 items');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Create a new zine configuration
 *
 * @param {Object} options
 * @param {string} options.topic - Main topic/theme
 * @param {string} [options.title] - Zine title (generated from topic if not provided)
 * @param {string} [options.style='punk-zine'] - Visual style
 * @param {string} [options.tone='rebellious'] - Content tone
 * @param {string} [options.paperFormat='letter'] - Paper format
 * @param {string[]} [options.sourceUrls] - Reference URLs
 * @returns {Object} Zine configuration object
 */
export function createZineConfig(options) {
  const {
    topic,
    title = topic.toUpperCase(),
    style = DEFAULTS.style,
    tone = DEFAULTS.tone,
    paperFormat = DEFAULTS.paperFormat,
    sourceUrls = []
  } = options;

  const config = {
    id: `zine_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    topic,
    title,
    style,
    tone,
    paperFormat,
    sourceUrls,
    createdAt: Date.now(),
    pages: [],
    outline: null,
    status: 'draft'
  };

  const validation = validateConfig(config);
  if (!validation.valid) {
    throw new Error(`Invalid config: ${validation.errors.join(', ')}`);
  }

  return config;
}

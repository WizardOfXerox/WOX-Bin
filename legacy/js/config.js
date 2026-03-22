/**
 * WOX-Bin UI config — single source of truth for dropdowns and options.
 * Used by 00-build-ui.js to build a data-driven app shell.
 */
(function (global) {
  'use strict';

  var LANGUAGES = [
    { value: 'none', label: 'Plain text' },
    { value: 'auto', label: 'Auto-detect' },
    { value: 'markup', label: 'HTML' },
    { value: 'css', label: 'CSS' },
    { value: 'javascript', label: 'JavaScript' },
    { value: 'typescript', label: 'TypeScript' },
    { value: 'json', label: 'JSON' },
    { value: 'python', label: 'Python' },
    { value: 'bash', label: 'Bash' },
    { value: 'sql', label: 'SQL' },
    { value: 'xml', label: 'XML' },
    { value: 'cpp', label: 'C++' },
    { value: 'csharp', label: 'C#' },
    { value: 'java', label: 'Java' },
    { value: 'php', label: 'PHP' },
    { value: 'powershell', label: 'PowerShell' },
    { value: 'yaml', label: 'YAML' },
    { value: 'markdown', label: 'Markdown' },
    { value: 'go', label: 'Go' },
    { value: 'rust', label: 'Rust' },
    { value: 'ruby', label: 'Ruby' },
    { value: 'swift', label: 'Swift' },
    { value: 'kotlin', label: 'Kotlin' }
  ];

  var CATEGORIES = [
    { value: '', label: 'None' },
    { value: 'Cryptocurrency', label: 'Cryptocurrency' },
    { value: 'Cybersecurity', label: 'Cybersecurity' },
    { value: 'Fixit', label: 'Fixit' },
    { value: 'Food', label: 'Food' },
    { value: 'Gaming', label: 'Gaming' },
    { value: 'Haiku', label: 'Haiku' },
    { value: 'Help', label: 'Help' },
    { value: 'History', label: 'History' },
    { value: 'Housing', label: 'Housing' },
    { value: 'Jokes', label: 'Jokes' },
    { value: 'Legal', label: 'Legal' },
    { value: 'Money', label: 'Money' },
    { value: 'Movies', label: 'Movies' },
    { value: 'Music', label: 'Music' },
    { value: 'Pets', label: 'Pets' },
    { value: 'Photo', label: 'Photo' },
    { value: 'Science', label: 'Science' },
    { value: 'Software', label: 'Software' },
    { value: 'Source Code', label: 'Source Code' },
    { value: 'Spirit', label: 'Spirit' },
    { value: 'Sports', label: 'Sports' },
    { value: 'Travel', label: 'Travel' },
    { value: 'TV', label: 'TV' },
    { value: 'Writing', label: 'Writing' }
  ];

  var EXPIRATION = [
    { value: 'N', label: 'Never' },
    { value: 'B', label: 'Burn after read' },
    { value: '10M', label: '10 Minutes' },
    { value: '1H', label: '1 Hour' },
    { value: '1D', label: '1 Day' },
    { value: '1W', label: '1 Week' },
    { value: '2W', label: '2 Weeks' },
    { value: '1M', label: '1 Month' },
    { value: '6M', label: '6 Months' },
    { value: '1Y', label: '1 Year' }
  ];

  var EXPOSURE = [
    { value: '0', label: 'Public' },
    { value: '1', label: 'Unlisted' },
    { value: '2', label: 'Private (not in public list; anyone with link can view)' }
  ];

  var BURN_VIEWS = [
    { value: '0', label: 'Never' },
    { value: '1', label: '1 view' },
    { value: '3', label: '3 views' },
    { value: '5', label: '5 views' },
    { value: '10', label: '10 views' }
  ];

  var THEMES = [
    { value: 'dark', label: 'Dark' },
    { value: 'light', label: 'Light' },
    { value: 'system', label: 'System' },
    { value: 'highcontrast', label: 'High contrast' }
  ];

  var FONTS = [
    { value: 'system', label: 'System', selected: true },
    { value: 'cascadia', label: 'Cascadia Code' },
    { value: 'fira', label: 'Fira Code' },
    { value: 'jetbrains', label: 'JetBrains Mono' },
    { value: 'source', label: 'Source Code Pro' },
    { value: 'consolas', label: 'Consolas' },
    { value: 'mono', label: 'Monospace' }
  ];

  var FONT_SIZES = [
    { value: '12', label: '12' },
    { value: '14', label: '14', selected: true },
    { value: '16', label: '16' },
    { value: '18', label: '18' }
  ];

  var SORT_OPTIONS = [
    { value: 'newest', label: 'Newest first' },
    { value: 'oldest', label: 'Oldest first' },
    { value: 'title', label: 'Title A–Z' },
    { value: 'views', label: 'Most views' },
    { value: 'trending', label: 'Trending' }
  ];

  var SYNTAX_THEMES = [
    { value: 'tomorrow', label: 'Tomorrow' },
    { value: 'prism', label: 'Prism' },
    { value: 'coy', label: 'Coy' },
    { value: 'dark', label: 'Dark' }
  ];

  var DOWNLOAD_FORMATS = [
    { value: 'txt', label: '.txt' },
    { value: 'md', label: '.md' },
    { value: 'html', label: '.html' }
  ];

  var CODE_IMAGE_BG = [
    { value: 'dark', label: 'Dark (#1e1e1e)' },
    { value: 'darker', label: 'Darker (#0d1117)' },
    { value: 'light', label: 'Light (#f6f8fa)' },
    { value: 'current', label: 'Current theme' }
  ];

  var CODE_IMAGE_PADDING = [
    { value: 'small', label: 'Small' },
    { value: 'medium', label: 'Medium', selected: true },
    { value: 'large', label: 'Large' }
  ];

  var CODE_IMAGE_FONT_SIZE = [
    { value: '12', label: '12px' },
    { value: '14', label: '14px', selected: true },
    { value: '16', label: '16px' },
    { value: '18', label: '18px' }
  ];

  var CODE_IMAGE_RADIUS = [
    { value: '0', label: 'None' },
    { value: '6', label: 'Small' },
    { value: '10', label: 'Medium', selected: true },
    { value: '16', label: 'Large' }
  ];

  var CODE_IMAGE_SHADOW = [
    { value: 'none', label: 'None' },
    { value: 'sm', label: 'Subtle' },
    { value: 'md', label: 'Medium', selected: true },
    { value: 'lg', label: 'Large' }
  ];

  function optionHtml(arr) {
    return arr.map(function (o) {
      var sel = o.selected ? ' selected' : '';
      return '<option value="' + o.value + '"' + sel + '>' + o.label + '</option>';
    }).join('');
  }

  global.WOXBIN_CONFIG = {
    LANGUAGES: LANGUAGES,
    CATEGORIES: CATEGORIES,
    EXPIRATION: EXPIRATION,
    EXPOSURE: EXPOSURE,
    BURN_VIEWS: BURN_VIEWS,
    THEMES: THEMES,
    FONTS: FONTS,
    FONT_SIZES: FONT_SIZES,
    SORT_OPTIONS: SORT_OPTIONS,
    SYNTAX_THEMES: SYNTAX_THEMES,
    DOWNLOAD_FORMATS: DOWNLOAD_FORMATS,
    CODE_IMAGE_BG: CODE_IMAGE_BG,
    CODE_IMAGE_PADDING: CODE_IMAGE_PADDING,
    CODE_IMAGE_FONT_SIZE: CODE_IMAGE_FONT_SIZE,
    CODE_IMAGE_RADIUS: CODE_IMAGE_RADIUS,
    CODE_IMAGE_SHADOW: CODE_IMAGE_SHADOW,
    optionHtml: optionHtml
  };
})(typeof window !== 'undefined' ? window : this);

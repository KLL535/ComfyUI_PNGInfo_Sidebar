export default class BaseFormat {

    constructor(raw = "", options = {}) {
        this.raw = raw;
        this.options = { ...options };
        this._output = {};
    }

    // logging
    log(...args) {
        if (this.options.isDebugMode) {
            console.log(...args);
        }
    }

    get output() {
        return this._output;
    }

    escapeHTML(text) {
        return text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    cleanEdges(str) {
        return str.replace(/^[,\s\n\r]+|[,\s\n\r]+$/g, '');
    }

    isNumber(value) {
      if (typeof value === 'number') {
        return Number.isFinite(value);
      }
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed === '') return false;

        const numberRegex = /^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/;
        return numberRegex.test(trimmed) && Number.isFinite(Number(trimmed));
      }
      return false;
    }

}

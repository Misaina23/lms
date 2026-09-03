// Keep the browser-only DOM fallback out of Hermes native bundles.
if (typeof document !== 'undefined' && typeof globalThis.DOMException === 'undefined') {
  globalThis.DOMException = class DOMExceptionPolyfill extends Error {
    name: string;
    code: number;
    static USELESS: number = 0;
    static INDEX_SIZE_ERR: number = 1;
    static DOMSTRING_SIZE_ERR: number = 2;
    static HIERARCHY_REQUEST_ERR: number = 3;
    static WRONG_DOCUMENT_ERR: number = 4;
    static INVALID_CHARACTER_ERR: number = 5;
    static NO_DATA_ALLOWED_ERR: number = 6;
    static NO_MODIFICATION_ALLOWED_ERR: number = 7;
    static NOT_FOUND_ERR: number = 8;
    static NOT_SUPPORTED_ERR: number = 9;
    static INUSE_ATTRIBUTE_ERR: number = 10;
    static INVALID_STATE_ERR: number = 11;
    static SYNTAX_ERR: number = 12;
    static INVALID_MODIFICATION_ERR: number = 13;
    static NAMESPACE_ERR: number = 14;
    static INVALID_ACCESS_ERR: number = 15;
    static VALIDATION_ERR: number = 16;
    static TYPE_MISMATCH_ERR: number = 17;
    static SECURITY_ERR: number = 18;
    static NETWORK_ERR: number = 19;
    static ABORT_ERR: number = 20;
    static TIMEOUT_ERR: number = 23;
    static INVALID_NODE_TYPE_ERR: number = 24;
    static DATA_CLONE_ERR: number = 25;

    constructor(message?: string | null, name?: string) {
      super(message ?? '');
      this.name = name ?? 'Error';
      this.code = 0;
      if (Error.captureStackTrace) {
        Error.captureStackTrace(this, DOMExceptionPolyfill);
      }
    }
  } as any;
}

export {};

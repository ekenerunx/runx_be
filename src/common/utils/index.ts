interface ToNumberOptions {
  default?: number;
  min?: number;
  max?: number;
}

export function toLowerCase(value: string): string {
  return value.toLowerCase();
}

export function trim(value: string): string {
  return value.trim();
}

export function toDate(value: string): Date {
  return new Date(value);
}

export function toBoolean(value: string): boolean {
  value = value.toLowerCase();

  return value === 'true' || value === '1' ? true : false;
}

export function toNumber(value: string, opts: ToNumberOptions = {}): number {
  let newValue: number = Number.parseInt(value || String(opts.default), 10);

  if (Number.isNaN(newValue)) {
    newValue = opts.default;
  }

  if (opts.min) {
    if (newValue < opts.min) {
      newValue = opts.min;
    }

    if (newValue > opts.max) {
      newValue = opts.max;
    }
  }

  return newValue;
}

export function verifyNamesInString(
  nameString: string,
  firstName: string,
  lastName: string,
): boolean {
  if (nameString) {
    const regex = new RegExp(
      `\\b${firstName}\\b.*\\b${lastName}\\b|\\b${lastName}\\b.*\\b${firstName}\\b`,
      'i',
    );
    return regex.test(nameString?.toLowerCase());
  }
  return false;
}

export const normalizeEnum = (enumString: string) => {
  if (!enumString) return;
  return enumString.split('_').join('');
};

export const generateAlphaNumeric = (len = 6) => {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < len; i++) {
    code += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
  }
  return code;
};

// Tiny JSON Schema validator (draft 2020-12 subset, no dependencies).
// Supported keywords: type, enum, const, required, properties,
// additionalProperties (boolean), items, minItems, maxItems, uniqueItems,
// minLength, pattern, minimum, maximum, format (uri), $ref (local), oneOf.

function typeOf(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (Number.isInteger(value)) return 'integer';
  return typeof value;
}

function matchesType(value, type) {
  const actual = typeOf(value);
  if (type === 'number') return actual === 'number' || actual === 'integer';
  return actual === type;
}

function resolveRef(root, ref) {
  if (!ref.startsWith('#/')) throw new Error(`Unsupported $ref: ${ref}`);
  return ref.slice(2).split('/').reduce((node, key) => node?.[key], root);
}

export function validateSchema(schema, value, root = schema, path = '$') {
  const errors = [];
  if (schema.$ref) return validateSchema(resolveRef(root, schema.$ref), value, root, path);

  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.some((t) => matchesType(value, t))) {
      return [`${path}: expected ${types.join(' or ')}, got ${typeOf(value)}`];
    }
  }
  if ('const' in schema && value !== schema.const) errors.push(`${path}: must be ${JSON.stringify(schema.const)}`);
  if (schema.enum && !schema.enum.includes(value)) errors.push(`${path}: must be one of ${schema.enum.join(', ')}`);

  if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.trim().length < schema.minLength) errors.push(`${path}: must not be empty`);
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) errors.push(`${path}: "${value}" does not match ${schema.pattern}`);
    if (schema.format === 'uri') {
      try { new URL(value); } catch { errors.push(`${path}: "${value}" is not a valid URL`); }
    }
  }
  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) errors.push(`${path}: must be >= ${schema.minimum}`);
    if (schema.maximum !== undefined && value > schema.maximum) errors.push(`${path}: must be <= ${schema.maximum}`);
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) errors.push(`${path}: needs at least ${schema.minItems} items`);
    if (schema.maxItems !== undefined && value.length > schema.maxItems) errors.push(`${path}: allows at most ${schema.maxItems} items`);
    if (schema.uniqueItems && new Set(value.map((v) => JSON.stringify(v))).size !== value.length) errors.push(`${path}: items must be unique`);
    if (schema.items) value.forEach((v, i) => errors.push(...validateSchema(schema.items, v, root, `${path}[${i}]`)));
  }
  if (typeOf(value) === 'object') {
    for (const key of schema.required ?? []) {
      if (!(key in value)) errors.push(`${path}: missing required property "${key}"`);
    }
    for (const [key, sub] of Object.entries(schema.properties ?? {})) {
      if (key in value) errors.push(...validateSchema(sub, value[key], root, `${path}.${key}`));
    }
    if (schema.additionalProperties === false) {
      for (const key of Object.keys(value)) {
        if (!(key in (schema.properties ?? {}))) errors.push(`${path}: unknown property "${key}"`);
      }
    }
  }
  if (schema.oneOf) {
    const results = schema.oneOf.map((s) => validateSchema(s, value, root, path));
    const passing = results.filter((r) => r.length === 0).length;
    if (passing !== 1) {
      const best = results.reduce((a, b) => (b.length < a.length ? b : a));
      errors.push(passing === 0 ? `${path}: does not match any allowed shape (${best.join('; ')})` : `${path}: matches more than one allowed shape`);
    }
  }
  return errors;
}

import { describe, it, expect } from 'vitest';
import { escapePath, normalizePath } from '../../src/helpers/escape-path';

describe('helpers // escape-path', () => {
  it('escapePath replaces backslashes with forward slashes', () => {
    const string = 'test\\path';
    const escapedString = escapePath(string);
    expect(escapedString).to.equal('test/path');
  });

  it('normalizePath normalizes paths', () => {
    const result = normalizePath('/foo/bar/../baz');
    expect(result).to.equal('/foo/baz');
  });
});

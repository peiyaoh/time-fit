import ObjectHelper from '../ObjectHelper.js';

describe('ObjectHelper', () => {
  describe('exclude', () => {
    it('should exclude specified keys from the object', () => {
      const obj = { a: 1, b: 2, c: 3, d: 4 };
      const result = ObjectHelper.exclude({ ...obj }, ['b', 'd']);
      
      expect(result).toEqual({ a: 1, c: 3 });
      expect(result).not.toHaveProperty('b');
      expect(result).not.toHaveProperty('d');
    });

    it('should not modify the original object', () => {
      const original = { a: 1, b: 2 };
      
      const result = ObjectHelper.exclude(original, ['b']);
      
      expect(original).toEqual({ a: 1, b: 2 });
      expect(result).toEqual({ a: 1 });
    });

    it('should handle non-existent keys gracefully', () => {
      const obj = { a: 1, b: 2 };
      const result = ObjectHelper.exclude({ ...obj }, ['c', 'd']);
      
      expect(result).toEqual({ a: 1, b: 2 });
    });
  });

  describe('isPropertySet', () => {
    it('should return true if property exists and is not undefined', () => {
      const obj = { name: 'John', age: 30 };
      
      expect(ObjectHelper.isPropertySet(obj, 'name')).toBe(true);
      expect(ObjectHelper.isPropertySet(obj, 'age')).toBe(true);
    });

    it('should return false if property does not exist', () => {
      const obj = { name: 'John' };
      
      expect(ObjectHelper.isPropertySet(obj, 'age')).toBe(false);
      expect(ObjectHelper.isPropertySet(obj, 'nonExistent')).toBe(false);
    });

    it('should return false if property is undefined', () => {
      const obj = { name: undefined };
      
      expect(ObjectHelper.isPropertySet(obj, 'name')).toBe(false);
    });

    it('should return false if object is null or undefined', () => {
      expect(ObjectHelper.isPropertySet(null, 'name')).toBe(false);
      expect(ObjectHelper.isPropertySet(undefined, 'name')).toBe(false);
    });
  });

  describe('isObjectPropertyValueMatched', () => {
    it('should return true if all properties match', () => {
      const obj = { name: 'John', age: 30, city: 'New York' };
      const criteria = { name: 'John', age: 30 };
      
      expect(ObjectHelper.isObjectPropertyValueMatched(obj, criteria)).toBe(true);
    });

    it('should return false if any property does not match', () => {
      const obj = { name: 'John', age: 30, city: 'New York' };
      const criteria = { name: 'John', age: 31 }; // age doesn't match
      
      expect(ObjectHelper.isObjectPropertyValueMatched(obj, criteria)).toBe(false);
    });

    it('should return true for empty criteria object', () => {
      const obj = { name: 'John' };
      
      expect(ObjectHelper.isObjectPropertyValueMatched(obj, {})).toBe(true);
    });

    it('should handle different value types', () => {
      const obj = { 
        string: 'test', 
        number: 123, 
        boolean: true, 
        nullValue: null,
        undefinedValue: undefined,
        object: { key: 'value' }
      };
      
      const criteria = {
        string: 'test',
        number: 123,
        boolean: true,
        nullValue: null,
        undefinedValue: undefined,
        object: { key: 'value' }
      };
      
      expect(ObjectHelper.isObjectPropertyValueMatched(obj, criteria)).toBe(true);
    });
  });

  describe('extractObjectPropertyValueMatched', () => {
    it('should extract specified properties from the object', () => {
      const obj = { name: 'John', age: 30, city: 'New York' };
      const criteria = { name: 'John', age: 30 };
      
      const result = ObjectHelper.extractObjectPropertyValueMatched(obj, criteria);
      
      expect(result).toEqual({ name: 'John', age: 30 });
      expect(result).not.toHaveProperty('city');
    });

    it('should handle non-existent properties by including them as undefined', () => {
      const obj = { name: 'John' };
      const criteria = { name: 'John', age: 30 }; // age doesn't exist
      
      const result = ObjectHelper.extractObjectPropertyValueMatched(obj, criteria);
      
      expect(result).toEqual({ name: 'John', age: undefined });
    });

    it('should return an empty object for empty criteria', () => {
      const obj = { name: 'John' };
      const result = ObjectHelper.extractObjectPropertyValueMatched(obj, {});
      
      expect(result).toEqual({});
    });
  });
});

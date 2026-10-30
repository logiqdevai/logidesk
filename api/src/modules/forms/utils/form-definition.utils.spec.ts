import { BadRequestException } from '@nestjs/common';
import { countDefinition, isFieldVisible, parseDefinition, validateAnswers } from './form-definition.utils';

const definition = parseDefinition({
  sections: [
    {
      id: 's1',
      title: 'Details',
      fields: [
        { id: 'rental', type: 'YES_NO', label: 'Rental income?', required: true },
        { id: 'address', type: 'SHORT_TEXT', label: 'Address', required: true, visibility: { field_id: 'rental', operator: 'equals', value: true } },
        { id: 'count', type: 'NUMBER', label: 'Employees', validation: { min: 0, max: 10 } },
        { id: 'email', type: 'EMAIL', label: 'Email' },
        { id: 'kind', type: 'DROPDOWN', label: 'Kind', options: ['A', 'B'] },
        { id: 'id_doc', type: 'FILE_UPLOAD', label: 'ID', required: true },
        { id: 'h', type: 'HEADING', label: 'Info' },
      ],
    },
  ],
});

describe('parseDefinition', () => {
  it('fills file-upload defaults and counts fields', () => {
    const file = definition.sections[0].fields.find((f) => f.id === 'id_doc');
    expect(file.file.accepted_formats).toEqual(['PDF', 'IMAGE']);
    expect(file.file.requires_approval).toBe(true);
    expect(countDefinition(definition)).toEqual({ field_count: 6, document_count: 1 });
  });

  it('rejects duplicate ids, choice fields without options and dangling visibility rules', () => {
    expect(() => parseDefinition({ sections: [{ id: 's', title: '', fields: [{ id: 'a', type: 'SHORT_TEXT', label: 'A' }, { id: 'a', type: 'SHORT_TEXT', label: 'B' }] }] })).toThrow(BadRequestException);
    expect(() => parseDefinition({ sections: [{ id: 's', title: '', fields: [{ id: 'a', type: 'DROPDOWN', label: 'A', options: [] }] }] })).toThrow(BadRequestException);
    expect(() =>
      parseDefinition({ sections: [{ id: 's', title: '', fields: [{ id: 'a', type: 'SHORT_TEXT', label: 'A', visibility: { field_id: 'missing', operator: 'answered' } }] }] }),
    ).toThrow(BadRequestException);
  });
});

describe('conditional visibility & answer validation', () => {
  const address = definition.sections[0].fields.find((f) => f.id === 'address');

  it('shows a field only when its condition matches', () => {
    expect(isFieldVisible(address, { rental: true }, definition)).toBe(true);
    expect(isFieldVisible(address, { rental: false }, definition)).toBe(false);
  });

  it('requires visible required questions on submit only', () => {
    expect(validateAnswers(definition, { rental: true }, { requireComplete: true }).errors).toHaveProperty('address');
    expect(validateAnswers(definition, { rental: false }, { requireComplete: true }).errors).not.toHaveProperty('address');
    expect(Object.keys(validateAnswers(definition, { rental: true }, { requireComplete: false }).errors)).toHaveLength(0);
  });

  it('validates and normalizes typed values; hidden answers are dropped', () => {
    const r = validateAnswers(definition, { rental: 'yes', count: '3', email: 'bad', kind: 'C', address: 'x' }, { requireComplete: false });
    expect(r.values.rental).toBe(true);
    expect(r.values.count).toBe(3);
    expect(r.errors.email).toBeDefined();
    expect(r.errors.kind).toBeDefined();
    expect(validateAnswers(definition, { count: 11 }, { requireComplete: false }).errors.count).toBeDefined();
    expect(validateAnswers(definition, { rental: false, address: 'old' }, { requireComplete: false }).values.address).toBeNull();
  });
});

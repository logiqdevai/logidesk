import { resolveLanguage } from './language.utils';
import { translateErrorBody, translateToGreek } from './translate.utils';

describe('resolveLanguage', () => {
  it('returns el only for Greek Accept-Language values', () => {
    expect(resolveLanguage('el')).toBe('el');
    expect(resolveLanguage('el-GR,el;q=0.9,en;q=0.8')).toBe('el');
    expect(resolveLanguage('en-US,en;q=0.9')).toBe('en');
    expect(resolveLanguage('fr, el;q=0.5')).toBe('en');
    expect(resolveLanguage(undefined)).toBe('en');
  });
});

describe('translateToGreek', () => {
  it('translates exact and interpolated messages and leaves unknown text alone', () => {
    expect(translateToGreek('Client not found')).toBe('Ο πελάτης δεν βρέθηκε');
    expect(translateToGreek('"id.pdf" is larger than 10 MB')).toBe('Το αρχείο "id.pdf" είναι μεγαλύτερο από 10 MB');
    expect(translateToGreek('email must be an email')).toBe('Το πεδίο email πρέπει να είναι έγκυρη διεύθυνση email');
    expect(translateToGreek('Something unexpected')).toBe('Something unexpected');
  });
});

describe('translateErrorBody', () => {
  it('translates message and errors while keeping other fields', () => {
    const body = { message: 'Enter your name', errors: { name: 'Enter your name' }, code: 'x' };
    expect(translateErrorBody(body)).toEqual({ message: 'Εισαγάγετε το όνομά σας', errors: { name: 'Εισαγάγετε το όνομά σας' }, code: 'x' });
  });

  it('handles message arrays and error arrays', () => {
    expect(translateErrorBody({ message: ['Use a valid date', 'unknown'], errors: [{ field: 'a', message: 'Use a valid date' }] })).toEqual({
      message: ['Χρησιμοποιήστε μια έγκυρη ημερομηνία', 'unknown'],
      errors: [{ field: 'a', message: 'Χρησιμοποιήστε μια έγκυρη ημερομηνία' }],
    });
  });
});

/**
 * Validador de NIF/NIE/CIF español
 */

const NIE_LETTERS = ['X', 'Y', 'Z'];
const NIF_LETTERS = 'TRWAGMYFPDXBNJZSQVHLCKE';
const CIF_LETTERS = 'JABCDEFGHI';

/**
 * Valida un NIF español
 */
export function validateNIF(nif: string): boolean {
  if (!nif || typeof nif !== 'string') return false;
  
  const cleanNIF = nif.toUpperCase().replace(/[-\s]/g, '');
  
  // Debe tener 9 caracteres: 8 dígitos + 1 letra
  if (!/^\d{8}[A-Z]$/.test(cleanNIF)) return false;
  
  const number = cleanNIF.substring(0, 8);
  const letter = cleanNIF.substring(8, 9);
  
  const expectedLetter = NIF_LETTERS[parseInt(number) % 23];
  
  return letter === expectedLetter;
}

/**
 * Valida un NIE español
 */
export function validateNIE(nie: string): boolean {
  if (!nie || typeof nie !== 'string') return false;
  
  const cleanNIE = nie.toUpperCase().replace(/[-\s]/g, '');
  
  // Debe tener 9 caracteres: letra inicial + 7 dígitos + letra final
  if (!/^[XYZ]\d{7}[A-Z]$/.test(cleanNIE)) return false;
  
  // Reemplazar la letra inicial por su número equivalente
  let number = cleanNIE.substring(1, 8);
  const firstLetter = cleanNIE.substring(0, 1);
  const lastLetter = cleanNIE.substring(8, 9);
  
  const nieNumber = NIE_LETTERS.indexOf(firstLetter);
  number = nieNumber + number;
  
  const expectedLetter = NIF_LETTERS[parseInt(number) % 23];
  
  return lastLetter === expectedLetter;
}

/**
 * Valida un CIF español
 */
export function validateCIF(cif: string): boolean {
  if (!cif || typeof cif !== 'string') return false;
  
  const cleanCIF = cif.toUpperCase().replace(/[-\s]/g, '');
  
  // Debe tener 9 caracteres: letra + 7 dígitos + dígito/letra control
  if (!/^[A-Z]\d{7}[0-9A-Z]$/.test(cleanCIF)) return false;
  
  const letter = cleanCIF.substring(0, 1);
  const number = cleanCIF.substring(1, 8);
  const control = cleanCIF.substring(8, 9);
  
  // Calcular dígito de control
  let sum = 0;
  
  for (let i = 0; i < number.length; i++) {
    const digit = parseInt(number[i]);
    
    if (i % 2 === 0) {
      // Posiciones pares (0, 2, 4, 6): multiplicar por 2
      const doubled = digit * 2;
      sum += Math.floor(doubled / 10) + (doubled % 10);
    } else {
      // Posiciones impares: sumar directamente
      sum += digit;
    }
  }
  
  const units = sum % 10;
  const controlDigit = units === 0 ? 0 : 10 - units;
  const controlLetter = CIF_LETTERS[controlDigit];
  
  // Algunos tipos de CIF usan letra, otros número
  const validLetterTypes = ['K', 'P', 'Q', 'S', 'N', 'W'];
  
  if (validLetterTypes.includes(letter)) {
    return control === controlLetter;
  } else {
    return control === controlDigit.toString() || control === controlLetter;
  }
}

/**
 * Valida cualquier tipo de identificación fiscal española (NIF/NIE/CIF)
 */
export function validateSpanishTaxId(id: string): boolean {
  if (!id || typeof id !== 'string') return false;
  
  const cleanId = id.toUpperCase().replace(/[-\s]/g, '');
  
  // Detectar tipo según el formato
  if (/^\d{8}[A-Z]$/.test(cleanId)) {
    return validateNIF(cleanId);
  } else if (/^[XYZ]\d{7}[A-Z]$/.test(cleanId)) {
    return validateNIE(cleanId);
  } else if (/^[A-Z]\d{7}[0-9A-Z]$/.test(cleanId)) {
    return validateCIF(cleanId);
  }
  
  return false;
}

/**
 * Formatea un NIF/NIE/CIF añadiendo guiones
 */
export function formatSpanishTaxId(id: string): string {
  if (!id) return '';
  
  const cleanId = id.toUpperCase().replace(/[-\s]/g, '');
  
  if (cleanId.length === 9) {
    return `${cleanId.substring(0, 8)}-${cleanId.substring(8)}`;
  }
  
  return cleanId;
}
